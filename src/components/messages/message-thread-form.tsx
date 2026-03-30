"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface MessageThreadFormProps {
  threadId: string;
  locale?: "ar" | "en";
  isBlocked?: boolean;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const copy = {
  ar: {
    placeholder: "اكتب رسالتك...",
    send: "إرسال",
    sending: "جارٍ الإرسال...",
    required: "نص الرسالة أو الصورة مطلوب.",
    failed: "تعذر إرسال الرسالة.",
    blocked: "لا يمكنك إرسال رسائل لأن هناك بلوك بين الطرفين.",
    uploadFailed: "تعذر رفع الصورة.",
    invalidImageType: "نوع الصورة غير مدعوم.",
    imageTooLarge: "حجم الصورة يجب ألا يتجاوز 5MB.",
    attachImage: "إرفاق صورة",
    removeImage: "حذف الصورة",
    imagePreview: "معاينة الصورة",
  },
  en: {
    placeholder: "Write your message...",
    send: "Send",
    sending: "Sending...",
    required: "Message text or image is required.",
    failed: "Failed to send message.",
    blocked: "You cannot send messages because one side has blocked the other.",
    uploadFailed: "Failed to upload image.",
    invalidImageType: "Unsupported image type.",
    imageTooLarge: "Image size must not exceed 5MB.",
    attachImage: "Attach image",
    removeImage: "Remove image",
    imagePreview: "Image preview",
  },
} as const;

function isSupportedImageType(type: string) {
  return (
    type === "image/jpeg" ||
    type === "image/png" ||
    type === "image/webp" ||
    type === "image/gif"
  );
}

export function MessageThreadForm({
  threadId,
  locale = "ar",
  isBlocked = false,
}: MessageThreadFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = copy[locale];

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function clearSelectedImage() {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedImage(null);
    setPreviewUrl(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      clearSelectedImage();
      return;
    }

    if (!isSupportedImageType(file.type)) {
      setError(t.invalidImageType);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError(t.imageTooLarge);
      event.target.value = "";
      return;
    }

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadSelectedImage() {
    if (!selectedImage) {
      return {
        mediaUrl: null as string | null,
        mediaMimeType: null as string | null,
        mediaSizeBytes: null as number | null,
      };
    }

    const formData = new FormData();
    formData.append("file", selectedImage);

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
      mediaUrl: payload?.data?.url as string,
      mediaMimeType: selectedImage.type,
      mediaSizeBytes: selectedImage.size,
    };
  }

  async function submitMessage() {
    setError(null);

    if (isBlocked) {
      setError(t.blocked);
      return;
    }

    const hasText = body.trim().length > 0;
    const hasImage = Boolean(selectedImage);

    if (!hasText && !hasImage) {
      setError(t.required);
      return;
    }

    setIsSubmitting(true);

    try {
      const uploaded = await uploadSelectedImage();

      const response = await fetch(`/api/messages/${threadId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          mediaUrl: uploaded.mediaUrl,
          mediaMimeType: uploaded.mediaMimeType,
          mediaSizeBytes: uploaded.mediaSizeBytes,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.failed);
        return;
      }

      setBody("");
      clearSelectedImage();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dm:sent"));
      }

      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage();
  }

  async function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await submitMessage();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      await submitMessage();
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        placeholder={t.placeholder}
        disabled={isSubmitting || isBlocked}
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(15,23,42,0.32)",
          padding: "12px 14px",
        }}
      />

      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          width: "fit-content",
          cursor: isSubmitting || isBlocked ? "not-allowed" : "pointer",
          color: "var(--muted)",
          fontSize: "14px",
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          disabled={isSubmitting || isBlocked}
          style={{ display: "none" }}
        />
        <span className="btn small">{t.attachImage}</span>
      </label>

      {previewUrl ? (
        <div style={{ display: "grid", gap: "8px" }}>
          <div
            style={{
              overflow: "hidden",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.08)",
              width: "fit-content",
              maxWidth: "280px",
            }}
          >
            <Image
              unoptimized
              src={previewUrl}
              alt={t.imagePreview}
              width={280}
              height={180}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                objectFit: "cover",
              }}
            />
          </div>
          <button
            type="button"
            className="btn small"
            onClick={clearSelectedImage}
            disabled={isSubmitting || isBlocked}
            style={{ width: "fit-content" }}
          >
            {t.removeImage}
          </button>
        </div>
      ) : null}

      {error ? (
        <p style={{ margin: 0, color: "var(--danger)", fontSize: "14px" }}>{error}</p>
      ) : null}

      {isBlocked ? (
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>{t.blocked}</p>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="btn-action" disabled={isSubmitting || isBlocked}>
          {isSubmitting ? t.sending : t.send}
        </button>
      </div>
    </form>
  );
}
