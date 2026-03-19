import { env } from "@/lib/env";
import type { EmailMessage } from "@/types/email";

export function buildEmailVerificationMessage(input: {
  toEmail: string;
  toName?: string | null;
  verificationUrl: string;
}): EmailMessage {
  const subject = `تفعيل البريد الإلكتروني - ${env.appName}`;

  const text = [
    `مرحباً ${input.toName?.trim() || input.toEmail},`,
    "",
    `تم إنشاء طلب لتفعيل بريدك الإلكتروني في ${env.appName}.`,
    "استخدم الرابط التالي لتأكيد البريد الإلكتروني:",
    input.verificationUrl,
    "",
    "إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.8; color: #111827;">
      <h2 style="margin-bottom: 16px;">تفعيل البريد الإلكتروني</h2>
      <p>مرحباً ${input.toName?.trim() || input.toEmail}،</p>
      <p>تم إنشاء طلب لتفعيل بريدك الإلكتروني في <strong>${env.appName}</strong>.</p>
      <p>
        <a href="${input.verificationUrl}" style="color: #0f766e;">اضغط هنا لتأكيد البريد الإلكتروني</a>
      </p>
      <p>إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.</p>
    </div>
  `.trim();

  return {
    to: {
      email: input.toEmail,
      name: input.toName ?? null,
    },
    subject,
    text,
    html,
  };
}
