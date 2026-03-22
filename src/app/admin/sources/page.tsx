import Link from "next/link";
import { AdminIngestAllSourcesButton } from "@/components/admin/admin-ingest-all-sources-button";
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
    postsCount: number;
    lastIngestedAt: string | null;
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

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const { data, error } = await loadAdminSourcesPageData();
  const params = await searchParams;
  const selectedType = params.type?.trim() || "ALL";
  const selectedStatus = params.status?.trim() || "ALL";

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل المصادر"
        description={error ?? "تعذر تحميل قائمة المصادر."}
      />
    );
  }

  const availableTypes = Array.from(new Set(data.sources.map((source) => source.type)));
  const availableStatuses = Array.from(
    new Set(data.sources.map((source) => source.status))
  );

  const filteredSources = data.sources.filter((source) => {
    const typeMatches = selectedType === "ALL" || source.type === selectedType;
    const statusMatches =
      selectedStatus === "ALL" || source.status === selectedStatus;

    return typeMatches && statusMatches;
  });

  function buildFilterHref(type: string, status: string) {
    const query = new URLSearchParams();

    if (type !== "ALL") {
      query.set("type", type);
    }

    if (status !== "ALL") {
      query.set("status", status);
    }

    const queryString = query.toString();
    return queryString ? `/admin/sources?${queryString}` : "/admin/sources";
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="إدارة المصادر"
        description="هذه الصفحة تعرض جميع المصادر داخل النظام، بما فيها مصادر RSS وNITTER وغيرها، لتكون قاعدة لوحة إدارة المصادر لاحقًا."
      />

      <div
        style={{ marginBottom: "18px", display: "flex", gap: "12px", flexWrap: "wrap" }}
      >
        <Link href="/admin/sources/new" className="btn primary">
          مصدر جديد
        </Link>
        <AdminIngestAllSourcesButton />
      </div>

      <div
        style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        <Link
          href={buildFilterHref("ALL", selectedStatus)}
          className={`btn ${selectedType === "ALL" ? "primary" : "small"}`}
        >
          All Types
        </Link>

        {availableTypes.map((type) => (
          <Link
            key={type}
            href={buildFilterHref(type, selectedStatus)}
            className={`btn ${selectedType === type ? "primary" : "small"}`}
          >
            {type}
          </Link>
        ))}
      </div>

      <div
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        <Link
          href={buildFilterHref(selectedType, "ALL")}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {availableStatuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(selectedType, status)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      {filteredSources.length === 0 ? (
        <EmptyState
          title="لا توجد مصادر مطابقة"
          description="لا توجد مصادر تطابق الفلاتر الحالية."
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
                <th>المنشورات</th>
                <th>آخر ingest</th>
                <th>الرابط</th>
                <th>المعرف</th>
                <th>تاريخ الإنشاء</th>
                <th>Preview</th>
                <th>Ingest</th>
                <th>Open</th>
              </tr>
            </thead>

            <tbody>
              {filteredSources.map((source) => (
                <tr key={source.id}>
                  <td>
                    <div className="admin-table__primary">{source.name}</div>
                    <div className="admin-table__secondary">{source.slug}</div>
                  </td>
                  <td>{source.type}</td>
                  <td>{source.category.name}</td>
                  <td>{source.status}</td>
                  <td>{source.postsCount}</td>
                  <td>
                    {source.lastIngestedAt
                      ? new Date(source.lastIngestedAt).toLocaleString("ar-BH")
                      : "-"}
                  </td>
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
