import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBadge } from "@/components/content/category-badge";
import { SourceBadge } from "@/components/content/source-badge";
import { AppHeader } from "@/components/layout/app-header";
import { LikePostButton } from "@/components/social/like-post-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface PostsData {
  posts: Array<{
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
    content: string | null;
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

interface CommentsData {
  comments: Array<{
    id: string;
    postId: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      email: string;
      username: string;
    } | null;
  }>;
}

interface PostPageResult {
  post: PostsData["posts"][number] | null;
  comments: CommentsData["comments"];
  error: string | null;
}

async function loadPostPageData(slug: string): Promise<PostPageResult> {
  try {
    const postsData = await apiGet<PostsData>("/api/posts");
    const post = postsData.posts.find((item) => item.slug === slug);

    if (!post) {
      return {
        post: null,
        comments: [],
        error: null,
      };
    }

    const commentsData = await apiGet<CommentsData>(
      `/api/comments?postId=${post.id}`
    );

    return {
      post,
      comments: commentsData.comments,
      error: null,
    };
  } catch (error) {
    return {
      post: null,
      comments: [],
      error:
        error instanceof Error ? error.message : "تعذر تحميل بيانات المنشور.",
    };
  }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { post, comments, error } = await loadPostPageData(slug);

  if (error) {
    return (
      <main className="page-stack">
        <div className="page-container">
          <AppHeader />
          <ErrorState title="تعذر تحميل المنشور" description={error} />
        </div>
      </main>
    );
  }

  if (!post) {
    notFound();
  }

  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <article className="post-detail">
          <div className="post-detail__meta">
            {post.source ? (
              <SourceBadge name={post.source.name} slug={post.source.slug} />
            ) : null}
            {post.category ? (
              <CategoryBadge name={post.category.name} slug={post.category.slug} />
            ) : null}
          </div>

          <h1 className="post-detail__title">{post.title}</h1>

          <p className="post-detail__summary">
            {post.excerpt ?? "لا يوجد ملخص لهذا المنشور."}
          </p>

          <div className="post-detail__info">
            <span>{new Date(post.createdAt).toLocaleString("ar-BH")}</span>
            <span>{post.author?.username ?? "كاتب غير معروف"}</span>
            <span>{comments.length} تعليق</span>
            <span>{post.likesCount ?? 0} إعجاب</span>
          </div>

          <div style={{ marginTop: "18px" }}>
            <LikePostButton
              postId={post.id}
              initialLikesCount={post.likesCount ?? 0}
            />
          </div>

          <div className="post-detail__content">
            {post.content ?? "لا يوجد محتوى كامل لهذا المنشور حتى الآن."}
          </div>
        </article>

        <section className="page-section">
          <div className="section-heading">
            <p className="section-heading__eyebrow">النقاش</p>
            <h2>التعليقات والردود</h2>
            <p className="section-heading__description">
              هذا القسم هو البداية الفعلية للطبقة الاجتماعية داخل ورق حر، وسيُطوَّر لاحقًا إلى ردود متداخلة وتفاعلات أوسع شبيهة بمنصات التواصل الحديثة.
            </p>
          </div>

          {comments.length === 0 ? (
            <EmptyState
              title="لا توجد تعليقات بعد"
              description="المنشور موجود، لكن لم تتم إضافة أي تعليق عليه حتى الآن."
            />
          ) : (
            <div className="comment-list">
              {comments.map((comment) => (
                <article key={comment.id} className="comment-card">
                  <div className="comment-card__head">
                    <strong>{comment.author?.username ?? "مستخدم غير معروف"}</strong>
                    <span>{new Date(comment.createdAt).toLocaleString("ar-BH")}</span>
                  </div>
                  <p>{comment.content}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="page-section">
          <Link href="/timeline" className="back-link">
            العودة إلى الموجز
          </Link>
        </section>
      </div>
    </main>
  );
}
