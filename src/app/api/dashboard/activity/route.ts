import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";

type RawAuditRow = {
  id: string;
  at: Date | string;
  action: string;
  metadata: unknown;
};

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function parseMeta(meta: unknown) {
  const m =
    typeof meta === "string"
      ? (() => {
          try {
            return JSON.parse(meta) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : asObj(meta);

  if (!m) return { country: null as string | null, client: null as string | null };

  const country =
    (typeof m.country === "string" && m.country) ||
    (typeof m.geoCountry === "string" && m.geoCountry) ||
    (typeof m.ipCountry === "string" && m.ipCountry) ||
    null;

  const client =
    (typeof m.client === "string" && m.client) ||
    (typeof m.platform === "string" && m.platform) ||
    (typeof m.userAgent === "string" && m.userAgent) ||
    null;

  return { country, client };
}

async function requireCurrent() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionValue) return null;
  try {
    return await getCurrentUserFromSession(sessionValue);
  } catch {
    return null;
  }
}

async function loadAuditRows(userId: string, since: Date): Promise<RawAuditRow[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<RawAuditRow[]>(
      'SELECT "id", "createdAt" as "at", "action", "metadata" FROM "AuditLog" WHERE "actorUserId" = $1 AND "createdAt" >= $2 ORDER BY "createdAt" DESC LIMIT 100',
      userId,
      since
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    try {
      const rows = await prisma.$queryRawUnsafe<RawAuditRow[]>(
        "SELECT id, createdAt as at, action, metadata FROM AuditLog WHERE actorUserId = ? AND createdAt >= ? ORDER BY createdAt DESC LIMIT 100",
        userId,
        since.toISOString()
      );
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }
}

export async function GET() {
  const current = await requireCurrent();
  if (!current) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await loadAuditRows(current.user.id, since);

  const loginLike = rows.filter((r) =>
    ["LOGIN", "LOGIN_SUCCESS", "SESSION_CREATED", "AUTH_LOGIN", "USER_LOGIN", "SESSION_TOUCH"].includes(String(r.action))
  );

  const items = loginLike.map((r) => {
    const meta = parseMeta(r.metadata);
    return {
      id: String(r.id),
      at: typeof r.at === "string" ? r.at : r.at.toISOString(),
      country: meta.country,
      client: meta.client,
      source: "audit" as const,
    };
  });

  const currentAt = current.session.lastUsedAt ?? current.session.expiresAt;
  items.unshift({
    id: `current-${current.session.id}`,
    at: (currentAt instanceof Date ? currentAt : new Date(currentAt)).toISOString(),
    country: null,
    client: null,
    source: "current" as const,
  });

  const dedup = new Map<string, (typeof items)[number]>();
  for (const item of items) {
    const k = `${item.at}-${item.source}`;
    if (!dedup.has(k)) dedup.set(k, item);
  }

  return NextResponse.json({
    success: true,
    data: {
      items: Array.from(dedup.values()).slice(0, 30),
    },
  });
}
