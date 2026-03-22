import Link from "next/link";
import { AdminIngestAllSourcesButton } from "@/components/admin/admin-ingest-all-sources-button";
import { AdminSourceArchiveButton } from "@/components/admin/admin-source-archive-button";
import { AdminSourceIngestButton } from "@/components/admin/admin-source-ingest-button";
import { AdminSourcePreviewButton } from "@/components/admin/admin-source-preview-button";
import { AdminSourceRestoreButton } from "@/components/admin/admin-source-restore-button";
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
  searchParams: Promise<{
    type?: string;
    status?: string;
    q?: string;
    populated?: string;
  }>;
}) {
  const { data, error } = await loadAdminSourcesPageData();
  const params = await searchParams;
  const selectedType = params.type?.trim() || "ALL";
  const selectedStatus = params.status?.trim() || "ALL";
  const query = params.q?.trim() || "";
  const populatedOnly = params.populated === "1";

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

  const normalizedQuery = query.toLowerCase();

  const filteredSources = data.sources.filter((source) => {
    const typeMatches = selectedType === "ALL" || source.type === selectedType;
    const statusMatches =
      selectedStatus === "ALL" || source.status === selectedStatus;
    const queryMatches =
      normalizedQuery.length === 0 ||
      source.name.toLowerCase().includes(normalizedQuery) ||
      source.slug.toLowerCase().includes(normalizedQuery) ||
      (source.handle ?? "").toLowerCase().includes(normalizedQuery);
    const populatedMatches = !populatedOnly || source.postsCount > 0;

    return typeMatches && statusMatches && queryMatches && populatedMatches;
  });

  function buildFilterHref(
    type: string,
    status: string,
    nextQuery: string,
    nextPopulatedOnly: boolean
  ) {
    const queryParams = new URLSearchParams();

    if (type !== "ALL") {
      queryParams.set("type", type);
    }

    if (status !== "ALL") {
      queryParams.set("status", status);
    }

    if (nextQuery.trim()) {
      queryParams.set("q", nextQuery.trim());
    }

    if (nextPopulatedOnly) {
      queryParams.set("populated", "1");
    }

    const queryString = queryParams.toString();
    return queryString ? `/admin/sources?${queryString}` : "/admin/sources";
  }

  const totalSources = data.sources.length;
  const activeSources = data.sources.filter((source) => source.status === "ACTIVE").length;
  const nitterSources = data.sources.filter((source) => source.type === "NITTER").length;
  const totalPostsAcrossSources = data.sources.reduce(
    (sum, source) => sum + source.postsCount,
    0
  );

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="إدارة المصادر"
        description="هذه الصفحة تعرض جميع المصادر داخل النظام، بما فيها مصادر RSS وNITTER وغيرها، لتكون قاعدة لوحة إدارة المصادر لاحقًا."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div className="state-card">
          <strong>إجمالي المصادر</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalSources}</p>
        </div>
        <div className="state-card">
          <strong>المصادر النشطة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{activeSources}</p>
        </div>
        <div className="state-card">
          <strong>مصادر NITTER</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{nitterSources}</p>
        </div>
        <div className="state-card">
          <strong>إجمالي المنشورات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalPostsAcrossSources}</p>
        </div>
      </div>

      <div
        style={{ marginBottom: "18px", display: "flex", gap: "12px", flexWrap: "wrap" }}
      >
        <Link href="/admin/sources/new" className="btn primary">
          مصدر جديد
        </Link>
        <AdminIngestAllSourcesButton />
        <Link
          href={buildFilterHref(
            selectedType,
            selectedStatus,
            query,
            !populatedOnly
          )}
          className={`btn ${populatedOnly ? "primary" : "small"}`}
        >
          Has Posts Only
        </Link>
      </div>

      <form
        action="/admin/sources"
        method="GET"
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        {selectedType !== "ALL" ? (
          <input type="hidden" name="type" value={selectedType} />
        ) : null}
        {selectedStatus !== "ALL" ? (
          <input type="hidden" name="status" value={selectedStatus} />
        ) : null}
        {populatedOnly ? (
          <input type="hidden" name="populated" value="1" />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ابحث بالاسم أو slug أو handle"
          className="search-input"
          style={{ minWidth: "280px" }}
        />
        <button type="submit" className="btn small">
          Search
        </button>
        <Link
          href={buildFilterHref(selectedType, selectedStatus, "", populatedOnly)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div
        style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        <Link
          href={buildFilterHref("ALL", selectedStatus, query, populatedOnly)}
          className={`btn ${selectedType === "ALL" ? "primary" : "small"}`}
        >
          All Types
        </Link>

        {availableTypes.map((type) => (
          <Link
            key={type}
            href={buildFilterHref(type, selectedStatus, query, populatedOnly)}
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
          href={buildFilterHref(selectedType, "ALL", query, populatedOnly)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {availableStatuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(selectedType, status, query, populatedOnly)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      {filteredSources.length === 0 ? (
        <EmptyState
          title="لا توجد مصادر مطابقة"
          description="لا توجد مصادر تطابق الفلاتر الحالية أو البحث الحالي."
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
                <th>Archive</th>
                <th>Restore</th>
                <th>Admin Details</th>
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
                    <AdminSourceArchiveButton
                      sourceId={source.id}
                      status={source.status}
                    />
                  </td>
                  <td>
                    <AdminSourceRestoreButton
                      sourceId={source.id}
                      status={source.status}
                    />
                  </td>
                  <td>
                    <Link href={`/admin/sources/${source.id}`} className="btn small">
                      Admin Details
                    </Link>
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
