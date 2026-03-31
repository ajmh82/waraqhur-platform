"use client";

import { useState } from "react";

interface MessagesSettingsFormProps {
  locale?: "ar" | "en";
  initialEnabled: boolean;
}

export function MessagesSettingsForm({
  locale = "ar",
  initialEnabled,
}: MessagesSettingsFormProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const isEn = locale === "en";

  return (
    <form
      className="state-card"
      action="/api/preferences/messages"
      method="post"
      style={{ display: "grid", gap: 12, padding: 14 }}
    >
      <h2 style={{ margin: 0, fontSize: 18 }}>
        {isEn ? "Private messages" : "الرسائل الخاصة"}
      </h2>
      <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
        {isEn
          ? "When disabled, others cannot send chat requests or direct messages to you."
          : "عند الإيقاف، لا يستطيع أي مستخدم إرسال طلب محادثة أو رسائل خاصة لك."}
      </p>

      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          name="directMessagesEnabled"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span>
          {isEn
            ? "Allow private messages and requests"
            : "السماح بالرسائل وطلبات المحادثة"}
        </span>
      </label>

      {!enabled ? (
        <p style={{ margin: 0, color: "var(--danger)" }}>
          {isEn
            ? "Your private messages are currently turned off."
            : "الرسائل الخاصة لديك متوقفة حالياً."}
        </p>
      ) : null}

      <button className="settings-form__submit" type="submit">
        {isEn ? "Save settings" : "حفظ الإعدادات"}
      </button>
    </form>
  );
}
