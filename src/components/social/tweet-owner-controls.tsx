"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface TweetOwnerControlsProps {
  postId: string;
  initialContent: string;
  initialMediaUrl?: string | null;
  initialMediaType?: "image" | "video" | null;
  initialIsPinned?: boolean;
  compact?: boolean;
  locale?: "ar" | "en";
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;

const copy = {
  ar: {
    edit: "تعديل التغريدة",
    editShort: "تعديل",
    cancel: "إلغاء",
    delete: "حذف التغريدة",
    deleteShort: "حذف",
    deleteConfirm: "هل تريد حذف هذه التغريدة؟",
    contentRequired: "نص التغريدة مطلوب.",
    saveFailed: "تعذر تعديل التغريدة.",
    saveLoading: "جارٍ الحفظ...",
    save: "حفظ التعديل",
    mediaLabel: "استبدال أو إضافة صورة/فيديو",
    imageLimit: "حجم الصورة يجب ألا يتجاوز 5MB.",
    videoLimit: "حجم الفيديو يجب ألا يتجاوز 20MB.",
    invalidFile: "الملف يجب أن يكون صورة أو فيديو.",
    uploadFailed: "تعذر رفع الملف.",
    removeMedia: "حذف الوسائط الحالية",
    placeholder: "عدّل نص التغريدة...",
    pin: "تثبيت التغريدة",
    unpin: "إلغاء التثبيت",
    pinShort: "تثبيت",
    unpinShort: "إلغاء التثبيت",
    pinFailed: "تعذر تحديث حالة التثبيت.",
  },
  en: {
    edit: "Edit Post",
    editShort: "Edit",
    cancel: "Cancel",
    delete: "Delete Post",
    deleteShort: "Delete",
    deleteConfirm: "Do you want to delete this post?",
    contentRequired: "Post text is required.",
    saveFailed: "Failed to update post.",
    saveLoading: "Saving...",
    save: "Save Changes",
    mediaLabel: "Replace or add image/video",
    imageLimit: "Image size must not exceed 5MB.",
    videoLimit: "Video size must not exceed 20MB.",
    invalidFile: "The file must be an image or video.",
    uploadFailed: "Failed to upload file.",
    removeMedia: "Remove current media",
    placeholder: "Edit your post text...",
    pin: "Pin Post",
    unpin: "Unpin Post",
    pinShort: "Pin",
    unpinShort: "Unpin",
    pinFailed: "Failed to update pin state.",
  },
} as const;

