import Image from "next/image";
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface SettingsFormProps {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  locale: string | null;
  timezone: string | null;
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const copy = {
  ar: {
    displayName: "الاسم المعروض",
    language: "اللغة",
    avatarUrl: "رابط الصورة الرمزية",
    timezone: "المنطقة الزمنية",
    bio: "النبذة",
    bioPlaceholder: "اكتب نبذة مختصرة عنك...",
    avatarUpload: "رفع صورة",
    avatarDelete: "حذف الصورة",
    avatarTypeError: "الصورة الرمزية يجب أن تكون ملف صورة.",
    avatarSizeError: "حجم الصورة الرمزية يجب ألا يتجاوز 5MB.",
    avatarUploadError: "تعذر رفع الصورة الرمزية.",
    saveError: "تعذر حفظ الإعدادات.",
    saveSuccess: "تم حفظ الإعدادات بنجاح.",
    save: "حفظ الإعدادات",
    saving: "جارٍ الحفظ...",
  },
  en: {
    displayName: "Display Name",
    language: "Language",
    avatarUrl: "Avatar URL",
    timezone: "Timezone",
    bio: "Bio",
    bioPlaceholder: "Write a short bio about yourself...",
    avatarUpload: "Upload Image",
    avatarDelete: "Remove Image",
    avatarTypeError: "Avatar must be an image file.",
    avatarSizeError: "Avatar size must not exceed 5MB.",
    avatarUploadError: "Failed to upload avatar.",
    saveError: "Failed to save settings.",
    saveSuccess: "Settings saved successfully.",
    save: "Save Settings",
    saving: "Saving...",
  },
} as const;

export function SettingsForm({
  displayName,
  bio,
  avatarUrl,
  locale,
  timezone,
}: SettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialLocaleRef = useRef((locale === "en" ? "en" : "ar") as "ar" | "en");

  const [formDisplayName, setFormDisplayName] = useState(displayName);
  const [formBio, setFormBio] = useState(bio ?? "");
  const [formAvatarUrl, setFormAvatarUrl] = useState(avatarUrl ?? "");
  const [formLocale, setFormLocale] = useState((locale === "en" ? "en" : "ar") as "ar" | "en");
  const [formTimezone, setFormTimezone] = useState(timezone ?? "Asia/Bahrain");
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(
    avatarUrl ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const t = copy[formLocale];

  useEffect(() => {
    if (!selectedAvatarFile) {
      setAvatarPreviewUrl(formAvatarUrl.trim() || null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedAvatarFile);
    setAvatarPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedAvatarFile, formAvatarUrl]);

  function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);

    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedAvatarFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(t.avatarTypeError);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setError(t.avatarSizeError);
      event.target.value = "";
      return;
    }

    setSelectedAvatarFile(file);
  }

  async function uploadAvatarIfNeeded() {
    if (!selectedAvatarFile) {
      return formAvatarUrl.trim() ? formAvatarUrl.trim() : null;
    }

    const formData = new FormData();
    formData.append("file", selectedAvatarFile);

    const response = await fetch("/api/uploads", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error?.message ?? t.avatarUploadError);
    }

    return typeof payload?.data?.url === "string" ? payload.data.url : null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const nextAvatarUrl = await uploadAvatarIfNeeded();

      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: formDisplayName.trim(),
          bio: formBio.trim() ? formBio.trim() : null,
          avatarUrl: nextAvatarUrl,
          locale: formLocale,
          timezone: formTimezone.trim() ? formTimezone.trim() : null,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.saveError);
        return;
      }

      setSuccess(t.saveSuccess);
      setSelectedAvatarFile(null);

      const localeChanged = initialLocaleRef.current !== formLocale;
      initialLocaleRef.current = formLocale;

      startTransition(() => {
        router.refresh();
        if (localeChanged && typeof window !== "undefined") {
          window.location.reload();
        }
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t.saveError
      );
    }
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
        padding: "18px",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "minmax(0, 160px) minmax(0, 1fr)",
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: "10px", justifyItems: "center" }}>
          <div
            style={{
              width: "112px",
              height: "112px",
              borderRadius: "999px",
              overflow: "hidden",
              background: avatarPreviewUrl
                ? "transparent"
                : "linear-gradient(135deg, #0ea5e9, #2563eb)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: "34px",
              fontWeight: 900,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {avatarPreviewUrl ? (
              <img
                src={avatarPreviewUrl}
                alt={formDisplayName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              formDisplayName.charAt(0).toUpperCase()
            )}
          </div>

          <label
            className="btn small"
            style={{ cursor: "pointer", width: "100%", justifyContent: "center" }}
          >
            {t.avatarUpload}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              style={{ display: "none" }}
            />
          </label>

          {(selectedAvatarFile || formAvatarUrl) ? (
            <button
              type="button"
              className="btn small"
              onClick={() => {
                setSelectedAvatarFile(null);
                setFormAvatarUrl("");
                setAvatarPreviewUrl(null);
              }}
              disabled={isPending}
              style={{
                width: "100%",
                borderColor: "rgba(248,113,113,0.25)",
                color: "#fecaca",
              }}
            >
              {t.avatarDelete}
            </button>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gap: "14px",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span>{t.displayName}</span>
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
            <span>{t.language}</span>
            <select
              value={formLocale}
              onChange={(event) => setFormLocale(event.target.value as "ar" | "en")}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span>{t.avatarUrl}</span>
            <input
              type="url"
              value={formAvatarUrl}
              onChange={(event) => {
                setFormAvatarUrl(event.target.value);
                setSelectedAvatarFile(null);
              }}
              placeholder="https://example.com/avatar.jpg"
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span>{t.timezone}</span>
            <select
              value={formTimezone}
              onChange={(event) => setFormTimezone(event.target.value)}
            >
              <option value="Asia/Bahrain">Asia/Bahrain</option>
              <option value="Asia/Riyadh">Asia/Riyadh</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
        </div>
      </div>

      <label style={{ display: "grid", gap: "6px" }}>
        <span>{t.bio}</span>
        <textarea
          value={formBio}
          onChange={(event) => setFormBio(event.target.value)}
          rows={5}
          maxLength={280}
          placeholder={t.bioPlaceholder}
        />
      </label>

      {error ? (
        <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
      ) : null}

      {success ? (
        <p style={{ margin: 0, color: "#86efac" }}>{success}</p>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="submit"
          className="btn-action"
          disabled={isPending}
        >
          {isPending ? t.saving : t.save}
        </button>
      </div>
    </form>
  );
}
