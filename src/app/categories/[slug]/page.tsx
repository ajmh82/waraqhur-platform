import { notFound } from "next/navigation";
import { TimelineList } from "@/components/content/timeline-list";
import { SectionHeading } from "@/components/content/section-heading";
import { AppHeader } from "@/components/layout/app-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface CategoriesData { categories: Array<{ id: string; name: string; slug: string; description: string | null }> }
interface PostsData { posts: Array<{ id: string; title: string; slug: string | null; excerpt: string | null; createdAt: string; commentsCount: number; category: { id: string; name: string; slug: string } | null; source: { id: string; name: string; slug: string } | null; author: { id: string; email: string; username: string } | null }> }

async function loadData(slug: string) {
  try {
    const [categoriesData, postsData] = await Promise.all([
      apiGet<CategoriesData>("/api/categories"),
      apiGet<PostsData>("/api/posts"),
    ]);
    const category = categoriesData.categories.find((c) => c.slug === slug);
    if (!category) return { category: null, posts: [], error: null };
    return { category, posts: postsData.posts.filter((p) => p.category?.slug === category.slug), error: null };
  } catch (error) {
    return { category: null, posts: [], error: error instanceof Error ? error.message : "تعذر تحميل بيانات التصنيف." };
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { category, posts, error } = await loadData(slug);

  if (error) {
    return (
      <main className="page-stack"><div className="page-container"><AppHeader />
        <ErrorState title="تعذر تحميل التصنيف" description={error} />
      </div></main>
    );
  }

  if (!category) notFound();

  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />
        <section className="page-section">
          <SectionHeading
            eyebrow="التصنيف"
            title={category.name}
            description={category.description ?? "المنشورات المرتبطة بهذا التصنيف."}
          />
          {posts.length === 0 ? (
            <EmptyState title="لا توجد منشورات في هذا التصنيف" description="التصنيف موجود لكن لا توجد منشورات مرتبطة به بعد." />
          ) : (
            <TimelineList posts={posts} />
          )}
        </section>
      </div>
    </main>
  );
}
