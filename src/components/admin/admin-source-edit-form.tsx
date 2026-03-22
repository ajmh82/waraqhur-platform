"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminSourceEditFormProps {
  source: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    url: string | null;
    handle: string | null;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export function AdminSourceEditForm({ source }: AdminSourceEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(source.name);
  const [slug, setSlug] = useState(source.slug);
  const [type, setType] = useState(source.type);
  const [status, setStatus] = useState(source.status);
  const [url, setUrl] = useState(source.url ?? "");
  const [handle, setHandle] = useState(source.handle ?? "");
  const [categoryId, setCategoryId] = useState(source.category.id);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch(`/api/sources/${source.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        name,
        slug,
        type,
        status,
        url: url || null,
        handle: handle || null,
        categoryId,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر تحديث المصدر.");
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
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="الاسم"
          required
        />

        <input
          className="search-input"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="slug"
          required
        />

        <select
          className="search-input"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="NITTER">NITTER</option>
          <option value="RSS">RSS</option>
          <option value="WEBSITE">WEBSITE</option>
          <option value="TWITTER">TWITTER</option>
          <option value="TELEGRAM">TELEGRAM</option>
          <option value="YOUTUBE">YOUTUBE</option>
          <option value="MANUAL">MANUAL</option>
        </select>

        <select
          className="search-input"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>

        <input
          className="search-input"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="الرابط"
        />

        <input
          className="search-input"
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          placeholder="المعرف"
        />

        <input
          className="search-input"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          placeholder="categoryId"
          required
        />
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
