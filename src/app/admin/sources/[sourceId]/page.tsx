import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSourceArchiveButton } from "@/components/admin/admin-source-archive-button";
import { AdminSourceIngestButton } from "@/components/admin/admin-source-ingest-button";
import { AdminSourcePreviewButton } from "@/components/admin/admin-source-preview-button";
import { AdminSourceRestoreButton } from "@/components/admin/admin-source-restore-button";
import { SectionHeading } from "@/components/content/section-heading";
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
    lastFetchedAt: string | null;
    createdAt: string;
    updatedAt: string;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

interface AdminSourceDetailsPageResult {
  source: AdminSourcesData["sources"][number] | null;
  error: string | null;
}

async function loadAdminSourceDetailsPageData(
  sourceId: string
): Promise<AdminSourceDetailsPageResult> {
  try {
    const data = await dashboardApiGet<AdminSourcesData>("/api/sources");
    const source = data.sources.find((item) => item.id === sourceId) ?? null;

    return {
      source,
      error: null,
    };
  } catch (error) {
    return {
      source: null,
      error:
        error instanceof Error ? error.message : "Unable to load source details.",
    };
  }
}

export default async function AdminSourceDetailsPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const { source, error } = await loadAdminSourceDetailsPageData(sourceId);

  if (error) {
    return <ErrorState title="Failed to load source" description={error} />;
  }

  if (!source) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={source.name}
        description="تفاصيل المصدر من داخل لوحة الإدارة."
      />

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link href="/admin/sources" className="btn small">
          العودة إلى المصادر
        </Link>
        <Link href={`/admin/sources/${source.id}/edit`} className="btn small">
          Edit Source
        </Link>
        <Link href={`/admin/sources/${source.id}/posts`} className="btn small">
          Source Posts
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <p><strong>Source ID:</strong> {source.id}</p>
          <p><strong>Name:</strong> {source.name}</p>
          <p><strong>Slug:</strong> {source.slug}</p>
          <p><strong>Type:</strong> {source.type}</p>
          <p><strong>Status:</strong> {source.status}</p>
          <p><strong>Category:</strong> {source.category.name}</p>
          <p><strong>Handle:</strong> {source.handle ?? "-"}</p>
          <p><strong>URL:</strong> {source.url ?? "-"}</p>
          <p>
            <strong>Last Fetched At:</strong>{" "}
            {source.lastFetchedAt
              ? new Date(source.lastFetchedAt).toLocaleString("ar-BH")
              : "-"}
          </p>
          <p><strong>Created At:</strong> {new Date(source.createdAt).toLocaleString("ar-BH")}</p>
          <p><strong>Updated At:</strong> {new Date(source.updatedAt).toLocaleString("ar-BH")}</p>
        </div>
      </div>

      <div className="state-card">
        <h2 style={{ marginTop: 0 }}>Actions</h2>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <AdminSourcePreviewButton sourceId={source.id} />
          <AdminSourceIngestButton sourceId={source.id} />
          <AdminSourceArchiveButton sourceId={source.id} status={source.status} />
          <AdminSourceRestoreButton sourceId={source.id} status={source.status} />
        </div>
      </div>
    </section>
  );
}
