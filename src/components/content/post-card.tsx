"use client";

import { useState } from "react";
import Link from "next/link";
import { CategoryBadge } from "@/components/content/category-badge";
import { SourceBadge } from "@/components/content/source-badge";
import { TweetActionBar } from "@/components/social/tweet-action-bar";
import { FollowUserButton } from "@/components/social/follow-user-button";
import { TweetOwnerControls } from "@/components/social/tweet-owner-controls";
import { formatRelativeTime, formatDateTimeInMakkah } from "@/lib/date-time";

interface PostCardProps {
  post: {
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
    content?: string | null;
    coverImageUrl?: string | null;
    createdAt: string;
    updatedAt?: string;
    commentsCount: number;
    likesCount?: number;
    repostsCount?: number;
    bookmarksCount?: number;
    viewsCount?: number;
    isPinned?: boolean;
    metadata?: {
      ingestion?: {
        provider?: string;
        fetchedAt?: string;
        originalUrl?: string | null;
      };
      social?: {
        postKind?: string;
        hashtags?: string[];
        mediaType?: "image" | "video" | null;
        mediaUrl?: string | null;
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
      displayName?: string;
      avatarUrl?: string | null;
      isFollowing?: boolean;
      isOwnProfile?: boolean;
    } | null;
  };
  locale?: "ar" | "en";
}

const copy = {
  ar: {
    repost: "إعادة نشر",
    unknownAuthor: "كاتب غير معروف",
    noVisibleText: "لا يوجد نص ظاهر لهذا المنشور حتى الآن.",
    source: "المصدر",
    close: "إغلاق",
    download: "تنزيل",
    edited: "تم التعديل",
  },
  en: {
    repost: "Repost",
    unknownAuthor: "Unknown author",
    noVisibleText: "There is no visible text for this post yet.",
    source: "Source",
    close: "Close",
    download: "Download",
    edited: "Edited",
  },
} as const;

function renderTextWithHashtags(text: string) {
  const parts = text.split(/(#[A-Za-z0-9_\u0600-\u06FF]+)/g);

  return parts.map((part, index) => {
    if (/^#[A-Za-z0-9_\u0600-\u06FF]+$/.test(part)) {
      const tag = part.slice(1).toLowerCase();

      return (
        <Link
          key={`${part}-${index}`}
          href={`/tag/${encodeURIComponent(tag)}`}
          style={{
            color: "#1d9bf0",
            fontWeight: 400,
          }}
        >
          {part}
        </Link>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export function PostCard({
  post,
  locale = "ar",
}: PostCardProps) {
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const t = copy[locale];

  const href = post.slug ? `/posts/${post.slug}` : "/timeline";
  const originalUrl = post.metadata?.ingestion?.originalUrl ?? null;
  const provider = post.metadata?.ingestion?.provider ?? null;
  const social = post.metadata?.social ?? null;
  const isTweet = social?.postKind === "tweet";

  const mediaType =
    social?.mediaType ?? (post.coverImageUrl ? "image" : null);
  const mediaUrl = social?.mediaUrl ?? post.coverImageUrl ?? null;

  const mainText =
    post.content?.trim() ||
    post.excerpt?.trim() ||
    post.title?.trim() ||
    "";

  const username = post.author?.username ?? "unknown";
  const displayName = post.author?.displayName ?? username;
  const wasEdited =
    Boolean(post.updatedAt) &&
    post.updatedAt !== post.createdAt;

  return (
    <>
      <article
        className="tweet-card"
        onClick={(e) => {
          const tag = (e.target as HTMLElement).tagName;
          const closest = (e.target as HTMLElement).closest("a, button, input, textarea, video, audio, [role=\"dialog\"]");
          if (closest) return;
          if (tag === "A" || tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA" || tag === "VIDEO") return;
          window.location.href = href;
        }}
        style={{ cursor: "pointer" }}
      >
        {post.repostOfPost ? (
          <div className="tweet-card__repost-bar">
            🔁 {t.repost}
            {post.repostOfPost.author
              ? ` ${locale === "en" ? "from" : "من"} @${post.repostOfPost.author.username}`
              : ""}
          </div>
        ) : null}

        <div className="tweet-card__body">
          <div className="tweet-card__avatar">
            {post.author?.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt={displayName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "999px",
                }}
              />
            ) : (
              username.charAt(0).toUpperCase()
            )}
          </div>

          <div className="tweet-card__content">
            <div
              className="tweet-card__header"
              style={{
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  minWidth: 0,
                  flex: 1,
                  overflow: "hidden",
                }}
              >
                {post.author ? (
                  <Link
                    href={`/u/${post.author.username}`}
                    style={{
                      fontWeight: 700,
                      fontSize: "15px",
                      color: "#e7e9ea",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {displayName}
                  </Link>
                ) : (
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "#e7e9ea" }}>
                    {t.unknownAuthor}
                  </span>
                )}
                <span style={{ color: "#71767b", fontSize: "15px", whiteSpace: "nowrap" }}>
                  @{username}
                </span>
                <span style={{ color: "#71767b", fontSize: "15px" }}>{"·"}</span>
                <span style={{ color: "#71767b", fontSize: "15px", whiteSpace: "nowrap" }}>
                  {formatRelativeTime(post.createdAt)}
                </span>
              </div>

              {post.author?.isOwnProfile ? (
                <TweetOwnerControls
                  postId={post.id}
                  initialContent={mainText}
                  initialMediaUrl={mediaUrl}
                  initialMediaType={mediaType}
                  initialIsPinned={Boolean(post.isPinned)}
                  compact
                  locale={locale}
                />
              ) : null}
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

            {!isTweet ? (
              <Link href={href} className="tweet-card__title-link">
                <h3>{post.title}</h3>
              </Link>
            ) : null}

            {mainText ? (
              <p dir="auto"
                className="tweet-card__excerpt"
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.8,
                }}
              >
                {renderTextWithHashtags(mainText)}
              </p>
            ) : (
              <p dir="auto"
                className="tweet-card__excerpt"
                style={{ color: "rgba(255,255,255,0.52)" }}
              >
                {t.noVisibleText}
              </p>
            )}

            {mediaUrl && mediaType === "image" ? (
              <button
                type="button"
                onClick={() => setIsMediaOpen(true)}
                style={{
                  marginTop: "12px",
                  overflow: "hidden",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent",
                  padding: 0,
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <img
                  src={mediaUrl}
                  alt={post.title || "Post image"}
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: "460px",
                    objectFit: "cover",
                  }}
                />
              </button>
            ) : null}

            {mediaUrl && mediaType === "video" ? (
              <button
                type="button"
                onClick={() => setIsMediaOpen(true)}
                style={{
                  marginTop: "12px",
                  overflow: "hidden",
                  borderRadius: "22px",
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "#000",
                  padding: 0,
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <video
                  src={mediaUrl}
                  muted
                  playsInline
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: "460px",
                    background: "#000",
                  }}
                />
              </button>
            ) : null}

            {social?.hashtags?.length ? (
              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                {social.hashtags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tag/${encodeURIComponent(tag)}`}
                    style={{
                      color: "#1d9bf0",
                      textDecoration: "none",
                      fontSize: "15px",
                    }}
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : null}

            {wasEdited ? (
              <div style={{ color: "#71767b", fontSize: "13px" }}>
                {t.edited} {"·"} <span suppressHydrationWarning>{formatDateTimeInMakkah(post.updatedAt!, locale === "en" ? "en-US" : "ar-BH")}</span>
              </div>
            ) : null}

            <div style={{ paddingTop: "2px" }}>
              <TweetActionBar
                postId={post.id}
                href={href}
                commentsCount={post.commentsCount}
                initialLikesCount={post.likesCount ?? 0}
                initialRepostsCount={post.repostsCount ?? 0}
                initialBookmarksCount={post.bookmarksCount ?? 0}
                compact
                locale={locale}
              />
            </div>

            {originalUrl ? (
              <div style={{ marginTop: "12px" }}>
                <a
                  href={originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn small"
                >
                  🔗 {t.source}
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </article>

      {isMediaOpen && mediaUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsMediaOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "rgba(0,0,0,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(1200px, 100%)",
              maxHeight: "100%",
              display: "grid",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setIsMediaOpen(false)}
                style={{
                  minHeight: "40px",
                  padding: "0 14px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t.close}
              </button>

              <a
                href={mediaUrl}
                download
                style={{
                  minHeight: "40px",
                  padding: "0 14px",
                  border: "1px solid rgba(125, 211, 252, 0.18)",
                  borderRadius: "999px",
                  background: "rgba(125, 211, 252, 0.12)",
                  color: "#e0f2fe",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {t.download}
              </a>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                maxHeight: "calc(100vh - 120px)",
              }}
            >
              {mediaType === "image" ? (
                <img
                  src={mediaUrl}
                  alt={post.title || "Post image"}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "calc(100vh - 120px)",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <video
                  src={mediaUrl}
                  controls
                  autoPlay
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "calc(100vh - 120px)",
                    background: "#000",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
