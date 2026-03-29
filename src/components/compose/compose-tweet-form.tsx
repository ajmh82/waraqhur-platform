"use client";
import Image from "next/image";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface ComposeTweetFormProps {
  locale?: "ar" | "en";
}

const MAX_TWEET_LENGTH = 280;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;

const copy = {
  ar: {
    title: "تغريدة جديدة",
    subtitle: "اكتب ما يدور في ذهنك، وأضف صورة أو فيديو إن أردت.",
    placeholder: "اكتب تغريدتك هنا...",
    mediaLabel: "أضف صورة أو فيديو",
    imageLimit: "حجم الصورة يجب ألا يتجاوز 5MB.",
    videoLimit: "حجم الفيديو يجب ألا يتجاوز 20MB.",
    invalidFile: "الملف يجب أن يكون صورة أو فيديو.",
    uploadFailed: "تعذر رفع الملف.",
    contentRequired: "نص التغريدة مطلوب.",
    publishFailed: "تعذر نشر التغريدة.",
    removeMedia: "حذف الوسائط",
    submit: "نشر التغريدة",
    submitting: "جارٍ النشر...",
  },
  en: {
    title: "New Post",
    subtitle: "Write what is on your mind and attach an image or video if you want.",
    placeholder: "Write your post here...",
    mediaLabel: "Add image or video",
    imageLimit: "Image size must not exceed 5MB.",
    videoLimit: "Video size must not exceed 20MB.",
    invalidFile: "The file must be an image or a video.",
    uploadFailed: "Failed to upload file.",
    contentRequired: "Post text is required.",
    publishFailed: "Failed to publish post.",
    removeMedia: "Remove media",
    submit: "Publish",
    submitting: "Publishing...",
  },
} as const;

export function ComposeTweetForm({ locale = "ar" }: ComposeTweetFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = copy[locale];

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function resetMedia() {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setPreviewType(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      resetMedia();
      return;
    }

    if (file.type.startsWith("image/")) {
      if (file.size > MAX_IMAGE_SIZE) {
        setError(t.imageLimit);
        event.target.value = "";
        return;
      }
    } else if (file.type.startsWith("video/")) {
      if (file.size > MAX_VIDEO_SIZE) {
        setError(t.videoLimit);
        event.target.value = "";
        return;
      }
    } else {
      setError(t.invalidFile);
      event.target.value = "";
      return;
    }

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setPreviewType(file.type.startsWith("video/") ? "video" : "image");
  }

  async function uploadSelectedFile() {
    if (!selectedFile) return { mediaUrl: null, mediaType: null };

    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch("/api/uploads", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error?.message ?? t.uploadFailed);
    }

    return {
      mediaUrl: payload.data.url as string,
      mediaType: payload.data.mediaType as "image" | "video",
    };
  }

  async function submitPost() {
    setError(null);

    const trimmed = content.trim();
    if (!trimmed) {
      setError(t.contentRequired);
      return;
    }

    try {
      const uploaded = await uploadSelectedFile();

      const response = await fetch("/api/tweets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          mediaUrl: uploaded.mediaUrl,
          mediaType: uploaded.mediaType,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.publishFailed);
        return;
      }

      startTransition(() => {
        router.push("/timeline");
        router.refresh();
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.publishFailed);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitPost();
  }

  async function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      await submitPost();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="state-card" style={{ margin: 0, maxWidth: "100%", padding: "20px", display: "grid", gap: "16px" }}>
      <div style={{ display: "grid", gap: "4px" }}>
        <h1 style={{ margin: 0, fontSize: "24px" }}>{t.title}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>{t.subtitle}</p>
      </div>

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value.slice(0, MAX_TWEET_LENGTH))}
        onKeyDown={handleKeyDown}
        rows={7}
        maxLength={MAX_TWEET_LENGTH}
        placeholder={t.placeholder}
        style={{ borderRadius: "18px", padding: "14px 16px", minHeight: "180px" }}
      />

      <label style={{ display: "grid", gap: "6px" }}>
        <span style={{ color: "var(--muted)", fontSize: "14px" }}>{t.mediaLabel}</span>
        <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={handleFileChange} />
      </label>

      {previewUrl ? (
        <div style={{ overflow: "hidden", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)", background: "#020617" }}>
          {previewType === "image" ? (
            <Image unoptimized src={previewUrl} alt="Preview" style={{ display: "block", width: "100%", maxHeight: "360px", objectFit: "cover" }} />
          ) : (
            <video src={previewUrl} controls style={{ display: "block", width: "100%", maxHeight: "360px", background: "#000" }} />
          )}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: "var(--muted)", fontSize: "13px" }}>
          {content.length}/{MAX_TWEET_LENGTH}
        </span>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {previewUrl ? (
            <button type="button" className="btn small" onClick={resetMedia} disabled={isPending} style={{ borderColor: "rgba(248,113,113,0.25)", color: "#fecaca" }}>
              {t.removeMedia}
            </button>
          ) : null}

          <button type="submit" className="btn-action" disabled={isPending}>
            {isPending ? t.submitting : t.submit}
          </button>
        </div>
      </div>

      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}
    </form>
  );
}
