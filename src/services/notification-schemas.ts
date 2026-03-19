import { z } from "zod";

export const markNotificationAsReadSchema = z.object({
  notificationId: z.string().trim().min(1, "Notification id is required"),
});

export type MarkNotificationAsReadInput = z.infer<
  typeof markNotificationAsReadSchema
>;
