import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import type {
  EmailMessage,
  EmailSendResult,
  EmailService,
} from "@/types/email";

export class ConsoleEmailService implements EmailService {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    const messageId = randomUUID();

    console.log(
      JSON.stringify(
        {
          type: "console_email",
          provider: env.mailProvider,
          messageId,
          from: {
            name: env.mailFromName,
            email: env.mailFromEmail,
          },
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html ?? null,
          sentAt: new Date().toISOString(),
        },
        null,
        2
      )
    );

    return {
      success: true,
      provider: env.mailProvider,
      messageId,
    };
  }
}
