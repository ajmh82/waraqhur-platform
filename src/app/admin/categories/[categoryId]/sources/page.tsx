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

function buildFilterHref(categoryId: string, status: string, query: string) {
  const params = new URLSearchParams();

  if (status !== "ALL") {
    params.set("status", status);
  }

  if (query.trim()) {
    params.set("q", query.trim());
  }

  const queryString = params.toString();
  return queryString
    ? `/admin/categories/${categoryId}/sources?${queryString}`
    : `/admin/categories/${categoryId}/sources`;
}

export default async function AdminCategorySourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { categoryId } = await params;
  const { category, sources, error } =
    await loadAdminCategorySourcesPageData(categoryId);
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const normalizedQuery = query.toLowerCase();

  if (error) {
    return <ErrorState title="تعذر تحميل مصادر التصنيف" description={error} />;
  }

  if (!category) {
    notFound();
  }

  const statuses = Array.from(new Set(sources.map((source) => source.status)));
  const totalSources = sources.length;
  const activeSources = sources.filter((source) => source.status === "ACTIVE").length;
  const archivedSources = sources.filter((source) => source.status === "ARCHIVED").length;

  const filteredSources = sources.filter((source) => {
    const statusMatches =
      selectedStatus === "ALL" || source.status === selectedStatus;

    const queryMatches =
      normalizedQuery.length === 0 ||
      source.name.toLowerCase().includes(normalizedQuery) ||
      source.slug.toLowerCase().includes(normalizedQuery);

    return statusMatches && queryMatches;
  });

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`مصادر التصنيف: ${category.name}`}
        description="عرض جميع المصادر المرتبطة بهذا التصنيف."
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
          <strong>المصادر المؤرشفة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{archivedSources}</p>
        </div>
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={`/admin/categories/${category.id}`} className="btn small">
          العودة إلى تفاصيل التصنيف
        </Link>
      </div>

      <form
        action={`/admin/categories/${category.id}/sources`}
        method="GET"
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        {selectedStatus !== "ALL" ? (
          <input type="hidden" name="status" value={selectedStatus} />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ابحث بالاسم أو slug"
          className="search-input"
          style={{ minWidth: "280px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(category.id, selectedStatus, "")}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(category.id, "ALL", query)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(category.id, status, query)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      {filteredSources.length === 0 ? (
        <EmptyState
          title="لا توجد مصادر مطابقة"
          description="لا توجد مصادر تطابق البحث الحالي أو الفلاتر الحالية."
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
              {filteredSources.map((source) => (
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
