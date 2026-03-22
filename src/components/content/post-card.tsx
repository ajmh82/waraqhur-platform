import Link from "next/link";
import { CategoryBadge } from "@/components/content/category-badge";
import { SourceBadge } from "@/components/content/source-badge";
import { BookmarkPostButton } from "@/components/social/bookmark-post-button";
import { LikePostButton } from "@/components/social/like-post-button";
import { RepostPostButton } from "@/components/social/repost-post-button";

interface PostCardProps {
  post: {
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
    createdAt: string;
    commentsCount: number;
    likesCount?: number;
    repostOfPost?: {
      id: string;
      title: string;
      slug: string | null;
      author: {
        id: string;
        username: string;
      } | null;
    } | null;
    quotedPost?: {
      id: string;
      title: string;
      slug: string | null;
      author: {
        id: string;
        username: string;
      } | null;
    } | null;
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
  };
}

export function PostCard({ post }: PostCardProps) {
  const href = post.slug ? `/posts/${post.slug}` : "/timeline";

  return (
    <article className="post-card">
      {post.repostOfPost ? (
        <p className="eyebrow" style={{ marginBottom: "10px" }}>
          إعادة نشر
          {post.repostOfPost.author ? ` من @${post.repostOfPost.author.username}` : ""}
        </p>
      ) : null}

      <div className="post-card__meta">
        {post.source ? (
          <SourceBadge name={post.source.name} slug={post.source.slug} />
        ) : null}
        {post.category ? (
          <CategoryBadge name={post.category.name} slug={post.category.slug} />
        ) : null}
      </div>

      <Link href={href} className="post-card__title-link">
        <h3>{post.title}</h3>
      </Link>

      <p className="post-card__excerpt">
        {post.excerpt ?? "لا يوجد ملخص لهذا المنشور حتى الآن."}
      </p>

      {post.quotedPost ? (
        <div className="comment-card" style={{ marginTop: "12px" }}>
          <strong>
            اقتباس من
            {post.quotedPost.author ? ` @${post.quotedPost.author.username}` : ""}
          </strong>
          <p style={{ marginTop: "8px" }}>{post.quotedPost.title}</p>
        </div>
      ) : null}

      <div className="post-card__footer">
        <span>{new Date(post.createdAt).toLocaleString("ar-BH")}</span>
        <span>{post.commentsCount} تعليق</span>
        {post.source ? (
          <Link href={`/sources/${post.source.slug}`}>{post.source.name}</Link>
        ) : null}
        {post.author ? (
          <Link href={`/u/${post.author.username}`}>
            {post.author.username}
          </Link>
        ) : (
          <span>كاتب غير معروف</span>
        )}
        <LikePostButton
          postId={post.id}
          initialLikesCount={post.likesCount ?? 0}
        />
        <BookmarkPostButton postId={post.id} />
        <RepostPostButton postId={post.repostOfPost?.id ?? post.id} />
      </div>
    </article>
  );
}
