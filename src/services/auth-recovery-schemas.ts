import { z } from "zod";

export const emailVerificationRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email is required"),
});

export const emailVerificationConfirmSchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email is required"),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type EmailVerificationRequestInput = z.infer<
  typeof emailVerificationRequestSchema
>;
export type EmailVerificationConfirmInput = z.infer<
  typeof emailVerificationConfirmSchema
>;
export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetConfirmInput = z.infer<
  typeof passwordResetConfirmSchema
>;
