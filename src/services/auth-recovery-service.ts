import { randomUUID } from "node:crypto";
import {
  PasswordResetStatus,
  VerificationStatus,
} from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-password";
import { getEmailService } from "@/services/email/email-service";
import { buildEmailVerificationMessage } from "@/services/email/templates/email-verification-template";
import { buildPasswordResetMessage } from "@/services/email/templates/password-reset-template";
import type {
  EmailVerificationRequestInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
} from "@/services/auth-recovery-schemas";

const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_HOURS = 2;

function createExpiryDate(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function buildEmailVerificationUrl(token: string) {
  const url = new URL(env.emailVerificationUrlBase);
  url.searchParams.set("token", token);
  return url.toString();
}

function buildPasswordResetUrl(token: string) {
  const url = new URL(env.passwordResetUrlBase);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendEmailVerification(input: EmailVerificationRequestInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    include: {
      profile: true,
    },
  });

  if (!user) {
    return {
      success: true,
      dispatched: false,
    };
  }

  if (user.emailVerifiedAt) {
    return {
      success: true,
      dispatched: false,
    };
  }

  await prisma.emailVerification.updateMany({
    where: {
      userId: user.id,
      status: VerificationStatus.PENDING,
    },
    data: {
      status: VerificationStatus.REVOKED,
    },
  });

  const token = randomUUID();
  const expiresAt = createExpiryDate(EMAIL_VERIFICATION_TTL_HOURS);

  const verification = await prisma.emailVerification.create({
    data: {
      userId: user.id,
      email: user.email,
      token,
      status: VerificationStatus.PENDING,
      expiresAt,
    },
  });

  const verificationUrl = buildEmailVerificationUrl(token);

  await getEmailService().send(
    buildEmailVerificationMessage({
      toEmail: user.email,
      toName: user.profile?.displayName ?? user.username,
      verificationUrl,
    })
  );

  return {
    success: true,
    dispatched: true,
    verification: {
      id: verification.id,
      email: verification.email,
      token: verification.token,
      expiresAt: verification.expiresAt.toISOString(),
    },
  };
}

export async function confirmEmailVerification(token: string) {
  const verification = await prisma.emailVerification.findUnique({
    where: {
      token,
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!verification) {
    throw new Error("Invalid verification token");
  }

  if (verification.status !== VerificationStatus.PENDING) {
    throw new Error("Verification token is no longer valid");
  }

  if (verification.expiresAt <= new Date()) {
    await prisma.emailVerification.update({
      where: {
        id: verification.id,
      },
      data: {
        status: VerificationStatus.EXPIRED,
      },
    });

    throw new Error("Verification token has expired");
  }

  await prisma.$transaction([
    prisma.emailVerification.update({
      where: {
        id: verification.id,
      },
      data: {
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: {
        id: verification.userId,
      },
      data: {
        emailVerifiedAt: new Date(),
      },
    }),
  ]);

  return {
    success: true,
    user: {
      id: verification.user.id,
      email: verification.user.email,
      username: verification.user.username,
      emailVerifiedAt: new Date().toISOString(),
    },
  };
}

export async function requestPasswordReset(input: PasswordResetRequestInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    include: {
      profile: true,
    },
  });

  if (!user) {
    return {
      success: true,
      dispatched: false,
    };
  }

  await prisma.passwordReset.updateMany({
    where: {
      userId: user.id,
      status: PasswordResetStatus.PENDING,
    },
    data: {
      status: PasswordResetStatus.REVOKED,
    },
  });

  const token = randomUUID();
  const expiresAt = createExpiryDate(PASSWORD_RESET_TTL_HOURS);

  const passwordReset = await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token,
      status: PasswordResetStatus.PENDING,
      expiresAt,
    },
  });

  const resetUrl = buildPasswordResetUrl(token);

  await getEmailService().send(
    buildPasswordResetMessage({
      toEmail: user.email,
      toName: user.profile?.displayName ?? user.username,
      resetUrl,
    })
  );

  return {
    success: true,
    dispatched: true,
    passwordReset: {
      id: passwordReset.id,
      token: passwordReset.token,
      expiresAt: passwordReset.expiresAt.toISOString(),
    },
  };
}

export async function confirmPasswordReset(input: PasswordResetConfirmInput) {
  const passwordReset = await prisma.passwordReset.findUnique({
    where: {
      token: input.token,
    },
    include: {
      user: true,
    },
  });

  if (!passwordReset) {
    throw new Error("Invalid password reset token");
  }

  if (passwordReset.status !== PasswordResetStatus.PENDING) {
    throw new Error("Password reset token is no longer valid");
  }

  if (passwordReset.expiresAt <= new Date()) {
    await prisma.passwordReset.update({
      where: {
        id: passwordReset.id,
      },
      data: {
        status: PasswordResetStatus.EXPIRED,
      },
    });

    throw new Error("Password reset token has expired");
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction([
    prisma.passwordReset.update({
      where: {
        id: passwordReset.id,
      },
      data: {
        status: PasswordResetStatus.USED,
        usedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: {
        id: passwordReset.userId,
      },
      data: {
        passwordHash,
      },
    }),
    prisma.userSession.updateMany({
      where: {
        userId: passwordReset.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    }),
  ]);

  return {
    success: true,
    user: {
      id: passwordReset.user.id,
      email: passwordReset.user.email,
      username: passwordReset.user.username,
    },
  };
}
