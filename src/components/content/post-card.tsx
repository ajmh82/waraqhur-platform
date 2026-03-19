import Link from "next/link";
import { CategoryBadge } from "@/components/content/category-badge";
import { SourceBadge } from "@/components/content/source-badge";

interface PostCardProps {
  post: {
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
  };
}

export function PostCard({ post }: PostCardProps) {
  const href = post.slug ? `/posts/${post.slug}` : "#";

  return (
    <article className="post-card">
      <div className="post-card__meta">
        {post.category ? (
          <CategoryBadge name={post.category.name} slug={post.category.slug} />
        ) : null}
        {post.source ? (
          <SourceBadge name={post.source.name} slug={post.source.slug} />
        ) : null}
      </div>

      <Link href={href} className="post-card__title-link">
        <h3>{post.title}</h3>
      </Link>

      <p className="post-card__excerpt">
        {post.excerpt ?? "No summary available for this post yet."}
      </p>

      <div className="post-card__footer">
        <span>{new Date(post.createdAt).toLocaleDateString("en-GB")}</span>
        <span>{post.commentsCount} comments</span>
        <span>{post.author?.username ?? "Unknown author"}</span>
      </div>
    </article>
  );
}
