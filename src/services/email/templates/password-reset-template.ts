import { env } from "@/lib/env";
import type { EmailMessage } from "@/types/email";

export function buildPasswordResetMessage(input: {
  toEmail: string;
  toName?: string | null;
  resetUrl: string;
}): EmailMessage {
  const subject = `إعادة تعيين كلمة المرور - ${env.appName}`;

  const text = [
    `مرحباً ${input.toName?.trim() || input.toEmail},`,
    "",
    `تم إنشاء طلب لإعادة تعيين كلمة المرور في ${env.appName}.`,
    "استخدم الرابط التالي لإكمال العملية:",
    input.resetUrl,
    "",
    "إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.8; color: #111827;">
      <h2 style="margin-bottom: 16px;">إعادة تعيين كلمة المرور</h2>
      <p>مرحباً ${input.toName?.trim() || input.toEmail}،</p>
      <p>تم إنشاء طلب لإعادة تعيين كلمة المرور في <strong>${env.appName}</strong>.</p>
      <p>
        <a href="${input.resetUrl}" style="color: #0f766e;">اضغط هنا لإعادة تعيين كلمة المرور</a>
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
