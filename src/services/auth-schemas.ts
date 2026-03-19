import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email is required"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can contain letters, numbers, and underscores only"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().trim().min(2, "Display name must be at least 2 characters").max(80),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(300).nullable().optional(),
  avatarUrl: z.string().trim().url().nullable().optional(),
  locale: z.string().trim().max(20).nullable().optional(),
  timezone: z.string().trim().max(64).nullable().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
