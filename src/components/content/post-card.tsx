"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CategoryBadge } from "@/components/content/category-badge";
import { SourceBadge } from "@/components/content/source-badge";
import { TweetActionBar } from "@/components/social/tweet-action-bar";
import { FollowUserButton } from "@/components/social/follow-user-button";
import { TweetOwnerControls } from "@/components/social/tweet-owner-controls";
import { formatRelativeTime } from "@/lib/date-time";

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
      excerpt?: string | null;
      content?: string | null;
      coverImageUrl?: string | null;
      createdAt?: string;
      updatedAt?: string;
      commentsCount?: number;
      likesCount?: number;
      repostsCount?: number;
      bookmarksCount?: number;
      viewsCount?: number;
      category?: {
        id: string;
        name: string;
        slug: string;
      } | null;
      source?: {
        id: string;
        name: string;
        slug: string;
      } | null;
      author: {
        id: string;
        email?: string;
        username: string;
        displayName?: string;
        avatarUrl?: string | null;
        isFollowing?: boolean;
        isOwnProfile?: boolean;
      } | null;
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
    source: "المصدر",
    close: "إغلاق",
    download: "تنزيل",
    edited: "تم التعديل",
  },
  en: {
    repost: "Repost",
    unknownAuthor: "Unknown author",
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
            color: "#7dd3fc",
            fontWeight: 700,
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
  const router = useRouter();
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const t = copy[locale];
  const targetPost = post.repostOfPost ?? post;
  const repostActor = post.repostOfPost ? post.author : null;
  const href = `/posts/${encodeURIComponent(targetPost.slug ?? targetPost.id)}`;
  const originalUrl = targetPost.metadata?.ingestion?.originalUrl ?? null;
  const provider = targetPost.metadata?.ingestion?.provider ?? null;
  const social = targetPost.metadata?.social ?? null;
  const isTweet = social?.postKind === "tweet";

  const mediaType = social?.mediaType ?? (targetPost.coverImageUrl ? "image" : null);
  const mediaUrl = social?.mediaUrl ?? targetPost.coverImageUrl ?? null;

  const titleText = (targetPost.title || "").trim();
  const bodyText = ((targetPost.content || targetPost.excerpt || "") || "").trim();
  const showTitle = !isTweet && titleText.length > 0;
  const showBodyText = !showTitle || bodyText.length === 0 ? bodyText : bodyText !== titleText ? bodyText : "";
  const mainText = isTweet
    ? targetPost.content?.trim() || targetPost.excerpt?.trim() || titleText
    : showBodyText;

  const username = targetPost.author?.username ?? "unknown";
  const displayName = targetPost.author?.displayName ?? username;
  const wasEdited = Boolean(targetPost.updatedAt) && targetPost.updatedAt !== targetPost.createdAt;

  function handleCardClick(event: React.MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a,button,input,textarea,select,label,video")) {
      return;
    }
    router.push(href);
  }

  return (
    <>
      <article
        className="tweet-card"
        onClick={handleCardClick}
        style={{ cursor: "pointer" }}
      >
        {post.repostOfPost && repostActor ? (
          <div className="tweet-card__repost-bar">
            🔁 {locale === "en" ? `@${repostActor.username} reposted` : `@${repostActor.username} أعاد النشر`}
          </div>
        ) : null}

        <div className="tweet-card__body">
          <Link href={`/u/${encodeURIComponent(username)}`} className="tweet-card__avatar">
            {targetPost.author?.avatarUrl ? (
              <img
                src={targetPost.author.avatarUrl}
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
          </Link>

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
                  gap: "12px",
                  alignItems: "flex-start",
                  flex: 1,
                }}
              >
                <div style={{ display: "grid", gap: "4px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ fontSize: "16px", lineHeight: 1.2 }}>
                      {targetPost.author ? (
                        <Link href={`/u/${encodeURIComponent(targetPost.author.username)}`}>
                          {displayName}
                        </Link>
                      ) : (
                        t.unknownAuthor
                      )}
                    </strong>
                    <span
                      dir="ltr"
                      style={{
                        color: "rgba(255,255,255,0.58)",
                        fontSize: "13px",
                        unicodeBidi: "plaintext",
                      }}
                    >
                      @{username}
                    </span>
                  </div>

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
                    <span>
                      {formatRelativeTime(post.createdAt)} • {(post.viewsCount ?? 0).toLocaleString()}{" "}
                      {locale === "en" ? "Views" : "مشاهدة"}
                    </span>
                    {provider ? <span>• {provider}</span> : null}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                {targetPost.author && !targetPost.author.isOwnProfile ? (
                  <FollowUserButton
                    userId={targetPost.author.id}
                    initialIsFollowing={Boolean(targetPost.author.isFollowing)}
                    locale={locale}
                    hideWhenFollowing
                  />
                ) : null}
                {targetPost.author?.isOwnProfile ? (
                  <div className="tweet-card__owner-controls">
                    <TweetOwnerControls
                      postId={post.id}
                      initialContent={post.content?.trim() || post.excerpt?.trim() || post.title?.trim() || ""}
                      initialMediaUrl={mediaUrl}
                      initialMediaType={mediaType}
                      initialIsPinned={Boolean(post.isPinned)}
                      compact
                      locale={locale}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="tweet-card__badges">
              {targetPost.source ? (
                <SourceBadge name={targetPost.source.name} slug={targetPost.source.slug} />
              ) : null}
              {targetPost.category ? (
                <CategoryBadge
                  name={targetPost.category.name}
                  slug={targetPost.category.slug}
                />
              ) : null}
            </div>

            {showTitle ? (
              <Link href={href} className="tweet-card__title-link">
                <h3>{titleText}</h3>
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
            ) : null}

            {mediaUrl && mediaType === "image" ? (
              <button
                type="button"
                onClick={() => setIsMediaOpen(true)}
                style={{
                  marginTop: "12px",
                  overflow: "hidden",
                  borderRadius: "22px",
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.025)",
                  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.16)",
                  padding: 0,
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <img
                  src={mediaUrl}
                  alt={titleText || "Post image"}
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
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: "34px",
                      padding: "0 12px",
                      borderRadius: "999px",
                      background: "rgba(125, 211, 252, 0.12)",
                      color: "#bae6fd",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: 700,
                      border: "1px solid rgba(125, 211, 252, 0.14)",
                    }}
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : null}

            {wasEdited ? (
              <div
                style={{
                  color: "var(--muted)",
                  fontSize: "13px",
                }}
              >
                {t.edited} • <span suppressHydrationWarning>{formatDateTimeInMakkah(post.updatedAt!, locale === "en" ? "en-US" : "ar-BH")}</span>
              </div>
            ) : null}

            <div style={{ marginTop: "14px" }}>
              <TweetActionBar
                postId={targetPost.id}
                href={href}
                commentsCount={targetPost.commentsCount ?? 0}
                initialLikesCount={targetPost.likesCount ?? 0}
                initialRepostsCount={targetPost.repostsCount ?? 0}
                initialBookmarksCount={targetPost.bookmarksCount ?? 0}
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
                  alt={titleText || "Post image"}
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
