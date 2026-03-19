import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBadge } from "@/components/content/category-badge";
import { SourceBadge } from "@/components/content/source-badge";
import { AppHeader } from "@/components/layout/app-header";
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
        error instanceof Error ? error.message : "Unable to load the post data.",
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
          <ErrorState title="Failed to load post" description={error} />
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
            {post.category ? (
              <CategoryBadge name={post.category.name} slug={post.category.slug} />
            ) : null}
            {post.source ? (
              <SourceBadge name={post.source.name} slug={post.source.slug} />
            ) : null}
          </div>

          <h1 className="post-detail__title">{post.title}</h1>

          <p className="post-detail__summary">
            {post.excerpt ?? "No excerpt available for this post."}
          </p>

          <div className="post-detail__info">
            <span>{new Date(post.createdAt).toLocaleDateString("en-GB")}</span>
            <span>{post.author?.username ?? "Unknown author"}</span>
            <span>{comments.length} comments</span>
          </div>

          <div className="post-detail__content">
            {post.content ?? "No content available."}
          </div>
        </article>

        <section className="page-section">
          <div className="section-heading">
            <p className="section-heading__eyebrow">Discussion</p>
            <h2>Comments</h2>
          </div>

          {comments.length === 0 ? (
            <EmptyState
              title="No comments yet"
              description="This post exists, but no comments have been added yet."
            />
          ) : (
            <div className="comment-list">
              {comments.map((comment) => (
                <article key={comment.id} className="comment-card">
                  <div className="comment-card__head">
                    <strong>{comment.author?.username ?? "Unknown user"}</strong>
                    <span>{new Date(comment.createdAt).toLocaleDateString("en-GB")}</span>
                  </div>
                  <p>{comment.content}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="page-section">
          <Link href="/timeline" className="back-link">
            Back to timeline
          </Link>
        </section>
      </div>
    </main>
  );
}
