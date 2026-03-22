import Link from "next/link";
import { notFound } from "next/navigation";
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

interface AdminSourceRecord {
  id: string;
  name: string;
  slug: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface AdminPostRecord {
  id: string;
  title: string;
  slug: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface AdminCategoryDetailsPageResult {
  category: AdminCategoryRecord | null;
  sourcesCount: number;
  postsCount: number;
  error: string | null;
}

async function loadAdminCategoryDetailsPageData(
  categoryId: string
): Promise<AdminCategoryDetailsPageResult> {
  try {
    const [categoriesData, sourcesData, postsData] = await Promise.all([
      dashboardApiGet<{ categories: AdminCategoryRecord[] }>("/api/categories"),
      dashboardApiGet<{ sources: AdminSourceRecord[] }>("/api/sources"),
      dashboardApiGet<{ posts: AdminPostRecord[] }>("/api/posts"),
    ]);

    const category =
      categoriesData.categories.find((item) => item.id === categoryId) ?? null;

    if (!category) {
      return {
        category: null,
        sourcesCount: 0,
        postsCount: 0,
        error: null,
      };
    }

    const sourcesCount = sourcesData.sources.filter(
      (source) => source.category.id === category.id
    ).length;

    const postsCount = postsData.posts.filter(
      (post) => post.category?.id === category.id
    ).length;

    return {
      category,
      sourcesCount,
      postsCount,
      error: null,
    };
  } catch (error) {
    return {
      category: null,
      sourcesCount: 0,
      postsCount: 0,
      error:
        error instanceof Error ? error.message : "تعذر تحميل بيانات التصنيف.",
    };
  }
}

export default async function AdminCategoryDetailsPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const { category, sourcesCount, postsCount, error } =
    await loadAdminCategoryDetailsPageData(categoryId);

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
        title={category.name}
        description="صفحة تفاصيل التصنيف من داخل لوحة الإدارة."
      />

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href="/admin/categories" className="btn small">
          العودة إلى التصنيفات
        </Link>
        <Link href={`/admin/categories/${category.id}/edit`} className="btn small">
          Edit Category
        </Link>
      </div>

      <div className="state-card">
        <div style={{ display: "grid", gap: "12px" }}>
          <p><strong>الاسم:</strong> {category.name}</p>
          <p><strong>Slug:</strong> {category.slug}</p>
          <p><strong>الحالة:</strong> {category.status}</p>
          <p><strong>الترتيب:</strong> {category.sortOrder}</p>
          <p><strong>الوصف:</strong> {category.description ?? "-"}</p>
          <p><strong>عدد المصادر:</strong> {sourcesCount}</p>
          <p><strong>عدد المنشورات:</strong> {postsCount}</p>
          <p><strong>تاريخ الإنشاء:</strong> {new Date(category.createdAt).toLocaleString("ar-BH")}</p>
          <p><strong>آخر تحديث:</strong> {new Date(category.updatedAt).toLocaleString("ar-BH")}</p>
        </div>
      </div>
    </section>
  );
}
