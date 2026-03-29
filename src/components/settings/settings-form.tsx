"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

interface SettingsFormProps {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
}

function toLocale(value: string): "ar" | "en" {
  return value === "en" ? "en" : "ar";
}

async function resizeAvatarForUpload(file: File): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to load image"));
    i.src = dataUrl;
  });

  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  const scale = Math.max(size / img.width, size / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  const dx = (size - sw) / 2;
  const dy = (size - sh) / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, dx, dy, sw, sh);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.9)
  );
  if (!blob) return file;

  const base = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${base}-avatar.webp`, { type: "image/webp" });
}

export function SettingsForm({
  displayName,
  bio,
  avatarUrl,
  locale,
  timezone,
}: SettingsFormProps) {
  const [formDisplayName, setFormDisplayName] = useState(displayName ?? "");
  const [formBio, setFormBio] = useState(bio ?? "");
  const [formAvatarUrl, setFormAvatarUrl] = useState(avatarUrl ?? "");
  const [formLocale, setFormLocale] = useState<"ar" | "en">(toLocale(locale));
  const [formTimezone, setFormTimezone] = useState(timezone || "Asia/Bahrain");
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isArabic =
    typeof document !== "undefined"
      ? document.documentElement.lang?.toLowerCase().startsWith("ar")
      : true;

  const timezoneOptions = useMemo(() => {
    try {
      const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
      if (typeof fn === "function") return fn("timeZone");
    } catch {}
    return ["Asia/Bahrain","UTC","Europe/London","Europe/Paris","America/New_York","America/Los_Angeles","Asia/Dubai","Asia/Riyadh","Asia/Kolkata","Asia/Tokyo"];
  }, []);

  const t = useMemo(
    () =>
      isArabic
        ? {
            title: "تحديث الملف الشخصي",
            displayName: "الاسم المستعار",
            bio: "النبذة",
            avatar: "الصورة الشخصية",
            uploadHint: "اختر صورة من جهازك (PNG/JPG/WebP)",
            currentAvatar: "الصورة الحالية",
            locale: "اللغة",
            timezone: "المنطقة الزمنية",
            save: "حفظ التغييرات",
            saving: "جارٍ الحفظ...",
            success: "تم حفظ التغييرات بنجاح.",
            failedUpload: "فشل رفع الصورة الشخصية.",
            failedSave: "تعذر حفظ الإعدادات.",
          }
        : {
            title: "Update Profile",
            displayName: "Display Name",
            bio: "Bio",
            avatar: "Avatar",
            uploadHint: "Choose an image from your device (PNG/JPG/WebP)",
            currentAvatar: "Current avatar",
            locale: "Language",
            timezone: "Time zone",
            save: "Save Changes",
            saving: "Saving...",
            success: "Changes saved successfully.",
            failedUpload: "Failed to upload avatar.",
            failedSave: "Failed to save settings.",
          },
    [isArabic]
  );

  async function submitProfile() {
    setError(null);
    setOk(null);

    let finalAvatarUrl = formAvatarUrl.trim() || null;

    if (selectedAvatarFile) {
      const preparedAvatar = await resizeAvatarForUpload(selectedAvatarFile);
      const formData = new FormData();
      formData.append("file", preparedAvatar, preparedAvatar.name);

      const uploadResponse = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const uploadPayload = await uploadResponse.json().catch(() => null);

      if (!uploadResponse.ok || !uploadPayload?.success) {
        throw new Error(uploadPayload?.error?.message ?? t.failedUpload);
      }

      finalAvatarUrl =
        uploadPayload?.data?.url ??
        uploadPayload?.data?.fileUrl ??
        uploadPayload?.url ??
        null;

      if (!finalAvatarUrl) {
        throw new Error(t.failedUpload);
      }
    }

    const response = await fetch("/api/auth/me", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        displayName: formDisplayName.trim(),
        bio: formBio.trim() || null,
        avatarUrl: finalAvatarUrl,
        locale: formLocale,
        timezone: formTimezone.trim() || null,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error?.message ?? t.failedSave);
    }

    setFormAvatarUrl(finalAvatarUrl ?? "");
    setSelectedAvatarFile(null);
    setOk(t.success);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(() => {
      void submitProfile().catch((submitError) => {
        setOk(null);
        setError(submitError instanceof Error ? submitError.message : t.failedSave);
      });
    });
  }

  return (
    <form className="settings-form" onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>{t.title}</h2>

      <label style={{ display: "grid", gap: 6 }}>
        <span>{t.displayName}</span>
        <input
          value={formDisplayName}
          onChange={(event) => setFormDisplayName(event.target.value)}
          minLength={2}
          maxLength={80}
          required
          className="settings-form__input"
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>{t.bio}</span>
        <textarea
          value={formBio}
          onChange={(event) => setFormBio(event.target.value)}
          maxLength={280}
          rows={4}
          className="settings-form__input"
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>{t.avatar}</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => setSelectedAvatarFile(event.target.files?.[0] ?? null)}
          className="settings-form__input"
        />
        <small style={{ color: "var(--muted)" }}>{t.uploadHint}</small>
      </label>

      {formAvatarUrl ? (
        <div style={{ display: "grid", gap: 6 }}>
          <span>{t.currentAvatar}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={formAvatarUrl}
            alt="avatar"
            style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--line)" }}
          />
        </div>
      ) : null}

      <label style={{ display: "grid", gap: 6 }}>
        <span>{t.locale}</span>
        <select
          value={formLocale}
          onChange={(event) => setFormLocale(toLocale(event.target.value))}
          className="settings-form__input"
        >
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>{t.timezone}</span>
        <select
          value={formTimezone}
          onChange={(event) => setFormTimezone(event.target.value)}
          className="settings-form__input"
        >
          {timezoneOptions.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </label>

      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}
      {ok ? <p style={{ margin: 0, color: "#86efac" }}>{ok}</p> : null}

      <button type="submit" disabled={isPending} className="settings-form__submit">
        {isPending ? t.saving : t.save}
      </button>
    </form>
  );
}
