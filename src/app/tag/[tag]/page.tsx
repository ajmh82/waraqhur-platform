import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SectionHeading } from "@/components/content/section-heading";
import { TimelineList } from "@/components/content/timeline-list";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface TagTweetsResponse {
  posts: Array<{
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
    content?: string | null;
    createdAt: string;
    commentsCount: number;
    likesCount?: number;
    category: { id: string; name: string; slug: string } | null;
    source: { id: string; name: string; slug: string } | null;
    author: { id: string; email: string; username: string } | null;
    metadata?: {
      social?: {
        postKind?: string;
        hashtags?: string[];
        mediaType?: "image" | "video" | null;
        mediaUrl?: string | null;
      };
    } | null;
  }>;
}

async function loadData(tag: string) {
  try {
    return {
      data: await apiGet<TagTweetsResponse>(`/api/tweets?tag=${encodeURIComponent(tag)}`),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "تعذر تحميل صفحة الهاشتاق.",
    };
  }
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const { data, error } = await loadData(tag);

  if (error || !data) {
    return (
      <AppShell>
        <section className="page-section">
          <ErrorState
            title="تعذر تحميل الهاشتاق"
            description={error ?? "تعذر تحميل صفحة الهاشتاق."}
          />
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="page-section">
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <Link href="/timeline" className="btn small">
            التايملاين
          </Link>
          <Link href="/search" className="btn small">
            البحث
          </Link>
        </div>

        <SectionHeading
          eyebrow="Hashtag"
          title={`#${tag}`}
          description="هذه الصفحة تعرض كل التغريدات التي تحتوي على هذا الهاشتاق."
        />

        {data.posts.length === 0 ? (
          <EmptyState
            title="لا توجد تغريدات لهذا الهاشتاق"
            description="عندما تُنشر تغريدات تحتوي على هذا الهاشتاق ستظهر هنا."
          />
        ) : (
          <TimelineList posts={data.posts} />
        )}
      </section>
    </AppShell>
  );
}
