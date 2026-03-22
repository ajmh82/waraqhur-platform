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

interface AdminPostRecord {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  visibility: string;
  createdAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface AdminCategoryPostsPageResult {
  category: AdminCategoryRecord | null;
  posts: AdminPostRecord[];
  error: string | null;
}

async function loadAdminCategoryPostsPageData(
  categoryId: string
): Promise<AdminCategoryPostsPageResult> {
  try {
    const [categoriesData, postsData] = await Promise.all([
      dashboardApiGet<{ categories: AdminCategoryRecord[] }>("/api/categories"),
      dashboardApiGet<{ posts: AdminPostRecord[] }>("/api/posts"),
    ]);

    const category =
      categoriesData.categories.find((item) => item.id === categoryId) ?? null;

    if (!category) {
      return {
        category: null,
        posts: [],
        error: null,
      };
    }

    const posts = postsData.posts.filter(
      (post) => post.category?.id === category.id
    );

    return {
      category,
      posts,
      error: null,
    };
  } catch (error) {
    return {
      category: null,
      posts: [],
      error:
        error instanceof Error ? error.message : "تعذر تحميل منشورات التصنيف.",
    };
  }
}

export default async function AdminCategoryPostsPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const { category, posts, error } =
    await loadAdminCategoryPostsPageData(categoryId);

  if (error) {
    return <ErrorState title="تعذر تحميل منشورات التصنيف" description={error} />;
  }

  if (!category) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`منشورات التصنيف: ${category.name}`}
        description="عرض جميع المنشورات المرتبطة بهذا التصنيف."
      />

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={`/admin/categories/${category.id}`} className="btn small">
          العودة إلى تفاصيل التصنيف
        </Link>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title="لا توجد منشورات"
          description="لا توجد منشورات مرتبطة بهذا التصنيف حتى الآن."
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>Slug</th>
                <th>الحالة</th>
                <th>الظهور</th>
                <th>التاريخ</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>{post.title}</td>
                  <td>{post.slug ?? "-"}</td>
                  <td>{post.status}</td>
                  <td>{post.visibility}</td>
                  <td>{new Date(post.createdAt).toLocaleString("ar-BH")}</td>
                  <td>
                    <Link href={post.slug ? `/posts/${post.slug}` : "#"} className="btn small">
                      Open Post
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
