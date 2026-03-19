import { z } from "zod";

export const assignRoleSchema = z.object({
  userId: z.string().trim().min(1, "User id is required"),
  roleKey: z.enum(["member", "moderator", "admin", "super_admin"]),
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
