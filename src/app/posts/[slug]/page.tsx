import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBadge } from "@/components/content/category-badge";
import { SourceBadge } from "@/components/content/source-badge";
import { AppHeader } from "@/components/layout/app-header";
import { BookmarkPostButton } from "@/components/social/bookmark-post-button";
import { LikePostButton } from "@/components/social/like-post-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface PostRecord {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content?: string | null;
  metadata?: {
    ingestion?: {
      provider?: string;
      fetchedAt?: string;
      originalUrl?: string | null;
    };
  } | null;
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
}

interface PostsData {
  posts: PostRecord[];
}

interface CommentNode {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  author: {
    id: string;
    email: string;
    username: string;
  } | null;
  replies: CommentNode[];
}

interface CommentsData {
  comments: CommentNode[];
}

interface SourceListData {
  sources: Array<{
    id: string;
    slug: string;
  }>;
}

interface SourcePostsData {
  posts: PostRecord[];
}

interface PostPageResult {
  post: PostRecord | null;
  comments: CommentsData["comments"];
  error: string | null;
}

async function loadPostBySlug(slug: string) {
  const timelineData = await apiGet<PostsData>("/api/posts");
  const directMatch = timelineData.posts.find((item) => item.slug === slug);

  if (directMatch) {
    return directMatch;
  }

  const sourcesData = await apiGet<SourceListData>("/api/sources");

  for (const source of sourcesData.sources) {
    try {
      const sourceData = await apiGet<SourcePostsData>(`/sources/${source.slug}`);
      const sourceMatch = sourceData.posts.find((item) => item.slug === slug);

      if (sourceMatch) {
        return sourceMatch;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function loadPostPageData(slug: string): Promise<PostPageResult> {
  try {
    const post = await loadPostBySlug(slug);

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

function CommentThread({
  comments,
  depth = 0,
}: {
  comments: CommentNode[];
  depth?: number;
}) {
  return (
    <div className="comment-list">
      {comments.map((comment) => (
        <article
          key={comment.id}
          className="comment-card"
          style={{ marginRight: `${depth * 24}px` }}
        >
          <div className="comment-card__head">
            <strong>{comment.author?.username ?? "مستخدم غير معروف"}</strong>
            <span>{formatDateTimeInMakkah(comment.createdAt, "ar-BH")}</span>
          </div>
          <p>{comment.content}</p>

          {comment.replies.length > 0 ? (
            <div style={{ marginTop: "14px" }}>
              <CommentThread comments={comment.replies} depth={depth + 1} />
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
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

  const originalUrl = post.metadata?.ingestion?.originalUrl ?? null;
  const fetchedAt = post.metadata?.ingestion?.fetchedAt ?? null;
  const provider = post.metadata?.ingestion?.provider ?? null;

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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px",
              marginTop: "18px",
              marginBottom: "18px",
            }}
          >
            <div className="state-card">
              <strong>التاريخ</strong>
              <p style={{ margin: "10px 0 0" }}>
                {formatDateTimeInMakkah(post.createdAt, "ar-BH")}
              </p>
            </div>
            <div className="state-card">
              <strong>الكاتب</strong>
              <p style={{ margin: "10px 0 0" }}>
                {post.author?.username ?? "كاتب غير معروف"}
              </p>
            </div>
            <div className="state-card">
              <strong>التعليقات</strong>
              <p style={{ margin: "10px 0 0" }}>{comments.length}</p>
            </div>
            <div className="state-card">
              <strong>الإعجابات</strong>
              <p style={{ margin: "10px 0 0" }}>{post.likesCount ?? 0}</p>
            </div>
          </div>

          <div className="state-card" style={{ marginBottom: "18px" }}>
            <p style={{ margin: 0 }}>
              <strong>Current view:</strong> slug={post.slug ?? "none"}, source={post.source?.name ?? "none"}, category={post.category?.name ?? "none"}, provider={provider ?? "none"}
            </p>
          </div>

          <div className="post-detail__info">
            <span>{formatDateTimeInMakkah(post.createdAt, "ar-BH")}</span>
            <span>{post.author?.username ?? "كاتب غير معروف"}</span>
            <span>{comments.length} تعليق رئيسي</span>
            <span>{post.likesCount ?? 0} إعجاب</span>
            {provider ? <span>{provider}</span> : null}
            {fetchedAt ? (
              <span>{formatDateTimeInMakkah(fetchedAt, "ar-BH")}</span>
            ) : null}
          </div>

          <div
            style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
          >
            <LikePostButton
              postId={post.id}
              initialLikesCount={post.likesCount ?? 0}
            />
            <BookmarkPostButton postId={post.id} />
            {originalUrl ? (
              <a
                href={originalUrl}
                target="_blank"
                rel="noreferrer"
                className="btn small"
              >
                Open Original
              </a>
            ) : null}
            <Link href="/timeline" className="btn small">
              العودة إلى الموجز
            </Link>
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
              هذا القسم يدعم الآن الردود المتداخلة، وهو أقرب إلى أسلوب النقاش الاجتماعي الذي نحتاجه داخل ورق حر.
            </p>
          </div>

          {comments.length === 0 ? (
            <EmptyState
              title="لا توجد تعليقات بعد"
              description="المنشور موجود، لكن لم تتم إضافة أي تعليق عليه حتى الآن."
            />
          ) : (
            <CommentThread comments={comments} />
          )}
        </section>
      </div>
    </main>
  );
}
