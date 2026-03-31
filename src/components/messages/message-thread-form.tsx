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
    startRecord: "تسجيل صوتي",
    stopRecord: "إيقاف التسجيل",
    recording: "جارٍ التسجيل...",
    recordTooLong: "تم إيقاف التسجيل — الحد الأقصى دقيقة واحدة",
    noMicHttp: "التسجيل المباشر يتطلب HTTPS. اختر ملف صوتي من جهازك بدلاً من ذلك.",
    noMic: "الميكروفون غير متاح. تأكد من السماح بالوصول للميكروفون في إعدادات المتصفح.",
    removeAudio: "حذف الصوت",
    pickAudio: "اختيار ملف صوتي",
    audioTooLong: "مدة الصوت يجب ألا تتجاوز دقيقة واحدة.",
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
    startRecord: "Voice record",
    stopRecord: "Stop recording",
    recording: "Recording...",
    recordTooLong: "Recording stopped — max 1 minute",
    noMicHttp: "Live recording requires HTTPS. Pick an audio file from your device instead.",
    noMic: "Microphone unavailable. Make sure you allow microphone access in browser settings.",
    removeAudio: "Remove audio",
    pickAudio: "Pick audio file",
    audioTooLong: "Audio must not exceed 1 minute.",
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

function isSecureContext() {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext) return true;
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function MessageThreadForm({
  threadId,
  locale = "ar",
  isBlocked = false,
}: MessageThreadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);

  const [body, setBody] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecondsLeft, setRecordSecondsLeft] = useState(MAX_AUDIO_SECONDS);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = copy[locale];

  const sendOnLeft = locale === "ar";
  const SINGLE_LINE_HEIGHT = 24;

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
    const next = Math.min(el.scrollHeight, 150);
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
    if (audioInputRef.current) {
      audioInputRef.current.value = "";
    }
  }

  function clearReplyTarget() {
    setReplyTarget(null);
  }

  function stopRecordingIfNeeded() {
    if (recordTimerRef.current) {
      window.clearTimeout(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  function validateAudioDuration(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = "metadata";

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        if (audio.duration > MAX_AUDIO_SECONDS) {
          resolve(false);
        } else {
          resolve(true);
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audio.src);
        // If we can't read metadata, allow it (server can validate)
        resolve(true);
      };

      audio.src = URL.createObjectURL(file);
    });
  }

  async function handleMicButton() {
    setError(null);
    if (isSubmitting || isBlocked || isRecording) return;

    // If not secure context (HTTP), go straight to file picker
    if (!isSecureContext()) {
      audioInputRef.current?.click();
      return;
    }

    // If browser doesn't support getUserMedia, go to file picker
    if (!navigator.mediaDevices?.getUserMedia) {
      audioInputRef.current?.click();
      return;
    }

    // Try live recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine best supported mime type
      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        }
      }

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

        if (countdownRef.current) {
          window.clearInterval(countdownRef.current);
          countdownRef.current = null;
        }

        const blob = new Blob(recordChunksRef.current, { type: mimeType });
        const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `dm-audio-${Date.now()}.${ext}`, { type: mimeType });

        clearRecordedAudio();
        setRecordedAudio(file);
        setRecordedAudioUrl(URL.createObjectURL(file));
        setIsRecording(false);
        setRecordSecondsLeft(MAX_AUDIO_SECONDS);
      };

      recorder.start();
      setIsRecording(true);
      setRecordSecondsLeft(MAX_AUDIO_SECONDS);

      // Countdown timer (visual)
      countdownRef.current = window.setInterval(() => {
        setRecordSecondsLeft((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);

      // Hard stop at MAX_AUDIO_SECONDS
      recordTimerRef.current = window.setTimeout(() => {
        setError(t.recordTooLong);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      }, MAX_AUDIO_SECONDS * 1000);
    } catch {
      // Permission denied or any other error — fallback to file picker
      audioInputRef.current?.click();
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

  async function handleAudioInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    // Validate duration
    const isValid = await validateAudioDuration(file);
    if (!isValid) {
      setError(t.audioTooLong);
      event.target.value = "";
      return;
    }

    clearRecordedAudio();
    setRecordedAudio(file);
    setRecordedAudioUrl(URL.createObjectURL(file));
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

  function formatCountdown(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
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
          disabled={isSubmitting || isBlocked || isRecording}
          enterKeyHint="enter"
          style={{
            width: "100%",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(15,23,42,0.32)",
            paddingTop: "2px",
            paddingBottom: "2px",
            paddingLeft: sendOnLeft ? "150px" : "10px",
            paddingRight: sendOnLeft ? "10px" : "150px",
            resize: "none",
            minHeight: `${SINGLE_LINE_HEIGHT}px`,
            maxHeight: "150px",
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
            onClick={isRecording ? stopRecording : () => void handleMicButton()}
            disabled={isSubmitting || isBlocked}
            title={isRecording ? t.stopRecord : t.startRecord}
            style={{
              height: "24px",
              borderRadius: "7px",
              border: isRecording ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.2)",
              background: isRecording ? "rgba(239,68,68,0.25)" : "rgba(15,23,42,0.75)",
              color: isRecording ? "#fca5a5" : "#e2e8f0",
              fontSize: "11px",
              lineHeight: 1,
              cursor: isSubmitting || isBlocked ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontWeight: 700,
              padding: isRecording ? "0 8px" : "0",
              width: isRecording ? "auto" : "24px",
              minWidth: isRecording ? "60px" : "24px",
              gap: "4px",
              transition: "all 0.2s ease",
            }}
          >
            {isRecording ? (
              <>
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "2px", background: "#ef4444", animation: "dm-rec-blink 1s infinite" }} />
                <span>{formatCountdown(recordSecondsLeft)}</span>
              </>
            ) : (
              "🎤"
            )}
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
        <p style={{ margin: 0, color: "#fda4af", fontSize: "12px" }}>
          {t.recording} — {formatCountdown(recordSecondsLeft)}
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        disabled={isSubmitting || isBlocked}
        style={{ display: "none" }}
      />

      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioInputChange}
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

      <style>{`
        @keyframes dm-rec-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </form>
  );
}
