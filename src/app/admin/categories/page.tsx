import Link from "next/link";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminCategoriesResponse {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface AdminCategoriesPageResult {
  data: AdminCategoriesResponse | null;
  error: string | null;
}

async function loadAdminCategoriesPageData(): Promise<AdminCategoriesPageResult> {
  try {
    const data = await dashboardApiGet<AdminCategoriesResponse>("/api/categories");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل التصنيفات.",
    };
  }
}

export default async function AdminCategoriesPage() {
  const { data, error } = await loadAdminCategoriesPageData();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل التصنيفات"
        description={error ?? "تعذر تحميل التصنيفات."}
      />
    );
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="إدارة التصنيفات"
        description="عرض جميع التصنيفات وإدارتها من داخل لوحة الإدارة."
      />

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href="/admin/categories/new" className="btn primary">
          تصنيف جديد
        </Link>
      </div>

      {data.categories.length === 0 ? (
        <EmptyState
          title="لا توجد تصنيفات"
          description="لا توجد أي تصنيفات داخل النظام حتى الآن."
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>Slug</th>
                <th>الحالة</th>
                <th>الترتيب</th>
                <th>الوصف</th>
                <th>تاريخ الإنشاء</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{category.slug}</td>
                  <td>{category.status}</td>
                  <td>{category.sortOrder}</td>
                  <td>{category.description ?? "-"}</td>
                  <td>{new Date(category.createdAt).toLocaleString("ar-BH")}</td>
                  <td>
                    <Link href={`/admin/categories/${category.id}/edit`} className="btn small">
                      Edit Category
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
