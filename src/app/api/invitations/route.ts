import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromSession } from "@/services/auth-service";

const DEFAULT_INVITE_QUOTA = 5;

interface InvitationDelegate {
  findMany?: (args: Record<string, unknown>) => Promise<unknown>;
  count?: (args: Record<string, unknown>) => Promise<number>;
  create?: (args: Record<string, unknown>) => Promise<unknown>;
}

type InvitationItem = {
  id: string;
  inviteeEmail: string;
  status: string;
  token: string | null;
  createdAt: string;
  expiresAt: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asIso(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function normalizeInvitation(raw: unknown): InvitationItem | null {
  const row = asRecord(raw);
  if (!row) return null;

  const id = asString(row.id);
  const inviteeEmail = asString(row.inviteeEmail || row.email);
  const status = asString(row.status, "pending");
  const token = asNullableString(row.token ?? row.invitationId ?? row.code);

  if (!id || !inviteeEmail) return null;

  return {
    id,
    inviteeEmail,
    status,
    token,
    createdAt: asIso(row.createdAt),
    expiresAt: row.expiresAt ? asIso(row.expiresAt) : null,
  };
}

function pickInvitationDelegate(): InvitationDelegate | null {
  const client = prisma as unknown as Record<string, unknown>;
  const keys = ["invitation", "invitations", "invite"];

  for (const key of keys) {
    const candidate = client[key];
    if (candidate && typeof candidate === "object") {
      return candidate as InvitationDelegate;
    }
  }

  return null;
}

const invitationDelegate = pickInvitationDelegate();

function getInvitationDelegate() {
  return invitationDelegate;
}

async function requireSessionUser() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHENTICATED", message: "Authentication required" },
        },
        { status: 401 }
      ),
    };
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    return { ok: true as const, current };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_SESSION", message: "Invalid or expired session" },
        },
        { status: 401 }
      ),
    };
  }
}

function readUserInviteQuota(user: unknown): number {
  const u = asRecord(user);
  const candidate = Number(u?.invitationQuota ?? u?.inviteQuota ?? DEFAULT_INVITE_QUOTA);
  if (!Number.isFinite(candidate) || candidate < 0) return DEFAULT_INVITE_QUOTA;
  return Math.floor(candidate);
}

export async function GET() {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  const delegate = getInvitationDelegate();
  const total = readUserInviteQuota(auth.current.user);

  if (!delegate?.findMany || !delegate?.count) {
    return NextResponse.json({
      success: true,
      data: {
        quota: { total, used: 0, remaining: total },
        invitations: [],
      },
    });
  }

  try {
    const countValue = await delegate.count({
      where: { inviterUserId: auth.current.user.id },
    });
    const used = Number.isFinite(countValue) ? countValue : 0;
    const remaining = Math.max(0, total - used);

    const rawList = await delegate.findMany({
      where: { inviterUserId: auth.current.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const list = Array.isArray(rawList)
      ? rawList.map(normalizeInvitation).filter(Boolean)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        quota: { total, used, remaining },
        invitations: list,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVITATIONS_FETCH_FAILED",
          message: error instanceof Error ? error.message : "Failed to load invitations",
        },
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  const delegate = getInvitationDelegate();
  if (!delegate?.create || !delegate?.count || !delegate?.findMany) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVITATION_MODEL_MISSING",
          message: "Invitation model is not available in Prisma client",
        },
      },
      { status: 501 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = asString(body.email).trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_EMAIL", message: "Please provide a valid email" },
        },
        { status: 400 }
      );
    }

    const total = readUserInviteQuota(auth.current.user);
    const used = await delegate.count({ where: { inviterUserId: auth.current.user.id } });
    const remaining = Math.max(0, total - used);

    if (remaining <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVITE_LIMIT_REACHED", message: "No invitations remaining" },
        },
        { status: 400 }
      );
    }

    const duplicateRaw = await delegate.findMany({
      where: {
        inviterUserId: auth.current.user.id,
        inviteeEmail: email,
        status: { in: ["pending", "sent"] },
      },
      take: 1,
    });

    if (Array.isArray(duplicateRaw) && duplicateRaw.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DUPLICATE_INVITE", message: "Invitation already sent to this email" },
        },
        { status: 409 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    let created = await delegate.create({
      data: {
        inviterUserId: auth.current.user.id,
        inviteeEmail: email,
        status: "pending",
        token,
        expiresAt,
      },
    }).catch(() => null);

    if (!created) {
      created = await delegate.create({
        data: {
          inviterUserId: auth.current.user.id,
          inviteeEmail: email,
          status: "pending",
        },
      }).catch(() => null);
    }

    if (!created) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVITATION_CREATE_FAILED", message: "Failed to create invitation" },
        },
        { status: 400 }
      );
    }

    const invitation = normalizeInvitation(created);
    const invitationId = invitation?.token ?? invitation?.id ?? token;
    const acceptPath = `/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`;
    const origin = request.headers.get("origin");
    const acceptUrl = origin ? `${origin}${acceptPath}` : acceptPath;

    return NextResponse.json({
      success: true,
      data: {
        invitation,
        acceptUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVITATION_CREATE_FAILED",
          message: error instanceof Error ? error.message : "Failed to create invitation",
        },
      },
      { status: 400 }
    );
  }
}
