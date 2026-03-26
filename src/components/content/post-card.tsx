"use client";

import Link from "next/link";
import { CategoryBadge } from "@/components/content/category-badge";
import { SourceBadge } from "@/components/content/source-badge";
import { formatRelativeTime } from "@/lib/date-time";
import { LikePostButton } from "@/components/social/like-post-button";
import { BookmarkPostButton } from "@/components/social/bookmark-post-button";
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
    metadata?: {
      ingestion?: {
        provider?: string;
        fetchedAt?: string;
        originalUrl?: string | null;
      };
    } | null;
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
  const originalUrl = post.metadata?.ingestion?.originalUrl ?? null;
  const provider = post.metadata?.ingestion?.provider ?? null;

  return (
    <article className="tweet-card">
      {post.repostOfPost ? (
        <div className="tweet-card__repost-bar">
          🔁 إعادة نشر
          {post.repostOfPost.author
            ? ` من @${post.repostOfPost.author.username}`
            : ""}
        </div>
      ) : null}

      <div className="tweet-card__body">
        <div className="tweet-card__avatar">
          {(post.author?.username ?? "؟").charAt(0).toUpperCase()}
        </div>

        <div className="tweet-card__content">
          <div className="tweet-card__header">
            <span className="tweet-card__author">
              {post.author ? (
                <Link href={`/u/${post.author.username}`}>
                  {post.author.username}
                </Link>
              ) : (
                "كاتب غير معروف"
              )}
            </span>

            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap",
                color: "rgba(255,255,255,0.58)",
                fontSize: "13px",
              }}
            >
              <span className="tweet-card__time">
                {formatRelativeTime(post.createdAt)}
              </span>
              {provider ? <span>• {provider}</span> : null}
            </div>
          </div>

          <div className="tweet-card__badges">
            {post.source ? (
              <SourceBadge name={post.source.name} slug={post.source.slug} />
            ) : null}
            {post.category ? (
              <CategoryBadge
                name={post.category.name}
                slug={post.category.slug}
              />
            ) : null}
          </div>

          <Link href={href} className="tweet-card__title-link">
            <h3>{post.title}</h3>
          </Link>

          {post.excerpt ? (
            <p className="tweet-card__excerpt">{post.excerpt}</p>
          ) : (
            <p
              className="tweet-card__excerpt"
              style={{ color: "rgba(255,255,255,0.52)" }}
            >
              لا يوجد ملخص مختصر لهذا المنشور حتى الآن.
            </p>
          )}

          {post.quotedPost ? (
            <div className="tweet-card__quote">
              <strong>
                اقتباس
                {post.quotedPost.author
                  ? ` من @${post.quotedPost.author.username}`
                  : ""}
              </strong>
              <p>{post.quotedPost.title}</p>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: "10px",
              color: "rgba(255,255,255,0.62)",
              fontSize: "13px",
            }}
          >
            <span>💬 {post.commentsCount} تعليق</span>
            <span>❤️ {post.likesCount ?? 0} إعجاب</span>
            {post.source ? <span>📡 {post.source.name}</span> : null}
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <LikePostButton
              postId={post.id}
              initialLikesCount={post.likesCount ?? 0}
            />
            <BookmarkPostButton postId={post.id} />
            <RepostPostButton postId={post.id} />

            <Link href={href} className="btn small">
              قراءة ومناقشة
            </Link>

            {originalUrl ? (
              <a
                href={originalUrl}
                target="_blank"
                rel="noreferrer"
                className="btn small"
              >
                🔗 المصدر
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
