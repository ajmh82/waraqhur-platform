"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface SettingsFormProps {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  locale: string | null;
  timezone: string | null;
}

export function SettingsForm({
  displayName,
  bio,
  avatarUrl,
  locale,
  timezone,
}: SettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formDisplayName, setFormDisplayName] = useState(displayName);
  const [formBio, setFormBio] = useState(bio ?? "");
  const [formAvatarUrl, setFormAvatarUrl] = useState(avatarUrl ?? "");
  const [formLocale, setFormLocale] = useState(locale ?? "ar");
  const [formTimezone, setFormTimezone] = useState(timezone ?? "Asia/Riyadh");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/auth/me", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: formDisplayName,
        bio: formBio.trim() ? formBio.trim() : null,
        avatarUrl: formAvatarUrl.trim() ? formAvatarUrl.trim() : null,
        locale: formLocale,
        timezone: formTimezone.trim() ? formTimezone.trim() : null,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر حفظ الإعدادات.");
      return;
    }

    setSuccess("تم حفظ الإعدادات بنجاح.");

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="state-card"
      style={{
        maxWidth: "100%",
        margin: 0,
        display: "grid",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: "14px",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        <label style={{ display: "grid", gap: "6px" }}>
          <span>الاسم المعروض</span>
          <input
            type="text"
            value={formDisplayName}
            onChange={(event) => setFormDisplayName(event.target.value)}
            minLength={2}
            maxLength={80}
            required
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span>اللغة</span>
          <select
            value={formLocale}
            onChange={(event) => setFormLocale(event.target.value)}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span>رابط الصورة الرمزية</span>
          <input
            type="url"
            value={formAvatarUrl}
            onChange={(event) => setFormAvatarUrl(event.target.value)}
            placeholder="https://example.com/avatar.jpg"
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span>المنطقة الزمنية</span>
          <select
            value={formTimezone}
            onChange={(event) => setFormTimezone(event.target.value)}
          >
            <option value="Asia/Riyadh">Asia/Riyadh</option>
            <option value="Asia/Bahrain">Asia/Bahrain</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
      </div>

      <label style={{ display: "grid", gap: "6px" }}>
        <span>النبذة</span>
        <textarea
          value={formBio}
          onChange={(event) => setFormBio(event.target.value)}
          rows={5}
          maxLength={300}
          placeholder="اكتب نبذة مختصرة عنك"
        />
      </label>

      <div
        className="state-card"
        style={{
          maxWidth: "100%",
          margin: 0,
          padding: "14px 16px",
          display: "grid",
          gap: "8px",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <strong>المعاينة الحالية</strong>
        <p style={{ margin: 0 }}>
          الاسم: {formDisplayName || "غير محدد"}
        </p>
        <p style={{ margin: 0 }}>
          اللغة: {formLocale === "en" ? "English" : "العربية"}
        </p>
        <p style={{ margin: 0 }}>
          المنطقة الزمنية: {formTimezone || "غير محددة"}
        </p>
      </div>

      {error ? (
        <p style={{ color: "var(--danger)", margin: 0 }}>
          {error}
        </p>
      ) : null}

      {success ? (
        <p style={{ color: "var(--accent-strong)", margin: 0 }}>
          {success}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button type="submit" className="btn-action" disabled={isPending}>
          {isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>
    </form>
  );
}
