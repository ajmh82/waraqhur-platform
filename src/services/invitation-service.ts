import { randomUUID } from "node:crypto";
import { InviteStatus, UserStatus, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth-password";
import { getEmailService } from "@/services/email/email-service";
import { createInAppNotification } from "@/services/notification-service";
import type { AcceptInvitationInput } from "@/services/invitation-schemas";

function buildInvitationAcceptUrl(token: string) {
  const url = new URL("/accept-invitation", env.appUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function createInviteExpiryDate(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function markExpiredInvitations() {
  await prisma.invite.updateMany({
    where: {
      status: {
        in: [InviteStatus.PENDING, InviteStatus.SENT],
      },
      expiresAt: {
        lte: new Date(),
      },
    },
    data: {
      status: InviteStatus.EXPIRED,
    },
  });
}

export async function createInvitation(input: {
  issuerUserId: string;
  email: string;
  roleKey: string;
  expiresInDays: number;
}) {
  await markExpiredInvitations();

  const normalizedEmail = input.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  const role = await prisma.role.findUnique({
    where: {
      key: input.roleKey,
    },
    select: {
      id: true,
      key: true,
      name: true,
    },
  });

  if (!role) {
    throw new Error("Role not found");
  }

  const existingInvitation = await prisma.invite.findFirst({
    where: {
      email: normalizedEmail,
      status: {
        in: [InviteStatus.PENDING, InviteStatus.SENT],
      },
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (existingInvitation) {
    throw new Error("An active invitation already exists for this email");
  }

  const token = randomUUID();
  const expiresAt = createInviteExpiryDate(input.expiresInDays);
  const sentAt = new Date();

  const invitation = await prisma.invite.create({
    data: {
      email: normalizedEmail,
      token,
      status: InviteStatus.SENT,
      roleId: role.id,
      issuerUserId: input.issuerUserId,
      maxUses: 1,
      sentAt,
      expiresAt,
    },
    include: {
      role: true,
      issuerUser: {
        include: {
          profile: true,
        },
      },
    },
  });

  const acceptUrl = buildInvitationAcceptUrl(invitation.token);

  await getEmailService().send({
    to: {
      email: invitation.email,
      name: invitation.email,
    },
    subject: "دعوة للانضمام إلى Waraqhur",
    text: [
      `تمت دعوتك للانضمام إلى Waraqhur بدور ${invitation.role?.name ?? invitation.role?.key ?? "member"}.`,
      "",
      "استخدم الرابط التالي لقبول الدعوة:",
      acceptUrl,
      "",
      `تنتهي صلاحية الدعوة في ${invitation.expiresAt.toISOString()}.`,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.8; color: #111827;">
        <h2>دعوة للانضمام إلى Waraqhur</h2>
        <p>تمت دعوتك للانضمام إلى المنصة.</p>
        <p>الدور المقترح: <strong>${invitation.role?.name ?? invitation.role?.key ?? "member"}</strong></p>
        <p><a href="${acceptUrl}" style="color: #0f766e;">اضغط هنا لقبول الدعوة</a></p>
        <p>تنتهي صلاحية الدعوة في ${invitation.expiresAt.toISOString()}.</p>
      </div>
    `.trim(),
  });

  await createInAppNotification({
    userId: invitation.issuerUserId,
    title: "تم إرسال الدعوة",
    body: `تم إرسال دعوة إلى ${invitation.email}.`,
    payload: {
      event: "invitation.sent",
      actionUrl: "/dashboard/invitations",
      entityType: "invite",
      entityId: invitation.id,
      metadata: {
        email: invitation.email,
        roleKey: invitation.role?.key ?? null,
      },
    },
  });

  return {
    id: invitation.id,
    email: invitation.email,
    token: invitation.token,
    status: invitation.status,
    sentAt: invitation.sentAt?.toISOString() ?? null,
    expiresAt: invitation.expiresAt.toISOString(),
    role: invitation.role
      ? {
          key: invitation.role.key,
          name: invitation.role.name,
        }
      : null,
  };
}

export async function listInvitations() {
  await markExpiredInvitations();

  const invitations = await prisma.invite.findMany({
    include: {
      role: true,
      issuerUser: true,
      usages: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return invitations.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    token: invitation.token,
    status: invitation.status,
    sentAt: invitation.sentAt?.toISOString() ?? null,
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    revokedAt: invitation.revokedAt?.toISOString() ?? null,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
    role: invitation.role
      ? {
          key: invitation.role.key,
          name: invitation.role.name,
        }
      : null,
    issuerUser: {
      id: invitation.issuerUser.id,
      email: invitation.issuerUser.email,
      username: invitation.issuerUser.username,
    },
    usages: invitation.usages.map((usage) => ({
      id: usage.id,
      usedAt: usage.usedAt.toISOString(),
      user: {
        id: usage.user.id,
        email: usage.user.email,
        username: usage.user.username,
      },
    })),
  }));
}

export async function revokeInvitation(input: {
  invitationId: string;
  revokedByUserId: string;
}) {
  await markExpiredInvitations();

  const invitation = await prisma.invite.findUnique({
    where: {
      id: input.invitationId,
    },
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (
    invitation.status === InviteStatus.ACCEPTED ||
    invitation.status === InviteStatus.EXPIRED ||
    invitation.status === InviteStatus.REVOKED
  ) {
    throw new Error("Invitation can no longer be revoked");
  }

  const updatedInvitation = await prisma.invite.update({
    where: {
      id: invitation.id,
    },
    data: {
      status: InviteStatus.REVOKED,
      revokedAt: new Date(),
    },
  });

  await createInAppNotification({
    userId: updatedInvitation.issuerUserId,
    title: "تم إلغاء الدعوة",
    body: `تم إلغاء الدعوة المرسلة إلى ${updatedInvitation.email}.`,
    payload: {
      event: "invitation.revoked",
      actionUrl: "/dashboard/invitations",
      entityType: "invite",
      entityId: updatedInvitation.id,
      metadata: {
        email: updatedInvitation.email,
      },
    },
  });

  return {
    id: updatedInvitation.id,
    status: updatedInvitation.status,
    revokedAt: updatedInvitation.revokedAt?.toISOString() ?? null,
  };
}

export async function acceptInvitation(input: AcceptInvitationInput) {
  await markExpiredInvitations();

  const invitation = await prisma.invite.findUnique({
    where: {
      token: input.token,
    },
    include: {
      role: true,
      usages: true,
    },
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status === InviteStatus.REVOKED) {
    throw new Error("Invitation has been revoked");
  }

  if (invitation.status === InviteStatus.EXPIRED || invitation.expiresAt <= new Date()) {
    await prisma.invite.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: InviteStatus.EXPIRED,
      },
    });

    throw new Error("Invitation has expired");
  }

  if (invitation.status === InviteStatus.ACCEPTED) {
    throw new Error("Invitation has already been accepted");
  }

  if (invitation.usages.length >= invitation.maxUses) {
    throw new Error("Invitation usage limit exceeded");
  }

  const existingUserByEmail = await prisma.user.findUnique({
    where: {
      email: invitation.email,
    },
  });

  if (existingUserByEmail) {
    throw new Error("A user with this email already exists");
  }

  const existingUserByUsername = await prisma.user.findUnique({
    where: {
      username: input.username,
    },
  });

  if (existingUserByUsername) {
    throw new Error("Username is already in use");
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: invitation.email,
        username: input.username,
        passwordHash,
        status: UserStatus.ACTIVE,
        invitedByInviteId: invitation.id,
        emailVerifiedAt: now,
        profile: {
          create: {
            displayName: input.displayName,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    if (invitation.roleId) {
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: invitation.roleId,
          assignedByUserId: invitation.issuerUserId,
        },
      });
    }

    await tx.inviteUsage.create({
      data: {
        inviteId: invitation.id,
        userId: user.id,
      },
    });

    await tx.invite.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: InviteStatus.ACCEPTED,
        acceptedAt: now,
      },
    });

    await tx.emailVerification.create({
      data: {
        userId: user.id,
        email: user.email,
        token: randomUUID(),
        status: VerificationStatus.VERIFIED,
        expiresAt: now,
        verifiedAt: now,
      },
    });

    return user;
  });

  await createInAppNotification({
    userId: invitation.issuerUserId,
    title: "تم قبول الدعوة",
    body: `تم قبول الدعوة المرسلة إلى ${invitation.email}.`,
    payload: {
      event: "invitation.accepted",
      actionUrl: "/dashboard/invitations",
      entityType: "invite",
      entityId: invitation.id,
      metadata: {
        email: invitation.email,
        acceptedUsername: result.username,
      },
    },
  });

  return {
    success: true,
    user: {
      id: result.id,
      email: result.email,
      username: result.username,
      profile: result.profile
        ? {
            displayName: result.profile.displayName,
          }
        : null,
    },
  };
}
