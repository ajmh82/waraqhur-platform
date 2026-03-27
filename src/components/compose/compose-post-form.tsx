"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface ComposePostFormProps {
  username: string;
}

const MAX_TWEET_LENGTH = 280;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;

export function ComposePostForm({ username }: ComposePostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remainingCharacters = MAX_TWEET_LENGTH - content.length;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);

    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type.startsWith("image/")) {
      if (file.size > MAX_IMAGE_SIZE) {
        setError("حجم الصورة يجب ألا يتجاوز 5MB.");
        event.target.value = "";
        return;
      }

      setSelectedFile(file);
      return;
    }

    if (file.type.startsWith("video/")) {
      if (file.size > MAX_VIDEO_SIZE) {
        setError("حجم الفيديو يجب ألا يتجاوز 20MB.");
        event.target.value = "";
        return;
      }

      setSelectedFile(file);
      return;
    }

    setError("الملف يجب أن يكون صورة أو فيديو.");
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
      throw new Error(payload?.error?.message ?? "تعذر رفع الملف.");
    }

    return {
      mediaUrl: payload.data.url as string,
      mediaType: payload.data.mediaType as "image" | "video",
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError("نص التغريدة مطلوب.");
      return;
    }

    if (trimmedContent.length > MAX_TWEET_LENGTH) {
      setError("عدد الأحرف تجاوز الحد المسموح.");
      return;
    }

    try {
      const uploaded = await uploadSelectedFile();

      const response = await fetch("/api/tweets", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: trimmedContent,
          mediaUrl: uploaded.mediaUrl,
          mediaType: uploaded.mediaType,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? "تعذر نشر التغريدة.");
        return;
      }

      startTransition(() => {
        router.push(
          payload?.data?.post?.slug
            ? `/posts/${payload.data.post.slug}`
            : "/timeline"
        );
        router.refresh();
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "تعذر نشر التغريدة."
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
        gap: "14px",
      }}
    >
      <label style={{ display: "grid", gap: "6px" }}>
        <span>التغريدة</span>
        <textarea
          value={content}
          onChange={(event) =>
            setContent(event.target.value.slice(0, MAX_TWEET_LENGTH))
          }
          rows={6}
          maxLength={MAX_TWEET_LENGTH}
          required
          placeholder={`ماذا يحدث الآن يا @${username}؟`}
        />
      </label>

      <label style={{ display: "grid", gap: "6px" }}>
        <span>صورة أو فيديو</span>
        <input
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
        />
      </label>

      <div
        style={{
          display: "flex",
          gap: "14px",
          flexWrap: "wrap",
          color: remainingCharacters < 20 ? "var(--danger)" : "var(--muted)",
          fontSize: "14px",
        }}
      >
        <span>{content.length}/{MAX_TWEET_LENGTH}</span>
        <span>المتبقي: {remainingCharacters}</span>
      </div>

      {error ? (
        <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
      ) : null}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button type="submit" className="btn-action" disabled={isPending}>
          {isPending ? "جارٍ النشر..." : "نشر التغريدة"}
        </button>
      </div>
    </form>
  );
}
