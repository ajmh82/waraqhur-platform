import Link from "next/link";
import { AdminSourceArchiveButton } from "@/components/admin/admin-source-archive-button";
import { AdminSourceRestoreButton } from "@/components/admin/admin-source-restore-button";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminSourcesData {
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
  data: AdminSourcesData | null;
  error: string | null;
}

async function loadAdminSourcesPageData(): Promise<AdminSourcesPageResult> {
  try {
    const data = await dashboardApiGet<AdminSourcesData>("/api/sources");

    return {
      data,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "Unable to load sources.",
    };
  }
}

function buildFilterHref(type: string, status: string, query: string) {
  const params = new URLSearchParams();

  if (type !== "ALL") {
    params.set("type", type);
  }

  if (status !== "ALL") {
    params.set("status", status);
  }

  if (query.trim()) {
    params.set("q", query.trim());
  }

  const queryString = params.toString();
  return queryString ? `/admin/sources?${queryString}` : "/admin/sources";
}

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string }>;
}) {
  const { data, error } = await loadAdminSourcesPageData();
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedType = currentSearchParams.type?.trim() ?? "ALL";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load sources"
        description={error ?? "Unable to load sources."}
      />
    );
  }

  const totalSources = data.sources.length;
  const activeSources = data.sources.filter(
    (source) => source.status === "ACTIVE"
  ).length;
  const archivedSources = data.sources.filter(
    (source) => source.status === "ARCHIVED"
  ).length;

  const types = Array.from(new Set(data.sources.map((source) => source.type))).sort();
  const statuses = Array.from(
    new Set(data.sources.map((source) => source.status))
  ).sort();

  const filteredSources = data.sources.filter((source) => {
    const typeMatches = selectedType === "ALL" || source.type === selectedType;
    const statusMatches =
      selectedStatus === "ALL" || source.status === selectedStatus;

    const queryMatches =
      normalizedQuery.length === 0 ||
      source.name.toLowerCase().includes(normalizedQuery) ||
      source.slug.toLowerCase().includes(normalizedQuery) ||
      source.category.name.toLowerCase().includes(normalizedQuery) ||
      (source.handle ?? "").toLowerCase().includes(normalizedQuery) ||
      (source.url ?? "").toLowerCase().includes(normalizedQuery);

    return typeMatches && statusMatches && queryMatches;
  });

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="Sources management"
        description="إدارة جميع المصادر من داخل لوحة الإدارة."
      />

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link href="/admin/sources/new" className="btn primary">
          New Source
        </Link>
      </div>

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
          <strong>المصادر المؤرشفة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{archivedSources}</p>
        </div>
      </div>

      <form
        action="/admin/sources"
        method="GET"
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        {selectedType !== "ALL" ? (
          <input type="hidden" name="type" value={selectedType} />
        ) : null}

        {selectedStatus !== "ALL" ? (
          <input type="hidden" name="status" value={selectedStatus} />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ابحث بالاسم أو slug أو التصنيف أو الرابط"
          className="search-input"
          style={{ minWidth: "320px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(selectedType, selectedStatus, "")}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div
        style={{
          marginBottom: "12px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={buildFilterHref("ALL", selectedStatus, query)}
          className={`btn ${selectedType === "ALL" ? "primary" : "small"}`}
        >
          All Types
        </Link>

        {types.map((type) => (
          <Link
            key={type}
            href={buildFilterHref(type, selectedStatus, query)}
            className={`btn ${selectedType === type ? "primary" : "small"}`}
          >
            {type}
          </Link>
        ))}
      </div>

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={buildFilterHref(selectedType, "ALL", query)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(selectedType, status, query)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      {filteredSources.length === 0 ? (
        <EmptyState
          title="لا توجد مصادر"
          description="لا توجد مصادر تطابق البحث أو الفلاتر الحالية."
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Type</th>
                <th>Status</th>
                <th>Category</th>
                <th>Handle</th>
                <th>URL</th>
                <th>Created</th>
                <th>Details</th>
                <th>Edit</th>
                <th>Archive</th>
                <th>Restore</th>
              </tr>
            </thead>
            <tbody>
              {filteredSources.map((source) => (
                <tr key={source.id}>
                  <td>{source.name}</td>
                  <td>{source.slug}</td>
                  <td>{source.type}</td>
                  <td>{source.status}</td>
                  <td>{source.category.name}</td>
                  <td>{source.handle ?? "-"}</td>
                  <td>{source.url ?? "-"}</td>
                  <td>{new Date(source.createdAt).toLocaleString("ar-BH")}</td>
                  <td>
                    <Link href={`/admin/sources/${source.id}`} className="btn small">
                      Source Details
                    </Link>
                  </td>
                  <td>
                    <Link href={`/admin/sources/${source.id}/edit`} className="btn small">
                      Edit Source
                    </Link>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
