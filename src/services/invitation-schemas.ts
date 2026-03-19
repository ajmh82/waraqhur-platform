import { z } from "zod";

export const createInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email is required"),
  roleKey: z.enum(["member", "moderator", "admin", "super_admin"]),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

export const acceptInvitationSchema = z.object({
  token: z.string().trim().min(1, "Invitation token is required"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can contain letters, numbers, and underscores only"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().trim().min(2, "Display name must be at least 2 characters").max(80),
});

export const revokeInvitationSchema = z.object({
  invitationId: z.string().trim().min(1, "Invitation id is required"),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type RevokeInvitationInput = z.infer<typeof revokeInvitationSchema>;
