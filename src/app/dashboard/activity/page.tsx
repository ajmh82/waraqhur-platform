import Link from "next/link";
import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface ActivityResponse {
  user: {
    id: string;
    username: string;
    profile: {
      displayName: string;
      avatarUrl: string | null;
    } | null;
  };
  posts: Array<{
    id: string;
    title: string;
    slug: string | null;
    createdAt: string;
    commentsCount: number;
    likesCount?: number;
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    post: {
      id: string;
      title: string;
      slug: string | null;
    } | null;
  }>;
}

async function loadData() {
  try {
    return {
      data: await dashboardApiGet<ActivityResponse>("/api/dashboard/activity"),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل صفحة النشاط.",
    };
  }
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

export default async function DashboardActivityPage() {
  const { data, error } = await loadData();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل النشاط"
        description={error ?? "تعذر تحميل صفحة النشاط."}
      />
    );
  }

  const totalItems = data.posts.length + data.comments.length;

  return (
    <section className="dashboard-panel">
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <Link href={`/u/${data.user.username}`} className="btn small">
          الملف العام
        </Link>
        <Link href="/messages" className="btn small">
          الرسائل
        </Link>
        <Link href="/search" className="btn small">
          البحث
        </Link>
        <Link href="/dashboard/settings" className="btn small">
          الإعدادات
        </Link>
      </div>

      <SectionHeading
        eyebrow="Activity"
        title="النشاط"
        description="هنا تجد ملخصًا لأحدث ما قمت به داخل المنصة من منشورات وتعليقات."
      />

      <div
        className="state-card"
        style={{
          maxWidth: "100%",
          margin: "0 0 18px",
          display: "grid",
          gap: "8px",
        }}
      >
        <strong>ملخص النشاط</strong>
        <p style={{ margin: 0 }}>
          لديك {data.posts.length} منشورًا و{data.comments.length} تعليقًا ظاهرًا
          في هذا الملخص، بإجمالي {totalItems} عنصرًا.
        </p>
      </div>

      <div style={{ display: "grid", gap: "20px" }}>
        <section>
          <div className="section-heading">
            <p className="section-heading__eyebrow">Posts</p>
            <h2>المنشورات</h2>
          </div>

          {data.posts.length === 0 ? (
            <EmptyState
              title="لا توجد منشورات بعد"
              description="عندما تبدأ بالنشر سيظهر أحدث نشاطك هنا."
            />
          ) : (
            <div className="dashboard-list">
              {data.posts.map((post) => (
                <article key={post.id} className="dashboard-card">
                  <strong>{post.title}</strong>

                  <div
                    style={{
                      marginTop: "10px",
                      display: "flex",
                      gap: "14px",
                      flexWrap: "wrap",
                      color: "var(--muted)",
                      fontSize: "14px",
                    }}
                  >
                    <span>{formatDateTimeInMakkah(post.createdAt, "ar-BH")}</span>
                    <span>{post.commentsCount} تعليق</span>
                    <span>{post.likesCount ?? 0} إعجاب</span>
                  </div>

                  <div
                    style={{
                      marginTop: "14px",
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <Link
                      href={post.slug ? `/posts/${post.slug}` : "#"}
                      className="btn small"
                    >
                      فتح المنشور
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="section-heading">
            <p className="section-heading__eyebrow">Comments</p>
            <h2>التعليقات</h2>
          </div>

          {data.comments.length === 0 ? (
            <EmptyState
              title="لا توجد تعليقات بعد"
              description="عندما تبدأ بالتعليق سيظهر أحدث نشاطك هنا."
            />
          ) : (
            <div className="dashboard-list">
              {data.comments.map((comment) => (
                <article key={comment.id} className="dashboard-card">
                  <strong>
                    {comment.post?.title ?? "تعليق بدون منشور مرتبط"}
                  </strong>

                  <p style={{ marginTop: "10px" }}>
                    {truncate(comment.content, 180)}
                  </p>

                  <div
                    style={{
                      marginTop: "10px",
                      color: "var(--muted)",
                      fontSize: "14px",
                    }}
                  >
                    {formatDateTimeInMakkah(comment.createdAt, "ar-BH")}
                  </div>

                  {comment.post?.slug ? (
                    <div style={{ marginTop: "14px" }}>
                      <Link
                        href={`/posts/${comment.post.slug}`}
                        className="btn small"
                      >
                        فتح المنشور
                      </Link>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
