"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface CategoriesResponse {
  categories: CategoryOption[];
}

interface AdminSourceEditFormProps {
  source: {
    id: string;
    name: string;
    slug: string;
    type: string;
    url: string | null;
    handle: string | null;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  };
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

function getValidationMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "تعذر تحديث المصدر.";
  }

  const payloadRecord = payload as {
    error?: {
      message?: string;
      details?: {
        fieldErrors?: Record<string, string[] | undefined>;
      };
    };
  };

  const fieldErrors = payloadRecord.error?.details?.fieldErrors;

  if (!fieldErrors) {
    return payloadRecord.error?.message ?? "تعذر تحديث المصدر.";
  }

  const messages = Object.values(fieldErrors)
    .flat()
    .filter(Boolean)
    .join(" | ");

  return messages || payloadRecord.error?.message || "تعذر تحديث المصدر.";
}

export function AdminSourceEditForm({ source }: AdminSourceEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(source.name);
  const [slug, setSlug] = useState(source.slug);
  const [type, setType] = useState(source.type);
  const [url, setUrl] = useState(source.url ?? "");
  const [handle, setHandle] = useState(source.handle ?? "");
  const [categoryId, setCategoryId] = useState(source.category.id);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await fetch("/api/categories", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error?.message ?? "Unable to load categories.");
        }

        const data = payload.data as CategoriesResponse;

        if (!cancelled) {
          setCategories(data.categories);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load categories."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCategories(false);
        }
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedSlug = normalizeSlug(slug);
    const trimmedUrl = url.trim();
    const trimmedHandle = handle.trim();

    const response = await fetch(`/api/sources/${source.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        categoryId,
        name,
        slug: normalizedSlug,
        type,
        url: trimmedUrl ? trimmedUrl : null,
        handle: trimmedHandle ? trimmedHandle : null,
        config: null,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(getValidationMessage(payload));
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
          placeholder="اسم المصدر"
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
          <option value="RSS">RSS</option>
          <option value="WEBSITE">WEBSITE</option>
          <option value="TWITTER">TWITTER</option>
          <option value="TELEGRAM">TELEGRAM</option>
          <option value="YOUTUBE">YOUTUBE</option>
          <option value="MANUAL">MANUAL</option>
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
          placeholder="handle"
        />

        <select
          className="search-input"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          disabled={isLoadingCategories || categories.length === 0}
          required
        >
          {isLoadingCategories ? (
            <option value="">جارٍ تحميل التصنيفات...</option>
          ) : categories.length === 0 ? (
            <option value="">لا توجد تصنيفات متاحة</option>
          ) : (
            categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.slug})
              </option>
            ))
          )}
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
        <button
          type="submit"
          className="btn primary"
          disabled={isPending || isLoadingCategories || categories.length === 0}
        >
          {isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
        </button>
      </div>
    </form>
  );
}
