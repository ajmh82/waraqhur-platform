import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSourceArchiveButton } from "@/components/admin/admin-source-archive-button";
import { AdminSourceIngestButton } from "@/components/admin/admin-source-ingest-button";
import { AdminSourcePreviewButton } from "@/components/admin/admin-source-preview-button";
import { AdminSourceRestoreButton } from "@/components/admin/admin-source-restore-button";
import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

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

interface AdminPostsData {
  posts: Array<{
    id: string;
    status: string;
    visibility: string;
    source: {
      id: string;
      name: string;
      slug: string;
    } | null;
  }>;
}

interface AdminSourceDetailsPageResult {
  source: AdminSourcesData["sources"][number] | null;
  posts: AdminPostsData["posts"];
  error: string | null;
}

async function loadAdminSourceDetailsPageData(
  sourceId: string
): Promise<AdminSourceDetailsPageResult> {
  try {
    const [sourcesData, postsData] = await Promise.all([
      dashboardApiGet<AdminSourcesData>("/api/sources"),
      dashboardApiGet<AdminPostsData>("/api/posts"),
    ]);

    const source = sourcesData.sources.find((item) => item.id === sourceId) ?? null;
    const posts = postsData.posts.filter((post) => post.source?.id === sourceId);

    return {
      source,
      posts,
      error: null,
    };
  } catch (error) {
    return {
      source: null,
      posts: [],
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
  const { source, posts, error } = await loadAdminSourceDetailsPageData(sourceId);

  if (error) {
    return <ErrorState title="Failed to load source" description={error} />;
  }

  if (!source) {
    notFound();
  }

  const totalPosts = posts.length;
  const draftPosts = posts.filter((post) => post.status === "DRAFT").length;
  const publishedPosts = posts.filter((post) => post.status === "PUBLISHED").length;
  const archivedPosts = posts.filter((post) => post.status === "ARCHIVED").length;
  const publicPosts = posts.filter((post) => post.visibility === "PUBLIC").length;
  const privatePosts = posts.filter((post) => post.visibility === "PRIVATE").length;

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
        <Link href={`/admin/sources/${source.id}/posts/new`} className="btn small">
          Create Post Manually
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
          <strong>إجمالي المنشورات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalPosts}</p>
        </div>
        <div className="state-card">
          <strong>Draft</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{draftPosts}</p>
        </div>
        <div className="state-card">
          <strong>Published</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{publishedPosts}</p>
        </div>
        <div className="state-card">
          <strong>Archived</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{archivedPosts}</p>
        </div>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> source={source.name}, type={source.type}, status={source.status}, totalPosts={totalPosts}, publicPosts={publicPosts}, privatePosts={privatePosts}
        </p>
      </div>

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link href={`/admin/sources/${source.id}/posts`} className="btn small">
          All Posts
        </Link>
        <Link href={`/admin/sources/${source.id}/posts?status=DRAFT`} className="btn small">
          Draft Only
        </Link>
        <Link href={`/admin/sources/${source.id}/posts?status=PUBLISHED`} className="btn small">
          Published Only
        </Link>
        <Link href={`/admin/sources/${source.id}/posts?status=ARCHIVED`} className="btn small">
          Archived Only
        </Link>
        <Link href={`/admin/sources/${source.id}/posts?visibility=PUBLIC`} className="btn small">
          Public Only
        </Link>
        <Link href={`/admin/sources/${source.id}/posts?visibility=PRIVATE`} className="btn small">
          Private Only
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
              ? formatDateTimeInMakkah(source.lastFetchedAt, "ar-BH")
              : "-"}
          </p>
          <p><strong>Created At:</strong> {formatDateTimeInMakkah(source.createdAt, "ar-BH")}</p>
          <p><strong>Updated At:</strong> {formatDateTimeInMakkah(source.updatedAt, "ar-BH")}</p>
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
