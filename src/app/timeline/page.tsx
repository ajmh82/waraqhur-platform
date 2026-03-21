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
        error instanceof Error ? error.message : "تعذر تحميل بيانات الموجز.",
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
          <ErrorState
            title="تعذر تحميل الموجز"
            description={error ?? "تعذر تحميل بيانات الموجز."}
          />
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
            eyebrow="التايم لاين"
            title="موجزك الاجتماعي"
            description="هذه الصفحة تعرض الآن التايم لاين المبني على المتابعة: منشوراتك ومنشورات الحسابات التي تتابعها، مع بقاء هوية ورق حر كموجز عربي منظم للمحتوى والمصادر والتصنيفات."
          />

          {data.posts.length === 0 ? (
            <EmptyState
              title="الموجز فارغ حاليًا"
              description="لا توجد منشورات كافية بعد. تابع مستخدمين أكثر أو أضف محتوى جديدًا ليظهر التدفق الكامل."
            />
          ) : (
            <TimelineList posts={data.posts} />
          )}
        </section>
      </div>
    </main>
  );
}
