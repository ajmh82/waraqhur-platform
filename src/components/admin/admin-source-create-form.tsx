"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

export function AdminSourceCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("NITTER");
  const [url, setUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [lang, setLang] = useState("ar");
  const [timeline, setTimeline] = useState("news");

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const response = await fetch("/api/categories", {
          credentials: "include",
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error?.message ?? "تعذر تحميل التصنيفات.");
        }

        const nextCategories = Array.isArray(payload.data?.categories)
          ? payload.data.categories
          : [];

        if (!isMounted) {
          return;
        }

        setCategories(nextCategories);
        setCategoryId((currentValue) =>
          currentValue || nextCategories[0]?.id || ""
        );
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "تعذر تحميل التصنيفات."
        );
      } finally {
        if (isMounted) {
          setCategoriesLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const config =
      type === "NITTER"
        ? {
            lang,
            timeline,
          }
        : {};

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
        config,
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
      <p>أضف مصدرًا جديدًا إلى النظام، مع اختيار التصنيف الصحيح ونوع المصدر قبل الإنشاء.</p>

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

        <select
          className="search-input"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          required
          disabled={categoriesLoading || categories.length === 0}
        >
          {categories.length === 0 ? (
            <option value="">
              {categoriesLoading ? "جارٍ تحميل التصنيفات..." : "لا توجد تصنيفات متاحة"}
            </option>
          ) : (
            categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.slug})
              </option>
            ))
          )}
        </select>

        {type === "NITTER" ? (
          <>
            <input
              className="search-input"
              placeholder="اللغة داخل config، مثل ar"
              value={lang}
              onChange={(event) => setLang(event.target.value)}
              required
            />

            <input
              className="search-input"
              placeholder="timeline داخل config، مثل news"
              value={timeline}
              onChange={(event) => setTimeline(event.target.value)}
              required
            />
          </>
        ) : null}
      </div>

      {error ? (
        <p style={{ color: "#ff7b7b", marginTop: "14px", marginBottom: 0 }}>
          {error}
        </p>
      ) : null}

      <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          type="submit"
          className="btn primary"
          disabled={isPending || categoriesLoading || categories.length === 0}
        >
          {isPending ? "جارٍ الإنشاء..." : "إنشاء المصدر"}
        </button>
      </div>
    </form>
  );
}
