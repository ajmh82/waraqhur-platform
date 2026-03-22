"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminSourcePostEditFormProps {
  sourceId: string;
  post: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string | null;
    visibility: string;
    status: string;
  };
}

export function AdminSourcePostEditForm({
  sourceId,
  post,
}: AdminSourcePostEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [excerpt, setExcerpt] = useState(post.excerpt ?? "");
  const [content, setContent] = useState(post.content ?? "");
  const [visibility, setVisibility] = useState(post.visibility);
  const [status, setStatus] = useState(post.status);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        title,
        slug,
        excerpt: excerpt || null,
        content: content || null,
        visibility,
        status,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر تحديث المنشور.");
      return;
    }

    startTransition(() => {
      router.push(`/admin/sources/${sourceId}`);
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
          required
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
          placeholder="محتوى المنشور"
          rows={10}
        />

        <select
          className="search-input"
          value={visibility}
          onChange={(event) => setVisibility(event.target.value)}
        >
          <option value="PRIVATE">PRIVATE</option>
          <option value="PUBLIC">PUBLIC</option>
          <option value="UNLISTED">UNLISTED</option>
        </select>

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
      </div>

      {error ? (
        <p style={{ color: "#ff7b7b", marginTop: "14px", marginBottom: 0 }}>
          {error}
        </p>
      ) : null}

      <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button type="submit" className="btn primary" disabled={isPending}>
          {isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
        </button>
      </div>
    </form>
  );
}
