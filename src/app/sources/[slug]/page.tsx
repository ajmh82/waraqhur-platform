import Link from "next/link";
import { notFound } from "next/navigation";
import { TimelineList } from "@/components/content/timeline-list";
import { SectionHeading } from "@/components/content/section-heading";
import { AppHeader } from "@/components/layout/app-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface SourceRecord {
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

interface SourcesData {
  sources: SourceRecord[];
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

async function loadData(slug: string) {
  try {
    const [sourcesData, postsData] = await Promise.all([
      apiGet<SourcesData>("/api/sources"),
      apiGet<PostsData>("/api/posts?sort=latest&page=1&limit=100"),
    ]);

    const source = sourcesData.sources.find((item) => item.slug === slug);

    if (!source) {
      return { source: null, posts: [], error: null };
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
  const { source, posts, error } = await loadData(slug);

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

  const totalComments = posts.reduce((sum, post) => sum + post.commentsCount, 0);
  const totalLikes = posts.reduce((sum, post) => sum + (post.likesCount ?? 0), 0);

  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <section className="page-section">
          <SectionHeading
            eyebrow={`نوع المصدر: ${source.type}`}
            title={source.name}
            description={
              source.url
                ? `هذا المصدر مرتبط بالرابط التالي: ${source.url}`
                : "هذا المصدر لا يحتوي حاليًا على رابط خارجي ظاهر."
            }
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div className="state-card">
              <strong>المنشورات</strong>
              <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
                {posts.length}
              </p>
            </div>

            <div className="state-card">
              <strong>التعليقات</strong>
              <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
                {totalComments}
              </p>
            </div>

            <div className="state-card">
              <strong>الإعجابات</strong>
              <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
                {totalLikes}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <Link href={`/categories/${source.category.slug}`} className="btn small">
              تصفح التصنيف
            </Link>

            <Link href="/timeline" className="btn small">
              العودة إلى التايملاين
            </Link>

            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="btn small"
              >
                زيارة الرابط الأصلي
              </a>
            ) : null}
          </div>

          <div
            className="state-card"
            style={{
              marginBottom: "18px",
              padding: "16px",
              display: "grid",
              gap: "8px",
            }}
          >
            <strong>ملخص المصدر</strong>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
              هذه الصفحة تجمع كل المنشورات المرتبطة بهذا المصدر في مكان واحد،
              حتى يتمكن المستخدم من متابعة إنتاجه ومعرفة حجم التفاعل عليه بسرعة.
            </p>
          </div>

          {posts.length === 0 ? (
            <EmptyState
              title="لا توجد منشورات مرتبطة بهذا المصدر"
              description="المصدر موجود لكن لم يُربط به أي منشور بعد."
            />
          ) : (
            <TimelineList posts={posts} />
          )}
        </section>
      </div>
    </main>
  );
}
