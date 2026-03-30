"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface MessageThreadFormProps {
  threadId: string;
  locale?: "ar" | "en";
  isBlocked?: boolean;
}

interface ReplyTarget {
  messageId: string;
  senderUserId: string;
  senderDisplayName: string;
  previewText: string;
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
    replyingTo: "رد على",
    closeReply: "إغلاق الرد",
    me: "أنا",
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
    replyingTo: "Replying to",
    closeReply: "Close reply",
    me: "Me",
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

function isMobileLikeDevice() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0
  );
}

export function MessageThreadForm({
  threadId,
  locale = "ar",
  isBlocked = false,
}: MessageThreadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [body, setBody] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
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

  useEffect(() => {
    function onReplyTarget(event: Event) {
      const custom = event as CustomEvent<ReplyTarget>;
      const detail = custom.detail;

      if (!detail?.messageId) return;

      setReplyTarget({
        messageId: detail.messageId,
        senderUserId: detail.senderUserId,
        senderDisplayName: detail.senderDisplayName,
        previewText: detail.previewText,
      });

      const anchor = document.getElementById("dm-composer-anchor");
      if (anchor) {
        anchor.scrollIntoView({ behavior: "smooth", block: "end" });
      }

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 120);
    }

    window.addEventListener("dm:reply-target", onReplyTarget as EventListener);
    return () => window.removeEventListener("dm:reply-target", onReplyTarget as EventListener);
  }, []);

  function clearSelectedImage() {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function clearReplyTarget() {
    setReplyTarget(null);
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
          replyToMessageId: replyTarget?.messageId ?? null,
          replySenderUserId: replyTarget?.senderUserId ?? null,
          replySenderDisplayName: replyTarget?.senderDisplayName ?? null,
          replyPreviewText: replyTarget?.previewText ?? null,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.failed);
        return;
      }

      setBody("");
      clearSelectedImage();
      clearReplyTarget();

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
    const isDesktop = !isMobileLikeDevice();

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      await submitMessage();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey && isDesktop) {
      event.preventDefault();
      await submitMessage();
    }
  }

  function openFilePicker() {
    if (isSubmitting || isBlocked) return;
    fileInputRef.current?.click();
  }

  const sendOnLeft = locale === "ar";

  return (
    <form id="dm-composer-anchor" onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
      {replyTarget ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(2,6,23,0.35)",
            borderRadius: "12px",
            padding: "8px 10px",
            display: "flex",
            alignItems: "start",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "12px", color: "#93c5fd", fontWeight: 700 }}>
              {t.replyingTo} {replyTarget.senderDisplayName || t.me}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
              }}
            >
              {replyTarget.previewText}
            </div>
          </div>

          <button
            type="button"
            onClick={clearReplyTarget}
            aria-label={t.closeReply}
            title={t.closeReply}
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(15,23,42,0.7)",
              color: "#e2e8f0",
              width: "26px",
              height: "26px",
              borderRadius: "999px",
              lineHeight: 1,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      ) : null}

      <div style={{ position: "relative" }}>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder={t.placeholder}
          disabled={isSubmitting || isBlocked}
          enterKeyHint="enter"
          style={{
            width: "100%",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(15,23,42,0.32)",
            paddingTop: "12px",
            paddingBottom: "12px",
            paddingInlineStart: sendOnLeft ? "54px" : "14px",
            paddingInlineEnd: sendOnLeft ? "14px" : "54px",
            resize: "vertical",
            minHeight: "92px",
          }}
        />

        <button
          type="submit"
          disabled={isSubmitting || isBlocked}
          aria-label={t.send}
          title={t.send}
          style={{
            position: "absolute",
            top: "12px",
            insetInlineStart: sendOnLeft ? "10px" : "auto",
            insetInlineEnd: sendOnLeft ? "auto" : "10px",
            border: "1px solid rgba(56,189,248,0.45)",
            background: "rgba(14,165,233,0.2)",
            color: "#e0f2fe",
            borderRadius: "10px",
            padding: "6px 10px",
            fontWeight: 700,
            cursor: isSubmitting || isBlocked ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? t.sending : t.send}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        disabled={isSubmitting || isBlocked}
        style={{ display: "none" }}
      />

      <button
        type="button"
        className="btn small"
        onClick={openFilePicker}
        disabled={isSubmitting || isBlocked}
        style={{ width: "fit-content" }}
      >
        {t.attachImage}
      </button>

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
    </form>
  );
}
