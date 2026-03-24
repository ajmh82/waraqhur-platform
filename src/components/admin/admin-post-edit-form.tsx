"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminPostEditFormProps {
  post: {
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
    content: string;
    coverImageUrl: string | null;
    status: string;
    visibility: string;
  };
}

interface ValidationErrorPayload {
  success?: boolean;
  error?: {
    message?: string;
    details?: {
      fieldErrors?: Record<string, string[] | undefined>;
    };
  };
}

function getValidationMessage(payload: ValidationErrorPayload | null) {
  const fieldErrors = payload?.error?.details?.fieldErrors;

  if (!fieldErrors || typeof fieldErrors !== "object") {
    return payload?.error?.message ?? "تعذر تحديث المنشور.";
  }

  const messages = Object.values(fieldErrors)
    .flat()
    .filter(Boolean)
    .join(" | ");

  return messages || payload?.error?.message || "تعذر تحديث المنشور.";
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .replace(/-+/g, "-");
}

export function AdminPostEditForm({ post }: AdminPostEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug ?? "");
  const [excerpt, setExcerpt] = useState(post.excerpt ?? "");
  const [content, setContent] = useState(post.content);
  const [coverImageUrl, setCoverImageUrl] = useState(post.coverImageUrl ?? "");
  const [status, setStatus] = useState(post.status);
  const [visibility, setVisibility] = useState(post.visibility);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedSlug = normalizeSlug(slug);
    const trimmedExcerpt = excerpt.trim();
    const trimmedCoverImageUrl = coverImageUrl.trim();

    const body: Record<string, unknown> = {
      title,
      excerpt: trimmedExcerpt ? trimmedExcerpt : null,
      content,
      status,
      visibility,
      coverImageUrl: trimmedCoverImageUrl ? trimmedCoverImageUrl : null,
    };

    if (normalizedSlug) {
      body.slug = normalizedSlug;
    }

    const response = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => null)) as ValidationErrorPayload | null;

    if (!response.ok || !payload?.success) {
      setError(getValidationMessage(payload));
      return;
    }

    startTransition(() => {
      router.push(`/admin/posts/${post.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="state-card">
      <div style={{ display: "grid", gap: "12px" }}>
        <input
          className="search-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="عنوان المنشور"
          required
        />

        <input
          className="search-input"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="slug"
        />

        <input
          className="search-input"
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          placeholder="المقتطف"
        />

        <textarea
          className="search-input"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="المحتوى"
          rows={12}
          required
        />

        <input
          className="search-input"
          value={coverImageUrl}
          onChange={(event) => setCoverImageUrl(event.target.value)}
          placeholder="رابط الصورة"
        />

        <select
          className="search-input"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ARCHIVED">ARCHIVED</option>
          <option value="DELETED">DELETED</option>
        </select>

        <select
          className="search-input"
          value={visibility}
          onChange={(event) => setVisibility(event.target.value)}
        >
          <option value="PUBLIC">PUBLIC</option>
          <option value="PRIVATE">PRIVATE</option>
          <option value="UNLISTED">UNLISTED</option>
        </select>
      </div>

      {error ? (
        <p style={{ color: "#ff7b7b", marginTop: "14px", marginBottom: 0 }}>
          {error}
        </p>
      ) : null}

      <div
        style={{
          marginTop: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button type="submit" className="btn primary" disabled={isPending}>
          {isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
        </button>
      </div>
    </form>
  );
}
