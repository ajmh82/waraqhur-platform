"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface MessageThreadFormProps {
  threadId: string;
  locale?: "ar" | "en";
  isBlocked?: boolean;
  onReplyCancel?: () => void;
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
  onReplyCancel,
}: MessageThreadFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioTimerRef = useRef<number | null>(null);
  const t = copy[locale];

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      if (audioPreviewUrl && audioPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      if (audioTimerRef.current) {
        window.clearInterval(audioTimerRef.current);
      }
    };
  }, [previewUrl, audioPreviewUrl]);

  function clearSelectedAudio() {
    if (audioPreviewUrl && audioPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setAudioSeconds(0);
    setAudioMimeType(null);
  }

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

  async function uploadSelectedAudio() {
    if (!audioBlob) {
      return {
        mediaUrl: null as string | null,
        mediaMimeType: null as string | null,
        mediaSizeBytes: null as number | null,
      };
    }

    const ext =
      audioMimeType === "audio/webm" || audioMimeType === "audio/webm;codecs=opus"
        ? "webm"
        : "webm";
    const file = new File([audioBlob], `voice-note.${ext}`, {
      type: "audio/webm",
    });
    const formData = new FormData();
    formData.append("file", file);

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
      mediaMimeType: file.type,
      mediaSizeBytes: file.size,
    };
  }

  async function stopRecording() {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    if (audioTimerRef.current) {
      window.clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }
  }

  async function startRecording() {
    setError(null);
    if (isBlocked || isSubmitting || isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(locale === "en" ? "Audio recording is not supported." : "تسجيل الصوت غير مدعوم.");
      return;
    }
    try {
      await clearSelectedAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      setAudioMimeType(mimeType || "audio/webm");
      setAudioSeconds(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl(url);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      audioTimerRef.current = window.setInterval(() => {
        setAudioSeconds((prev) => {
          if (prev >= 59) {
            void stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setError(locale === "en" ? "Unable to start voice recording." : "تعذر بدء تسجيل الصوت.");
    }
  }

  async function submitMessage() {
    setError(null);

    if (isBlocked) {
      setError(t.blocked);
      return;
    }

    const hasText = body.trim().length > 0;
    const hasImage = Boolean(selectedImage);
    const hasAudio = Boolean(audioBlob);

    if (!hasText && !hasImage && !hasAudio) {
      setError(t.required);
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedImage = await uploadSelectedImage();
      const uploadedAudio = await uploadSelectedAudio();
      const finalMediaUrl = uploadedImage.mediaUrl ?? uploadedAudio.mediaUrl;
      const finalMediaMimeType = uploadedImage.mediaMimeType ?? uploadedAudio.mediaMimeType;
      const finalMediaSizeBytes =
        uploadedImage.mediaSizeBytes ?? uploadedAudio.mediaSizeBytes;

      const response = await fetch(`/api/messages/${threadId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          mediaUrl: finalMediaUrl,
          mediaMimeType: finalMediaMimeType,
          mediaSizeBytes: finalMediaSizeBytes,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.failed);
        return;
      }

      setBody("");
      clearSelectedImage();
      await clearSelectedAudio();
      onReplyCancel?.();

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
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      await submitMessage();
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
      <div
        style={{
          display: "grid",
          gap: "8px",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(15,23,42,0.32)",
          padding: "10px 12px",
        }}
      >
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={t.placeholder}
          disabled={isSubmitting || isBlocked}
          style={{
            width: "100%",
            borderRadius: "12px",
            border: 0,
            background: "transparent",
            padding: "4px 2px",
            resize: "none",
            minHeight: "24px",
            maxHeight: "160px",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.16)",
              cursor: isSubmitting || isBlocked ? "not-allowed" : "pointer",
              color: "var(--muted)",
              fontSize: "20px",
              lineHeight: 1,
            }}
            title={t.attachImage}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              disabled={isSubmitting || isBlocked}
              style={{ display: "none" }}
            />
            +
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="btn small"
              onClick={() => (isRecording ? stopRecording() : startRecording())}
              disabled={isSubmitting || isBlocked}
              style={{ minWidth: 38, paddingInline: 10 }}
              title={locale === "en" ? "Voice message" : "رسالة صوتية"}
            >
              {isRecording ? "◼" : "🎤"}
            </button>
            <button
              type="submit"
              className="btn small"
              disabled={isSubmitting || isBlocked}
              title={t.send}
              style={{ minWidth: 38, paddingInline: 10 }}
            >
              {isSubmitting ? "…" : "➤"}
            </button>
          </div>
        </div>
        {isRecording ? (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "12px" }}>
            {locale === "en" ? "Recording..." : "جارٍ تسجيل الصوت..."} {audioSeconds}s / 60s
          </p>
        ) : null}
      </div>

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

      {audioPreviewUrl ? (
        <div style={{ display: "grid", gap: "8px" }}>
          <audio controls src={audioPreviewUrl} />
          <button
            type="button"
            className="btn small"
            onClick={() => void clearSelectedAudio()}
            disabled={isSubmitting || isBlocked}
            style={{ width: "fit-content" }}
          >
            {locale === "en" ? "Remove audio" : "حذف الصوت"}
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
