import { notFound } from "next/navigation";
import { TimelineList } from "@/components/content/timeline-list";
import { SectionHeading } from "@/components/content/section-heading";
import { AppHeader } from "@/components/layout/app-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface CategoriesData {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
  }>;
}

interface PostsData {
  posts: Array<{
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
    createdAt: string;
    commentsCount: number;
    category: {
      id: string;
      name: string;
      slug: string;
    } | null;
    source: {
      id: string;
      name: string;
      slug: string;
    } | null;
    author: {
      id: string;
      email: string;
      username: string;
    } | null;
  }>;
}

interface CategoryPageResult {
  category:
    | {
        id: string;
        name: string;
        slug: string;
        description: string | null;
      }
    | null;
  posts: PostsData["posts"];
  error: string | null;
}

async function loadCategoryPageData(slug: string): Promise<CategoryPageResult> {
  try {
    const [categoriesData, postsData] = await Promise.all([
      apiGet<CategoriesData>("/api/categories"),
      apiGet<PostsData>("/api/posts"),
    ]);

    const category = categoriesData.categories.find((item) => item.slug === slug);

    if (!category) {
      return {
        category: null,
        posts: [],
        error: null,
      };
    }

    return {
      category,
      posts: postsData.posts.filter((post) => post.category?.slug === category.slug),
      error: null,
    };
  } catch (error) {
    return {
      category: null,
      posts: [],
      error:
        error instanceof Error ? error.message : "Unable to load category data.",
    };
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { category, posts, error } = await loadCategoryPageData(slug);

  if (error) {
    return (
      <main className="page-stack">
        <div className="page-container">
          <AppHeader />
          <ErrorState title="Failed to load category" description={error} />
        </div>
      </main>
    );
  }

  if (!category) {
    notFound();
  }

  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <section className="page-section">
          <SectionHeading
            eyebrow="Category"
            title={category.name}
            description={
              category.description ??
              "Posts filtered by this category in a layout that can later map to a dedicated app tab."
            }
          />

          {posts.length === 0 ? (
            <EmptyState
              title="No posts in this category"
              description="This category exists, but no posts are linked to it yet."
            />
          ) : (
            <TimelineList posts={posts} />
          )}
        </section>
      </div>
    </main>
  );
}