export function TweetOwnerControls({
  postId,
  initialContent,
  initialMediaUrl = null,
  initialMediaType = null,
  initialIsPinned = false,
  compact = false,
  locale = "ar",
}: TweetOwnerControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialMediaUrl);
  const [previewType, setPreviewType] = useState<"image" | "video" | null>(initialMediaType);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [isPinned, setIsPinned] = useState(initialIsPinned);
  const [error, setError] = useState<string | null>(null);
  const t = copy[locale];

  useEffect(() => {
    if (!selectedFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setPreviewType(selectedFile.type.startsWith("video/") ? "video" : "image");

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    setIsPinned(initialIsPinned);
  }, [initialIsPinned]);

  function resetEditor() {
    setContent(initialContent);
    setSelectedFile(null);
    setPreviewUrl(initialMediaUrl);
    setPreviewType(initialMediaType);
    setRemoveMedia(false);
    setError(null);
    setIsEditing(false);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);

    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type.startsWith("image/")) {
      if (file.size > MAX_IMAGE_SIZE) {
        setError(t.imageLimit);
        event.target.value = "";
        return;
      }

      setSelectedFile(file);
      setRemoveMedia(false);
      return;
    }

    if (file.type.startsWith("video/")) {
      if (file.size > MAX_VIDEO_SIZE) {
        setError(t.videoLimit);
        event.target.value = "";
        return;
      }

      setSelectedFile(file);
      setRemoveMedia(false);
      return;
    }

    setError(t.invalidFile);
    event.target.value = "";
  }

  async function uploadSelectedFile() {
    if (!selectedFile) {
      return {
        mediaUrl: null,
        mediaType: null,
      };
    }

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

  async function handleSave() {
    setError(null);

    const trimmed = content.trim();

    if (!trimmed) {
      setError(t.contentRequired);
      return;
    }

    try {
      const uploaded = await uploadSelectedFile();

      const response = await fetch(`/api/posts/${postId}/owner`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: trimmed,
          mediaUrl: uploaded.mediaUrl,
          mediaType: uploaded.mediaType,
          removeMedia,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.saveFailed);
        return;
      }

      startTransition(() => {
        setIsEditing(false);
        router.refresh();
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t.saveFailed
      );
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(t.deleteConfirm);
    if (!confirmed) return;

    const response = await fetch(`/api/posts/${postId}/owner`, {
      method: "DELETE",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? t.saveFailed);
      return;
    }

    startTransition(() => {
      router.push("/timeline");
      router.refresh();
    });
  }

  async function handleTogglePin() {
    setError(null);

    const nextPinned = !isPinned;
    const method = nextPinned ? "POST" : "DELETE";

    const response = await fetch(`/api/posts/${postId}/pin`, {
      method,
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? t.pinFailed);
      return;
    }

    setIsPinned(nextPinned);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn small"
          onClick={() => {
            if (isEditing) {
              resetEditor();
              return;
            }
            setIsEditing(true);
          }}
          disabled={isPending}
        >
          {isEditing ? t.cancel : compact ? t.editShort : t.edit}
        </button>

        <button
          type="button"
          className="btn small"
          onClick={handleTogglePin}
          disabled={isPending}
          style={{
            borderColor: "rgba(45,212,191,0.35)",
            color: "#99f6e4",
          }}
        >
          {compact
            ? isPinned
              ? t.unpinShort
              : t.pinShort
            : isPinned
              ? t.unpin
              : t.pin}
        </button>

        <button
          type="button"
          className="btn small"
          onClick={handleDelete}
          disabled={isPending}
          style={{
            borderColor: "rgba(248,113,113,0.3)",
            color: "#fecaca",
          }}
        >
          {compact ? t.deleteShort : t.delete}
        </button>
      </div>

      {isEditing ? (
        <div
          style={{
            display: "grid",
            gap: "10px",
            padding: "12px",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(15,23,42,0.95)",
            position: "fixed",
            inset: "0",
            zIndex: 200,
            overflowY: "auto",
            maxHeight: "100dvh",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: "16px" }}>{t.edit}</strong>
            <button
              type="button"
              onClick={resetEditor}
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "#e7e9ea",
                width: "32px",
                height: "32px",
                borderRadius: "999px",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {"×"}
            </button>
          </div>

          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, 280))}
            rows={compact ? 4 : 5}
            maxLength={280}
            placeholder={t.placeholder}
            style={{
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(15,23,42,0.32)",
              padding: "12px 14px",
            }}
          />

          <div style={{ display: "grid", gap: "8px" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "14px", color: "var(--muted)" }}>
                {t.mediaLabel}
              </span>
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
              />
            </label>

            {previewUrl && !removeMedia ? (
              <div
                style={{
                  overflow: "hidden",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {previewType === "image" ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: "260px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <video
                    src={previewUrl}
                    controls
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: "320px",
                      background: "#000",
                    }}
                  />
                )}
              </div>
            ) : null}

            {(previewUrl || initialMediaUrl) ? (
              <button
                type="button"
                className="btn small"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setPreviewType(null);
                  setRemoveMedia(true);
                }}
                style={{
                  width: "fit-content",
                  borderColor: "rgba(248,113,113,0.3)",
                  color: "#fecaca",
                }}
              >
                {t.removeMedia}
              </button>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--muted)", fontSize: "13px" }}>
              {content.length}/280
            </span>

            <button
              type="button"
              className="btn-action"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? t.saveLoading : t.save}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
      ) : null}
    </div>
  );
}
