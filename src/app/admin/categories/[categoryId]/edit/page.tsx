import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminCategoryEditForm } from "@/components/admin/admin-category-edit-form";
import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminCategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminCategoryEditPageResult {
  category: AdminCategoryRecord | null;
  error: string | null;
}

async function loadAdminCategoryEditPageData(
  categoryId: string
): Promise<AdminCategoryEditPageResult> {
  try {
    const data = await dashboardApiGet<{
      categories: AdminCategoryRecord[];
    }>("/api/categories");

    const category = data.categories.find((item) => item.id === categoryId) ?? null;

    return {
      category,
      error: null,
    };
  } catch (error) {
    return {
      category: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل بيانات التصنيف.",
    };
  }
}

export default async function AdminCategoryEditPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const { category, error } = await loadAdminCategoryEditPageData(categoryId);

  if (error) {
    return <ErrorState title="تعذر تحميل التصنيف" description={error} />;
  }

  if (!category) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`تعديل التصنيف: ${category.name}`}
        description="تعديل التصنيف من داخل لوحة الإدارة."
      />

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href="/admin/categories" className="btn small">
          العودة إلى التصنيفات
        </Link>
      </div>

      <AdminCategoryEditForm category={category} />
    </section>
  );
}
