import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
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
  type: string;
  status: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface AdminCategorySourcesPageResult {
  category: AdminCategoryRecord | null;
  sources: AdminSourceRecord[];
  error: string | null;
}

async function loadAdminCategorySourcesPageData(
  categoryId: string
): Promise<AdminCategorySourcesPageResult> {
  try {
    const [categoriesData, sourcesData] = await Promise.all([
      dashboardApiGet<{ categories: AdminCategoryRecord[] }>("/api/categories"),
      dashboardApiGet<{ sources: AdminSourceRecord[] }>("/api/sources"),
    ]);

    const category =
      categoriesData.categories.find((item) => item.id === categoryId) ?? null;

    if (!category) {
      return {
        category: null,
        sources: [],
        error: null,
      };
    }

    const sources = sourcesData.sources.filter(
      (source) => source.category.id === category.id
    );

    return {
      category,
      sources,
      error: null,
    };
  } catch (error) {
    return {
      category: null,
      sources: [],
      error:
        error instanceof Error ? error.message : "تعذر تحميل مصادر التصنيف.",
    };
  }
}

export default async function AdminCategorySourcesPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const { category, sources, error } =
    await loadAdminCategorySourcesPageData(categoryId);

  if (error) {
    return <ErrorState title="تعذر تحميل مصادر التصنيف" description={error} />;
  }

  if (!category) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`مصادر التصنيف: ${category.name}`}
        description="عرض جميع المصادر المرتبطة بهذا التصنيف."
      />

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={`/admin/categories/${category.id}`} className="btn small">
          العودة إلى تفاصيل التصنيف
        </Link>
      </div>

      {sources.length === 0 ? (
        <EmptyState
          title="لا توجد مصادر"
          description="لا توجد مصادر مرتبطة بهذا التصنيف حتى الآن."
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>Slug</th>
                <th>النوع</th>
                <th>الحالة</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  <td>{source.name}</td>
                  <td>{source.slug}</td>
                  <td>{source.type}</td>
                  <td>{source.status}</td>
                  <td>
                    <Link href={`/admin/sources/${source.id}`} className="btn small">
                      Open Source
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
