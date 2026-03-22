"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminCategoryEditFormProps {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    sortOrder: number;
  };
}

export function AdminCategoryEditForm({
  category,
}: AdminCategoryEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [description, setDescription] = useState(category.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        name,
        slug,
        description: description || null,
        sortOrder: Number(sortOrder),
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر تحديث التصنيف.");
      return;
    }

    startTransition(() => {
      router.push("/admin/categories");
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
          placeholder="اسم التصنيف"
          required
        />

        <input
          className="search-input"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="slug"
          required
        />

        <textarea
          className="search-input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="الوصف"
          rows={5}
        />

        <input
          className="search-input"
          type="number"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          placeholder="الترتيب"
          min="0"
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
