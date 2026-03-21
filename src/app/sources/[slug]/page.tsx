import { notFound } from "next/navigation";
import { TimelineList } from "@/components/content/timeline-list";
import { SectionHeading } from "@/components/content/section-heading";
import { AppHeader } from "@/components/layout/app-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface SourcesData {
  sources: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
    url: string | null;
    category: {
      id: string;
      name: string;
      slug: string;
    };
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
    likesCount?: number;
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

interface SourcePageResult {
  source:
    | {
        id: string;
        name: string;
        slug: string;
        type: string;
        url: string | null;
        category: {
          id: string;
          name: string;
          slug: string;
        };
      }
    | null;
  posts: PostsData["posts"];
  error: string | null;
}

async function loadSourcePageData(slug: string): Promise<SourcePageResult> {
  try {
    const [sourcesData, postsData] = await Promise.all([
      apiGet<SourcesData>("/api/sources"),
      apiGet<PostsData>("/api/posts"),
    ]);

    const source = sourcesData.sources.find((item) => item.slug === slug);

    if (!source) {
      return {
        source: null,
        posts: [],
        error: null,
      };
    }

    return {
      source,
      posts: postsData.posts.filter((post) => post.source?.slug === source.slug),
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

export default async function SourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { source, posts, error } = await loadSourcePageData(slug);

  if (error) {
    return (
      <main className="page-stack">
        <div className="page-container">
          <AppHeader />
          <ErrorState title="تعذر تحميل المصدر" description={error} />
        </div>
      </main>
    );
  }

  if (!source) {
    notFound();
  }

  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <section className="page-section">
          <SectionHeading
            eyebrow={`المصدر: ${source.type}`}
            title={source.name}
            description={
              source.url
                ? `الرابط المرتبط بهذا المصدر: ${source.url}`
                : "سيظهر هنا المحتوى المرتبط بهذا المصدر عند توفره."
            }
          />

          {posts.length === 0 ? (
            <EmptyState
              title="لا توجد منشورات مرتبطة بهذا المصدر بعد"
              description="المصدر موجود داخل النظام، لكن لم يتم ربط أي منشور به حتى الآن."
            />
          ) : (
            <TimelineList posts={posts} />
          )}
        </section>
      </div>
    </main>
  );
}
