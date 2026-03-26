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
    return <ErrorState title="تعذر تحميل المصدر" description={error} />;
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
          تعديل المصدر
        </Link>
        <Link href={`/admin/sources/${source.id}/posts`} className="btn small">
          منشورات المصدر
        </Link>
        <Link href={`/admin/sources/${source.id}/posts/new`} className="btn small">
          إنشاء منشور يدوي
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
          <strong>مسودة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{draftPosts}</p>
        </div>
        <div className="state-card">
          <strong>منشورة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{publishedPosts}</p>
        </div>
        <div className="state-card">
          <strong>مؤرشفة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{archivedPosts}</p>
        </div>
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
          جميع المنشورات
        </Link>
        <Link href={`/admin/sources/${source.id}/posts?status=DRAFT`} className="btn small">
          المسودات فقط
        </Link>
        <Link href={`/admin/sources/${source.id}/posts?status=PUBLISHED`} className="btn small">
          المنشورة فقط
        </Link>
        <Link href={`/admin/sources/${source.id}/posts?status=ARCHIVED`} className="btn small">
          المؤرشفة فقط
        </Link>
        <Link href={`/admin/sources/${source.id}/posts?visibility=PUBLIC`} className="btn small">
          العامة فقط
        </Link>
        <Link href={`/admin/sources/${source.id}/posts?visibility=PRIVATE`} className="btn small">
          الخاصة فقط
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <p><strong>معرّف المصدر:</strong> {source.id}</p>
          <p><strong>الاسم:</strong> {source.name}</p>
          <p><strong>المعرّف النصي:</strong> {source.slug}</p>
          <p><strong>النوع:</strong> {source.type}</p>
          <p><strong>الحالة:</strong> {source.status}</p>
          <p><strong>التصنيف:</strong> {source.category.name}</p>
          <p><strong>المُعرّف:</strong> {source.handle ?? "-"}</p>
          <p><strong>الرابط:</strong> {source.url ?? "-"}</p>
          <p>
            <strong>آخر جلب:</strong>{" "}
            {source.lastFetchedAt
              ? formatDateTimeInMakkah(source.lastFetchedAt, "ar-BH")
              : "-"}
          </p>
          <p><strong>تاريخ الإنشاء:</strong> {formatDateTimeInMakkah(source.createdAt, "ar-BH")}</p>
          <p><strong>آخر تحديث:</strong> {formatDateTimeInMakkah(source.updatedAt, "ar-BH")}</p>
        </div>
      </div>

      <div className="state-card">
        <h2 style={{ marginTop: 0 }}>الإجراءات</h2>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <AdminSourcePreviewButton
            sourceId={source.id}
            sourceType={source.type}
          />
          <AdminSourceIngestButton sourceId={source.id} sourceType={source.type} />
          <AdminSourceArchiveButton sourceId={source.id} status={source.status} />
          <AdminSourceRestoreButton sourceId={source.id} status={source.status} />
        </div>
      </div>
    </section>
  );
}
