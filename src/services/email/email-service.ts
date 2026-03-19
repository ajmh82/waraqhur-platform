import { env } from "@/lib/env";
import type { EmailService } from "@/types/email";
import { ConsoleEmailService } from "@/services/email/console-email-service";

let emailServiceSingleton: EmailService | null = null;

export function getEmailService(): EmailService {
  if (emailServiceSingleton) {
    return emailServiceSingleton;
  }

  switch (env.mailProvider) {
    case "console":
    default:
      emailServiceSingleton = new ConsoleEmailService();
      return emailServiceSingleton;
  }
}
