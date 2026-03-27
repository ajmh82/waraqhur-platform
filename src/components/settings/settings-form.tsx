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
  const [formLocale, setFormLocale] = useState(locale === "en" ? "en" : "ar");
  const [formTimezone, setFormTimezone] = useState(timezone ?? "Asia/Bahrain");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/auth/me", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: formDisplayName.trim(),
        bio: formBio.trim() || null,
        avatarUrl: formAvatarUrl.trim() || null,
        locale: formLocale,
        timezone: formTimezone.trim() || null,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر حفظ الإعدادات.");
      return;
    }

    // مزامنة تفضيل اللغة عبر endpoint التفضيلات
    await fetch("/api/preferences/locale", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: formLocale }),
    }).catch(() => {});

    setSuccess(formLocale === "en" ? "Settings saved successfully." : "تم حفظ الإعدادات بنجاح.");

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="state-card" style={{ display: "grid", gap: 14 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{formLocale === "en" ? "Display Name" : "الاسم المعروض"}</span>
        <input
          type="text"
          value={formDisplayName}
          onChange={(e) => setFormDisplayName(e.target.value)}
          minLength={2}
          maxLength={80}
          required
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>{formLocale === "en" ? "Language" : "اللغة"}</span>
        <select value={formLocale} onChange={(e) => setFormLocale(e.target.value as "ar" | "en")}>
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>{formLocale === "en" ? "Timezone" : "المنطقة الزمنية"}</span>
        <select value={formTimezone} onChange={(e) => setFormTimezone(e.target.value)}>
          <option value="Asia/Bahrain">Asia/Bahrain</option>
          <option value="Asia/Riyadh">Asia/Riyadh</option>
          <option value="UTC">UTC</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>{formLocale === "en" ? "Avatar URL" : "رابط الصورة الرمزية"}</span>
        <input
          type="url"
          value={formAvatarUrl}
          onChange={(e) => setFormAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>{formLocale === "en" ? "Bio" : "النبذة"}</span>
        <textarea value={formBio} onChange={(e) => setFormBio(e.target.value)} rows={4} maxLength={280} />
      </label>

      {error ? <p style={{ margin: 0, color: "var(--danger, #ff5d6c)" }}>{error}</p> : null}
      {success ? <p style={{ margin: 0, color: "var(--success, #22c55e)" }}>{success}</p> : null}

      <button type="submit" className="btn primary" disabled={isPending}>
        {isPending
          ? formLocale === "en" ? "Saving..." : "جارٍ الحفظ..."
          : formLocale === "en" ? "Save Settings" : "حفظ الإعدادات"}
      </button>
    </form>
  );
}
