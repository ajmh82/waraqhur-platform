import { TimelineList } from "@/components/content/timeline-list";
import { SectionHeading } from "@/components/content/section-heading";
import { AppHeader } from "@/components/layout/app-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface HomePageData {
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

interface CategoriesData {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

interface SourcesData {
  sources: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

interface HomePageResult {
  postsData: HomePageData | null;
  categoriesData: CategoriesData | null;
  sourcesData: SourcesData | null;
  error: string | null;
}

async function loadHomePageData(): Promise<HomePageResult> {
  try {
    const [postsData, categoriesData, sourcesData] = await Promise.all([
      apiGet<HomePageData>("/api/posts"),
      apiGet<CategoriesData>("/api/categories"),
      apiGet<SourcesData>("/api/sources"),
    ]);

    return {
      postsData,
      categoriesData,
      sourcesData,
      error: null,
    };
  } catch (error) {
    return {
      postsData: null,
      categoriesData: null,
      sourcesData: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load the home page data.",
    };
  }
}

export default async function HomePage() {
  const { postsData, categoriesData, sourcesData, error } =
    await loadHomePageData();

  if (error || !postsData || !categoriesData || !sourcesData) {
    return (
      <main className="page-stack">
        <div className="page-container">
          <AppHeader />
          <ErrorState title="Failed to load home page" description={error ?? "Unable to load the home page data."} />
        </div>
      </main>
    );
  }

  const featuredPosts = postsData.posts.slice(0, 6);

  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <section className="hero-panel">
          <p className="eyebrow">Waraqhur Platform</p>
          <h1 className="hero-panel__title">A structured content timeline for modern publishing.</h1>
          <p className="hero-panel__description">
            Browse the latest posts, explore curated sources, and move through
            categories using clean, reusable interfaces built for web now and
            ready for app screens later.
          </p>

          <div className="hero-metrics">
            <article className="hero-metric">
              <strong>{postsData.posts.length}</strong>
              <span>Posts</span>
            </article>
            <article className="hero-metric">
              <strong>{categoriesData.categories.length}</strong>
              <span>Categories</span>
            </article>
            <article className="hero-metric">
              <strong>{sourcesData.sources.length}</strong>
              <span>Sources</span>
            </article>
          </div>
        </section>

        <section className="page-section">
          <SectionHeading
            eyebrow="Timeline"
            title="Latest posts"
            description="The home page surfaces the latest published content in a feed that can later map directly to a mobile home screen."
          />

          {featuredPosts.length === 0 ? (
            <EmptyState
              title="No posts yet"
              description="Create categories, sources, and posts from the API to populate the timeline."
            />
          ) : (
            <TimelineList posts={featuredPosts} />
          )}
        </section>
      </div>
    </main>
  );
}
