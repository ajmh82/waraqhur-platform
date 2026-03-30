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
const MAX_AUDIO_SECONDS = 60;

const copy = {
  ar: {
    placeholder: "اكتب رسالتك...",
    send: "إرسال",
    sending: "جارٍ الإرسال...",
    required: "نص الرسالة أو الصورة أو الصوت مطلوب.",
    failed: "تعذر إرسال الرسالة.",
    blocked: "لا يمكنك إرسال رسائل لأن هناك حظر بين الطرفين.",
    uploadFailed: "تعذر رفع الملف.",
    invalidImageType: "نوع الصورة غير مدعوم.",
    imageTooLarge: "حجم الصورة يجب ألا يتجاوز 5MB.",
    attachImage: "إرفاق صورة",
    removeImage: "حذف الصورة",
    imagePreview: "معاينة الصورة",
    replyingTo: "رد على",
    closeReply: "إغلاق الرد",
    me: "أنا",
    startRecord: "تسجيل",
    stopRecord: "إيقاف",
    recording: "جارٍ التسجيل...",
    recordTooLong: "تم إيقاف التسجيل بعد دقيقة واحدة",
    noMic: "الميكروفون غير متاح في هذا المتصفح",
    removeAudio: "حذف الصوت",
  },
  en: {
    placeholder: "Write your message...",
    send: "Send",
    sending: "Sending...",
    required: "Message text, image, or audio is required.",
    failed: "Failed to send message.",
    blocked: "You cannot send messages because there is a block between both users.",
    uploadFailed: "Failed to upload file.",
    invalidImageType: "Unsupported image type.",
    imageTooLarge: "Image size must not exceed 5MB.",
    attachImage: "Attach image",
    removeImage: "Remove image",
    imagePreview: "Image preview",
    replyingTo: "Replying to",
    closeReply: "Close reply",
    me: "Me",
    startRecord: "Record",
    stopRecord: "Stop",
    recording: "Recording...",
    recordTooLong: "Recording stopped after 60 seconds",
    noMic: "Microphone is unavailable in this browser",
    removeAudio: "Remove audio",
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);

  const [body, setBody] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = copy[locale];

  const sendOnLeft = locale === "ar";
  const SINGLE_LINE_HEIGHT = 28;

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      if (recordedAudioUrl && recordedAudioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      stopRecordingIfNeeded();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, recordedAudioUrl]);

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
    return () =>
      window.removeEventListener("dm:reply-target", onReplyTarget as EventListener);
  }, []);

  useEffect(() => {
    autoResizeTextarea();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  function autoResizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = `${SINGLE_LINE_HEIGHT}px`;
    const next = Math.min(el.scrollHeight, 160);
    el.style.height = `${Math.max(next, SINGLE_LINE_HEIGHT)}px`;
  }

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

  function clearRecordedAudio() {
    if (recordedAudioUrl && recordedAudioUrl.startsWith("blob:")) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudio(null);
    setRecordedAudioUrl(null);
  }

  function clearReplyTarget() {
    setReplyTarget(null);
  }

  function stopRecordingIfNeeded() {
    if (recordTimerRef.current) {
      window.clearTimeout(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  async function startRecording() {
    setError(null);
    if (isSubmitting || isBlocked || isRecording) return;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t.noMic);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recordChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(recordChunksRef.current, { type: mimeType });
        const file = new File([blob], `dm-audio-${Date.now()}.webm`, { type: mimeType });

        clearRecordedAudio();
        setRecordedAudio(file);
        setRecordedAudioUrl(URL.createObjectURL(file));
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);

      recordTimerRef.current = window.setTimeout(() => {
        setError(t.recordTooLong);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      }, MAX_AUDIO_SECONDS * 1000);
    } catch {
      setError(t.noMic);
    }
  }

  function stopRecording() {
    if (!isRecording) return;
    stopRecordingIfNeeded();
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

  async function uploadFile(file: File) {
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

    return payload?.data?.url as string;
  }

  async function submitMessage() {
    setError(null);

    if (isBlocked) {
      setError(t.blocked);
      return;
    }

    const hasText = body.trim().length > 0;
    const hasImage = Boolean(selectedImage);
    const hasAudio = Boolean(recordedAudio);

    if (!hasText && !hasImage && !hasAudio) {
      setError(t.required);
      return;
    }

    setIsSubmitting(true);

    try {
      let mediaUrl: string | null = null;
      let mediaMimeType: string | null = null;
      let mediaSizeBytes: number | null = null;

      if (selectedImage) {
        mediaUrl = await uploadFile(selectedImage);
        mediaMimeType = selectedImage.type;
        mediaSizeBytes = selectedImage.size;
      } else if (recordedAudio) {
        mediaUrl = await uploadFile(recordedAudio);
        mediaMimeType = recordedAudio.type || "audio/webm";
        mediaSizeBytes = recordedAudio.size;
      }

      const response = await fetch(`/api/messages/${threadId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          mediaUrl,
          mediaMimeType,
          mediaSizeBytes,
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
      clearRecordedAudio();
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

  return (
    <form id="dm-composer-anchor" onSubmit={handleSubmit} style={{ display: "grid", gap: "6px", margin: 0 }}>
      {replyTarget ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(2,6,23,0.35)",
            borderRadius: "10px",
            padding: "6px 8px",
            display: "flex",
            alignItems: "start",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "11px", color: "#93c5fd", fontWeight: 700 }}>
              {t.replyingTo} {replyTarget.senderDisplayName || t.me}
            </div>
            <div
              style={{
                fontSize: "12px",
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
              width: "22px",
              height: "22px",
              borderRadius: "999px",
              lineHeight: 1,
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
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
          onInput={autoResizeTextarea}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={t.placeholder}
          disabled={isSubmitting || isBlocked}
          enterKeyHint="enter"
          style={{
            width: "100%",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(15,23,42,0.32)",
            paddingTop: "3px",
            paddingBottom: "3px",
            paddingLeft: sendOnLeft ? "150px" : "10px",
            paddingRight: sendOnLeft ? "10px" : "150px",
            resize: "none",
            minHeight: `${SINGLE_LINE_HEIGHT}px`,
            maxHeight: "160px",
            overflowY: "auto",
            lineHeight: "20px",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "2px",
            left: sendOnLeft ? "5px" : "auto",
            right: sendOnLeft ? "auto" : "5px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <button
            type="button"
            onClick={openFilePicker}
            disabled={isSubmitting || isBlocked || isRecording}
            aria-label={t.attachImage}
            title={t.attachImage}
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "7px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(15,23,42,0.75)",
              color: "#e2e8f0",
              fontSize: "16px",
              lineHeight: 1,
              cursor: isSubmitting || isBlocked || isRecording ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            +
          </button>

          <button
            type="button"
            onClick={isRecording ? stopRecording : () => void startRecording()}
            disabled={isSubmitting || isBlocked}
            title={isRecording ? t.stopRecord : t.startRecord}
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "7px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: isRecording ? "rgba(239,68,68,0.25)" : "rgba(15,23,42,0.75)",
              color: "#e2e8f0",
              fontSize: "11px",
              lineHeight: 1,
              cursor: isSubmitting || isBlocked ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            {isRecording ? "■" : "🎤"}
          </button>

          <button
            type="submit"
            disabled={isSubmitting || isBlocked}
            aria-label={t.send}
            title={t.send}
            style={{
              border: "1px solid rgba(56,189,248,0.45)",
              background: "rgba(14,165,233,0.2)",
              color: "#e0f2fe",
              borderRadius: "8px",
              padding: "3px 8px",
              fontWeight: 700,
              cursor: isSubmitting || isBlocked ? "not-allowed" : "pointer",
              minWidth: "46px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontSize: "12px",
            }}
          >
            {isSubmitting ? t.sending : t.send}
          </button>
        </div>
      </div>

      {isRecording ? (
        <p style={{ margin: 0, color: "#fda4af", fontSize: "12px" }}>{t.recording}</p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        disabled={isSubmitting || isBlocked}
        style={{ display: "none" }}
      />

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

      {recordedAudioUrl ? (
        <div style={{ display: "grid", gap: "8px" }}>
          <audio controls src={recordedAudioUrl} style={{ width: "100%" }} />
          <button
            type="button"
            className="btn small"
            onClick={clearRecordedAudio}
            disabled={isSubmitting || isBlocked}
            style={{ width: "fit-content" }}
          >
            {t.removeAudio}
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
