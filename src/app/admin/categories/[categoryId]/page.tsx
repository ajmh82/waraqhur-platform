import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminCategoryArchiveButton } from "@/components/admin/admin-category-archive-button";
import { AdminCategoryRestoreButton } from "@/components/admin/admin-category-restore-button";
import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

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
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface AdminPostRecord {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  visibility: string;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface AdminCategoryDetailsPageResult {
  category: AdminCategoryRecord | null;
  sourcesCount: number;
  postsCount: number;
  publishedPostsCount: number;
  draftPostsCount: number;
  archivedPostsCount: number;
  error: string | null;
}

async function loadAdminCategoryDetailsPageData(
  categoryId: string
): Promise<AdminCategoryDetailsPageResult> {
  try {
    const [categoriesData, sourcesData, postsData] = await Promise.all([
      dashboardApiGet<{ categories: AdminCategoryRecord[] }>("/api/categories"),
      dashboardApiGet<{ sources: AdminSourceRecord[] }>("/api/sources"),
      dashboardApiGet<{ posts: AdminPostRecord[] }>("/api/posts"),
    ]);

    const category =
      categoriesData.categories.find((item) => item.id === categoryId) ?? null;

    if (!category) {
      return {
        category: null,
        sourcesCount: 0,
        postsCount: 0,
        publishedPostsCount: 0,
        draftPostsCount: 0,
        archivedPostsCount: 0,
        error: null,
      };
    }

    const categorySources = sourcesData.sources.filter(
      (source) => source.category.id === category.id
    );

    const categoryPosts = postsData.posts.filter(
      (post) => post.category?.id === category.id
    );

    return {
      category,
      sourcesCount: categorySources.length,
      postsCount: categoryPosts.length,
      publishedPostsCount: categoryPosts.filter((post) => post.status === "PUBLISHED").length,
      draftPostsCount: categoryPosts.filter((post) => post.status === "DRAFT").length,
      archivedPostsCount: categoryPosts.filter((post) => post.status === "ARCHIVED").length,
      error: null,
    };
  } catch (error) {
    return {
      category: null,
      sourcesCount: 0,
      postsCount: 0,
      publishedPostsCount: 0,
      draftPostsCount: 0,
      archivedPostsCount: 0,
      error:
        error instanceof Error ? error.message : "تعذر تحميل بيانات التصنيف.",
    };
  }
}

export default async function AdminCategoryDetailsPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const {
    category,
    sourcesCount,
    postsCount,
    publishedPostsCount,
    draftPostsCount,
    archivedPostsCount,
    error,
  } = await loadAdminCategoryDetailsPageData(categoryId);

  if (error) {
    return <ErrorState title="تعذر تحميل التصنيف" description={error} />;
  }

  if (!category) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={category.name}
        description="صفحة تفاصيل التصنيف من داخل لوحة الإدارة."
      />

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href="/admin/categories" className="btn small">
          العودة إلى التصنيفات
        </Link>
        <Link href={`/admin/categories/${category.id}/edit`} className="btn small">
          Edit Category
        </Link>
        <Link href={`/admin/categories/${category.id}/sources`} className="btn small">
          Category Sources
        </Link>
        <Link href={`/admin/categories/${category.id}/posts`} className="btn small">
          Category Posts
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
          <strong>عدد المصادر</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{sourcesCount}</p>
        </div>
        <div className="state-card">
          <strong>إجمالي المنشورات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{postsCount}</p>
        </div>
        <div className="state-card">
          <strong>Published</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{publishedPostsCount}</p>
        </div>
        <div className="state-card">
          <strong>Draft</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{draftPostsCount}</p>
        </div>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> category={category.name}, status={category.status}, sources={sourcesCount}, posts={postsCount}, published={publishedPostsCount}, draft={draftPostsCount}, archived={archivedPostsCount}
        </p>
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={`/admin/categories/${category.id}/sources`} className="btn small">
          All Sources
        </Link>
        <Link href={`/admin/categories/${category.id}/posts`} className="btn small">
          All Posts
        </Link>
        <Link href={`/admin/categories/${category.id}/posts?status=PUBLISHED`} className="btn small">
          Published Only
        </Link>
        <Link href={`/admin/categories/${category.id}/posts?status=DRAFT`} className="btn small">
          Draft Only
        </Link>
        <Link href={`/admin/categories/${category.id}/posts?status=ARCHIVED`} className="btn small">
          Archived Only
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <p><strong>الاسم:</strong> {category.name}</p>
          <p><strong>Slug:</strong> {category.slug}</p>
          <p><strong>الحالة:</strong> {category.status}</p>
          <p><strong>الترتيب:</strong> {category.sortOrder}</p>
          <p><strong>الوصف:</strong> {category.description ?? "-"}</p>
          <p><strong>عدد المصادر:</strong> {sourcesCount}</p>
          <p><strong>عدد المنشورات:</strong> {postsCount}</p>
          <p><strong>تاريخ الإنشاء:</strong> {formatDateTimeInMakkah(category.createdAt, "ar-BH")}</p>
          <p><strong>آخر تحديث:</strong> {formatDateTimeInMakkah(category.updatedAt, "ar-BH")}</p>
        </div>
      </div>

      <div className="state-card">
        <h2 style={{ marginTop: 0 }}>Actions</h2>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <AdminCategoryArchiveButton
            categoryId={category.id}
            status={category.status}
          />
          <AdminCategoryRestoreButton
            categoryId={category.id}
            status={category.status}
          />
        </div>
      </div>
    </section>
  );
}
