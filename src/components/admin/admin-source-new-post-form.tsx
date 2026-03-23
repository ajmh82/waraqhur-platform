"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminSourceNewPostFormProps {
  source: {
    id: string;
    name: string;
    slug: string;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export function AdminSourceNewPostForm({
  source,
}: AdminSourceNewPostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [visibility, setVisibility] = useState("PRIVATE");
  const [status, setStatus] = useState("DRAFT");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        title,
        slug,
        excerpt: excerpt || null,
        content,
        coverImageUrl: coverImageUrl || null,
        categoryId: source.category.id,
        sourceId: source.id,
        visibility,
        status,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر إنشاء المنشور.");
      return;
    }

    startTransition(() => {
      router.push(`/admin/sources/${source.id}`);
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
          {isPending ? "جارٍ الإنشاء..." : "إنشاء المنشور"}
        </button>
      </div>
    </form>
  );
}
