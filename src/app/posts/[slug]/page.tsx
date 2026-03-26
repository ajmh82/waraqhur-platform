import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBadge } from "@/components/content/category-badge";
import { SourceBadge } from "@/components/content/source-badge";
import { AppHeader } from "@/components/layout/app-header";
import { LikePostButton } from "@/components/social/like-post-button";
import { BookmarkPostButton } from "@/components/social/bookmark-post-button";
import { CommentForm } from "@/components/social/comment-form";
import { ReplyToggleButton } from "@/components/social/reply-toggle-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";
import { formatDateTimeInMakkah, formatRelativeTime } from "@/lib/date-time";

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
  category: { id: string; name: string; slug: string } | null;
  source: { id: string; name: string; slug: string } | null;
  author: { id: string; email: string; username: string } | null;
}

interface PostsData { posts: PostRecord[] }

interface FlatComment {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  status: string;
  author: { id: string; email: string; username: string } | null;
  repliesCount: number;
}

interface CommentNode extends FlatComment {
  replies: CommentNode[];
}

interface CommentsData { comments: FlatComment[] }
interface SourceListData { sources: Array<{ id: string; slug: string }> }
interface SourcePostsData { posts: PostRecord[] }

interface PostPageResult {
  post: PostRecord | null;
  comments: CommentNode[];
  error: string | null;
}

function buildCommentTree(flat: FlatComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of flat) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  roots.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const node of map.values()) {
    node.replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  return roots;
}

async function loadPostBySlug(slug: string) {
  const timelineData = await apiGet<PostsData>("/api/posts");
  const directMatch = timelineData.posts.find((item) => item.slug === slug);
  if (directMatch) return directMatch;

  const sourcesData = await apiGet<SourceListData>("/api/sources");
  for (const source of sourcesData.sources) {
    try {
      const sourceData = await apiGet<SourcePostsData>(`/sources/${source.slug}`);
      const sourceMatch = sourceData.posts.find((item) => item.slug === slug);
      if (sourceMatch) return sourceMatch;
    } catch { continue }
  }
  return null;
}

async function loadPostPageData(slug: string): Promise<PostPageResult> {
  try {
    const post = await loadPostBySlug(slug);
    if (!post) return { post: null, comments: [], error: null };
    const commentsData = await apiGet<CommentsData>(`/api/comments?postId=${post.id}`);
    const tree = buildCommentTree(commentsData.comments);
    return { post, comments: tree, error: null };
  } catch (error) {
    return {
      post: null, comments: [],
      error: error instanceof Error ? error.message : "تعذر تحميل بيانات المنشور.",
    };
  }
}

function CommentThread({
  comments, postId, depth = 0,
}: {
  comments: CommentNode[]; postId: string; depth?: number;
}) {
  return (
    <div className="comment-thread">
      {comments.map((comment) => (
        <article
          key={comment.id}
          className={`comment-item ${depth > 0 ? "comment-item--nested" : ""}`}
          style={depth > 0 ? { marginRight: `${Math.min(depth * 20, 60)}px` } : undefined}
        >
          <div className="comment-item__avatar">
            {(comment.author?.username ?? "؟").charAt(0).toUpperCase()}
          </div>
          <div className="comment-item__body">
            <div className="comment-item__header">
              <strong className="comment-item__author">
                {comment.author ? (
                  <Link href={`/u/${comment.author.username}`}>{comment.author.username}</Link>
                ) : "مستخدم غير معروف"}
              </strong>
              <span className="comment-item__time">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
            <p className="comment-item__text">{comment.content}</p>
            <ReplyToggleButton postId={postId} commentId={comment.id} />
          </div>

          {comment.replies.length > 0 ? (
            <div className="comment-item__replies">
              <CommentThread comments={comment.replies} postId={postId} depth={depth + 1} />
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

  if (!post) notFound();

  const originalUrl = post.metadata?.ingestion?.originalUrl ?? null;
  const totalComments = (function countAll(nodes: CommentNode[]): number {
    return nodes.reduce((sum, n) => sum + 1 + countAll(n.replies), 0);
  })(comments);

  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <article className="post-detail-v2">
          <div className="post-detail-v2__top">
            <div className="tweet-card__avatar tweet-card__avatar--lg">
              {(post.author?.username ?? "؟").charAt(0).toUpperCase()}
            </div>
            <div>
              <strong className="post-detail-v2__author">
                {post.author ? (
                  <Link href={`/u/${post.author.username}`}>{post.author.username}</Link>
                ) : "كاتب غير معروف"}
              </strong>
              <span className="post-detail-v2__time">
                {formatDateTimeInMakkah(post.createdAt, "ar-BH")}
              </span>
            </div>
          </div>

          <div className="post-detail-v2__badges">
            {post.source ? <SourceBadge name={post.source.name} slug={post.source.slug} /> : null}
            {post.category ? <CategoryBadge name={post.category.name} slug={post.category.slug} /> : null}
          </div>

          <h1 className="post-detail-v2__title">{post.title}</h1>

          {post.excerpt ? <p className="post-detail-v2__excerpt">{post.excerpt}</p> : null}

          <div className="post-detail-v2__content">
            {post.content ?? "لا يوجد محتوى كامل لهذا المنشور حتى الآن."}
          </div>

          <div className="post-detail-v2__stats">
            <span>❤️ {post.likesCount ?? 0} إعجاب</span>
            <span>💬 {totalComments} تعليق</span>
          </div>

          <div className="post-detail-v2__actions">
            <LikePostButton postId={post.id} initialLikesCount={post.likesCount ?? 0} />
            <BookmarkPostButton postId={post.id} />
            {originalUrl ? (
              <a href={originalUrl} target="_blank" rel="noreferrer" className="btn-action">
                🔗 المصدر الأصلي
              </a>
            ) : null}
            <Link href="/timeline" className="btn-action">← العودة للموجز</Link>
          </div>
        </article>

        <section className="page-section">
          <div className="section-heading">
            <p className="section-heading__eyebrow">شارك رأيك</p>
            <h2>أضف تعليقاً</h2>
          </div>
          <CommentForm postId={post.id} />
        </section>

        <section className="page-section">
          <div className="section-heading">
            <p className="section-heading__eyebrow">النقاش</p>
            <h2>التعليقات ({totalComments})</h2>
          </div>

          {comments.length === 0 ? (
            <EmptyState
              title="لا توجد تعليقات بعد"
              description="كن أول من يعلّق على هذا المنشور."
            />
          ) : (
            <CommentThread comments={comments} postId={post.id} />
          )}
        </section>
      </div>
    </main>
  );
}
