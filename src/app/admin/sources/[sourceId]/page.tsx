import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSourceIngestButton } from "@/components/admin/admin-source-ingest-button";
import { AdminSourcePreviewButton } from "@/components/admin/admin-source-preview-button";
import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminSourceRecord {
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
}

interface PostsResponse {
  posts: Array<{
    id: string;
    title: string;
    slug: string | null;
    createdAt: string;
    source: {
      id: string;
      name: string;
      slug: string;
    } | null;
  }>;
}

interface AdminSourcePageResult {
  source: AdminSourceRecord | null;
  posts: PostsResponse["posts"];
  error: string | null;
}

async function loadAdminSourcePageData(
  sourceId: string
): Promise<AdminSourcePageResult> {
  try {
    const sourcesData = await dashboardApiGet<{
      sources: AdminSourceRecord[];
    }>("/api/sources");

    const source = sourcesData.sources.find((item) => item.id === sourceId);

    if (!source) {
      return {
        source: null,
        posts: [],
        error: null,
      };
    }

    const postsData = await dashboardApiGet<PostsResponse>("/api/posts");

    const posts = postsData.posts
      .filter((post) => post.source?.id === source.id)
      .slice(0, 10);

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
        error instanceof Error ? error.message : "تعذر تحميل بيانات المصدر.",
    };
  }
}

export default async function AdminSourceDetailsPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const { source, posts, error } = await loadAdminSourcePageData(sourceId);

  if (error) {
    return <ErrorState title="تعذر تحميل المصدر" description={error} />;
  }

  if (!source) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={source.name}
        description="صفحة إدارية مفصلة للمصدر، تعرض أهم بياناته التشغيلية الحالية وآخر منشوراته."
      />

      <div className="state-card">
        <div style={{ display: "grid", gap: "12px" }}>
          <p><strong>الاسم:</strong> {source.name}</p>
          <p><strong>Slug:</strong> {source.slug}</p>
          <p><strong>النوع:</strong> {source.type}</p>
          <p><strong>الحالة:</strong> {source.status}</p>
          <p><strong>التصنيف:</strong> {source.category.name}</p>
          <p><strong>الرابط:</strong> {source.url ?? "-"}</p>
          <p><strong>المعرف:</strong> {source.handle ?? "-"}</p>
          <p><strong>عدد المنشورات:</strong> {source.postsCount}</p>
          <p>
            <strong>آخر ingest:</strong>{" "}
            {source.lastIngestedAt
              ? new Date(source.lastIngestedAt).toLocaleString("ar-BH")
              : "-"}
          </p>
          <p>
            <strong>تاريخ الإنشاء:</strong>{" "}
            {new Date(source.createdAt).toLocaleString("ar-BH")}
          </p>
          <p>
            <strong>آخر تحديث:</strong>{" "}
            {new Date(source.updatedAt).toLocaleString("ar-BH")}
          </p>
        </div>

        <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/admin/sources" className="btn small">
            العودة إلى المصادر
          </Link>
          <Link
            href={`/admin/sources?type=${encodeURIComponent(source.type)}&status=${encodeURIComponent(source.status)}&q=${encodeURIComponent(source.slug)}`}
            className="btn small"
          >
            فتح نفس الفلتر
          </Link>
          <Link href={`/sources/${source.slug}`} className="btn small">
            فتح الصفحة العامة
          </Link>
          <AdminSourcePreviewButton
            sourceId={source.id}
            sourceType={source.type}
          />
          <AdminSourceIngestButton
            sourceId={source.id}
            sourceType={source.type}
          />
        </div>
      </div>

      <div className="state-card" style={{ marginTop: "18px" }}>
        <h2 style={{ marginTop: 0 }}>آخر المنشورات</h2>

        {posts.length === 0 ? (
          <p style={{ marginBottom: 0 }}>لا توجد منشورات مرتبطة بهذا المصدر داخل الموجز الحالي.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {posts.map((post) => (
              <Link
                key={post.id}
                href={post.slug ? `/posts/${post.slug}` : "#"}
                className="comment-card"
              >
                <strong>{post.title}</strong>
                <p style={{ marginTop: "8px", marginBottom: 0 }}>
                  {new Date(post.createdAt).toLocaleString("ar-BH")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
