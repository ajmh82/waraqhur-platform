"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AdminSourceCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("NITTER");
  const [url, setUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [categoryId, setCategoryId] = useState("cat_news_001");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/sources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        categoryId,
        name,
        slug,
        type,
        url: url || null,
        handle: handle || null,
        config: {},
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر إنشاء المصدر.");
      return;
    }

    startTransition(() => {
      router.push("/admin/sources");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="state-card">
      <h2>إنشاء مصدر جديد</h2>
      <p>أضف مصدرًا جديدًا إلى النظام، بما في ذلك مصادر NITTER وRSS والمصادر اليدوية.</p>

      <div style={{ display: "grid", gap: "12px", marginTop: "18px" }}>
        <input
          className="search-input"
          placeholder="الاسم"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <input
          className="search-input"
          placeholder="slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
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
        <input
          className="search-input"
          placeholder="الرابط"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <input
          className="search-input"
          placeholder="المعرف أو الحساب"
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
        />
        <input
          className="search-input"
          placeholder="categoryId"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          required
        />
      </div>

      {error ? (
        <p style={{ color: "#ff7b7b", marginTop: "14px", marginBottom: 0 }}>
          {error}
        </p>
      ) : null}

      <div style={{ marginTop: "18px" }}>
        <button type="submit" className="btn primary" disabled={isPending}>
          {isPending ? "جارٍ الإنشاء..." : "إنشاء المصدر"}
        </button>
      </div>
    </form>
  );
}
