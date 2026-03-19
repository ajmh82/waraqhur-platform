import { TimelineList } from "@/components/content/timeline-list";
import { SectionHeading } from "@/components/content/section-heading";
import { AppHeader } from "@/components/layout/app-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface TimelinePageData {
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

interface TimelinePageResult {
  data: TimelinePageData | null;
  error: string | null;
}

async function loadTimelinePageData(): Promise<TimelinePageResult> {
  try {
    const data = await apiGet<TimelinePageData>("/api/posts");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "Unable to load timeline data.",
    };
  }
}

export default async function TimelinePage() {
  const { data, error } = await loadTimelinePageData();

  if (error || !data) {
    return (
      <main className="page-stack">
        <div className="page-container">
          <AppHeader />
          <ErrorState title="Failed to load timeline" description={error ?? "Unable to load timeline data."} />
        </div>
      </main>
    );
  }

  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <section className="page-section">
          <SectionHeading
            eyebrow="Content Feed"
            title="Timeline"
            description="A mobile-first content timeline that lists posts in a reusable layout suitable for both web and app navigation."
          />

          {data.posts.length === 0 ? (
            <EmptyState
              title="Timeline is empty"
              description="No posts are available yet. Create content from the API and return here."
            />
          ) : (
            <TimelineList posts={data.posts} />
          )}
        </section>
      </div>
    </main>
  );
}
