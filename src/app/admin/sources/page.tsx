import Link from "next/link";
import { AdminSourceIngestButton } from "@/components/admin/admin-source-ingest-button";
import { AdminSourcePreviewButton } from "@/components/admin/admin-source-preview-button";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminSourcesResponse {
  sources: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    url: string | null;
    handle: string | null;
    createdAt: string;
    updatedAt: string;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

interface AdminSourcesPageResult {
  data: AdminSourcesResponse | null;
  error: string | null;
}

async function loadAdminSourcesPageData(): Promise<AdminSourcesPageResult> {
  try {
    const data = await dashboardApiGet<AdminSourcesResponse>("/api/sources");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "تعذر تحميل قائمة المصادر.",
    };
  }
}

export default async function AdminSourcesPage() {
  const { data, error } = await loadAdminSourcesPageData();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل المصادر"
        description={error ?? "تعذر تحميل قائمة المصادر."}
      />
    );
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="إدارة المصادر"
        description="هذه الصفحة تعرض جميع المصادر داخل النظام، بما فيها مصادر RSS وNITTER وغيرها، لتكون قاعدة لوحة إدارة المصادر لاحقًا."
      />

      <div style={{ marginBottom: "18px" }}>
        <Link href="/admin/sources/new" className="btn primary">
          مصدر جديد
        </Link>
      </div>

      {data.sources.length === 0 ? (
        <EmptyState
          title="لا توجد مصادر بعد"
          description="لم يتم إنشاء أي مصدر داخل النظام حتى الآن."
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>النوع</th>
                <th>التصنيف</th>
                <th>الحالة</th>
                <th>الرابط</th>
                <th>المعرف</th>
                <th>تاريخ الإنشاء</th>
                <th>Preview</th>
                <th>Ingest</th>
                <th>Open</th>
              </tr>
            </thead>

            <tbody>
              {data.sources.map((source) => (
                <tr key={source.id}>
                  <td>
                    <div className="admin-table__primary">{source.name}</div>
                    <div className="admin-table__secondary">{source.slug}</div>
                  </td>
                  <td>{source.type}</td>
                  <td>{source.category.name}</td>
                  <td>{source.status}</td>
                  <td>{source.url ?? "-"}</td>
                  <td>{source.handle ?? "-"}</td>
                  <td>{new Date(source.createdAt).toLocaleString("ar-BH")}</td>
                  <td>
                    <AdminSourcePreviewButton
                      sourceId={source.id}
                      sourceType={source.type}
                    />
                  </td>
                  <td>
                    <AdminSourceIngestButton
                      sourceId={source.id}
                      sourceType={source.type}
                    />
                  </td>
                  <td>
                    <Link href={`/sources/${source.slug}`} className="btn small">
                      Open
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
