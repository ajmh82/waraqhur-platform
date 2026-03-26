import { env } from "@/lib/env";
import type {
  EmailMessage,
  EmailSendResult,
  EmailService,
} from "@/types/email";

export class PostmarkEmailService implements EmailService {
  private serverToken: string;

  constructor(serverToken: string) {
    this.serverToken = serverToken;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const fromAddress = `${env.mailFromName} <${env.mailFromEmail}>`;
    const toAddress = message.to.name
      ? `${message.to.name} <${message.to.email}>`
      : message.to.email;

    const body = {
      From: fromAddress,
      To: toAddress,
      Subject: message.subject,
      TextBody: message.text,
      HtmlBody: message.html ?? undefined,
      MessageStream: "outbound",
    };

    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": this.serverToken,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || payload?.ErrorCode) {
      console.error("[PostmarkEmailService] Send failed:", {
        status: response.status,
        errorCode: payload?.ErrorCode,
        message: payload?.Message,
      });

      return {
        success: false,
        provider: "postmark",
        messageId: payload?.MessageID ?? "",
      };
    }

    console.log("[PostmarkEmailService] Sent:", {
      messageId: payload?.MessageID,
      to: toAddress,
      subject: message.subject,
    });

    return {
      success: true,
      provider: "postmark",
      messageId: payload?.MessageID ?? "",
    };
  }
}
