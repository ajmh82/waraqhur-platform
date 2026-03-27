import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ThreadedComments } from "@/components/comments/threaded-comments";
import { FollowUserButton } from "@/components/social/follow-user-button";
import { StartDirectMessageButton } from "@/components/social/start-direct-message-button";
import { TweetActionBar } from "@/components/social/tweet-action-bar";
import { TweetOwnerControls } from "@/components/social/tweet-owner-controls";
import { formatDateTimeInMakkah, formatRelativeTime } from "@/lib/date-time";
import { apiGet } from "@/lib/web-api";

interface PostPageData {
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
    category: { id: string; name: string; slug: string } | null;
    source: { id: string; name: string; slug: string } | null;
    author: {
      id: string;
      email: string;
      username: string;
      displayName?: string;
      avatarUrl?: string | null;
      isFollowing?: boolean;
      isOwnProfile?: boolean;
    } | null;
    repostOfPost?: {
      id: string;
      title: string;
      slug: string | null;
      author: { id: string; username: string } | null;
    } | null;
    quotedPost?: {
      id: string;
      title: string;
      slug: string | null;
      author: { id: string; username: string } | null;
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
  };
  comments: Array<{
    id: string;
    postId: string;
    parentId: string | null;
    content: string;
    createdAt: string;
    likesCount: number;
    isLikedByCurrentUser: boolean;
    author: {
      id: string;
      username: string;
      email: string;
      displayName: string;
      avatarUrl: string | null;
    } | null;
    replies: Array<any>;
  }>;
  currentUser: {
    user: {
      id: string;
      username: string;
    };
  } | null;
}

const copy = {
  ar: {
    unknownAuthor: "كاتب غير معروف",
    noText: "لا يوجد نص ظاهر لهذا المنشور.",
    directMessage: "مراسلة خاصة",
    editProfile: "تعديل الملف",
    settings: "الإعدادات",
    source: "المصدر",
    comments: "الردود",
    commentsCount: "رد",
    edited: "تم التعديل",
    repost: "إعادة نشر",
    close: "إغلاق",
    download: "تنزيل",
  },
  en: {
    unknownAuthor: "Unknown author",
    noText: "There is no visible text for this post.",
    directMessage: "Direct Message",
    editProfile: "Edit Profile",
    settings: "Settings",
    source: "Source",
    comments: "Replies",
    commentsCount: "replies",
    edited: "Edited",
    repost: "Repost",
    close: "Close",
    download: "Download",
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

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = copy[locale];

  let data: PostPageData | null = null;

  try {
    data = await apiGet<PostPageData>(`/api/posts/${encodeURIComponent(slug)}`);
  } catch {
    notFound();
  }

  const { post, comments, currentUser } = data;
  const href = post.slug ? `/posts/${post.slug}` : "/timeline";
  const originalUrl = post.metadata?.ingestion?.originalUrl ?? null;
  const provider = post.metadata?.ingestion?.provider ?? null;
  const social = post.metadata?.social ?? null;
  const mediaType = social?.mediaType ?? (post.coverImageUrl ? "image" : null);
  const mediaUrl = social?.mediaUrl ?? post.coverImageUrl ?? null;
  const mainText =
    post.content?.trim() ||
    post.excerpt?.trim() ||
    post.title?.trim() ||
    "";
  const username = post.author?.username ?? "unknown";
  const displayName = post.author?.displayName ?? username;
  const wasEdited = Boolean(post.updatedAt) && post.updatedAt !== post.createdAt;

  return (
    <AppShell>
      <section
        className="page-section"
        style={{ display: "grid", gap: "16px" }}
      >
        <article
          className="state-card"
          style={{
            margin: 0,
            maxWidth: "100%",
            padding: "20px",
            display: "grid",
            gap: "18px",
          }}
        >
          {post.repostOfPost ? (
            <div style={{ color: "var(--muted)", fontSize: "13px", fontWeight: 700 }}>
              🔁 {t.repost}
              {post.repostOfPost.author
                ? ` ${locale === "en" ? "from" : "من"} @${post.repostOfPost.author.username}`
                : ""}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              gap: "14px",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: "58px",
                height: "58px",
                borderRadius: "999px",
                overflow: "hidden",
                flexShrink: 0,
                background: post.author?.avatarUrl
                  ? "transparent"
                  : "linear-gradient(135deg, #0ea5e9, #2563eb)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                fontSize: "20px",
              }}
            >
              {post.author?.avatarUrl ? (
                <img
                  src={post.author.avatarUrl}
                  alt={displayName}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                username.charAt(0).toUpperCase()
              )}
            </div>

            <div style={{ display: "grid", gap: "12px", flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "grid", gap: "4px" }}>
                  <strong style={{ fontSize: "20px" }}>
                    {post.author ? (
                      <Link href={`/u/${post.author.username}`}>
                        {displayName}
                      </Link>
                    ) : (
                      t.unknownAuthor
                    )}
                  </strong>

                  <span style={{ color: "var(--muted)", fontSize: "14px" }}>
                    @{username}
                  </span>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      flexWrap: "wrap",
                      color: "var(--muted)",
                      fontSize: "13px",
                    }}
                  >
                    <span>{formatRelativeTime(post.createdAt)}</span>
                    {provider ? <span>• {provider}</span> : null}
                    <span>• 👁 {post.viewsCount ?? 0}</span>
                  </div>
                </div>

                {post.author && !post.author.isOwnProfile ? (
                  <FollowUserButton
                    userId={post.author.id}
                    initialIsFollowing={Boolean(post.author.isFollowing)}
                    locale={locale}
                  />
                ) : null}
              </div>

              {!post.author?.isOwnProfile && post.author ? (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <StartDirectMessageButton
                    targetUserId={post.author.id}
                    label={t.directMessage}
                    className="btn small"
                    locale={locale}
                  />
                </div>
              ) : null}

              {post.author?.isOwnProfile ? (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Link href="/dashboard/profile" className="btn small">
                    {t.editProfile}
                  </Link>
                  <Link href="/dashboard/settings" className="btn small">
                    {t.settings}
                  </Link>
                </div>
              ) : null}

              {mainText ? (
                <div
                  style={{
                    lineHeight: 1.9,
                    whiteSpace: "pre-wrap",
                    fontSize: "16px",
                  }}
                >
                  {renderTextWithHashtags(mainText)}
                </div>
              ) : (
                <p style={{ margin: 0, color: "var(--muted)" }}>{t.noText}</p>
              )}

              {mediaUrl && mediaType === "image" ? (
                <div
                  style={{
                    overflow: "hidden",
                    borderRadius: "22px",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <img
                    src={mediaUrl}
                    alt={post.title || "Post image"}
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: "560px",
                      objectFit: "cover",
                    }}
                  />
                </div>
              ) : null}

              {mediaUrl && mediaType === "video" ? (
                <div
                  style={{
                    overflow: "hidden",
                    borderRadius: "22px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "#000",
                  }}
                >
                  <video
                    src={mediaUrl}
                    controls
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: "560px",
                      background: "#000",
                    }}
                  />
                </div>
              ) : null}

              {social?.hashtags?.length ? (
                <div
                  style={{
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

              {post.author?.isOwnProfile ? (
                <TweetOwnerControls
                  postId={post.id}
                  initialContent={mainText}
                  initialMediaUrl={mediaUrl}
                  initialMediaType={mediaType}
                  locale={locale}
                />
              ) : null}

              {wasEdited ? (
                <div style={{ color: "var(--muted)", fontSize: "13px" }}>
                  {t.edited} •{" "}
                  {formatDateTimeInMakkah(
                    post.updatedAt!,
                    locale === "en" ? "en-US" : "ar-BH"
                  )}
                </div>
              ) : null}

              <TweetActionBar
                postId={post.id}
                href={href}
                commentsCount={post.commentsCount}
                initialLikesCount={post.likesCount ?? 0}
                initialRepostsCount={post.repostsCount ?? 0}
                initialBookmarksCount={post.bookmarksCount ?? 0}
                locale={locale}
              />

              {originalUrl ? (
                <div>
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

        <section
          className="state-card"
          style={{
            margin: 0,
            maxWidth: "100%",
            padding: "20px",
            display: "grid",
            gap: "16px",
          }}
        >
          <div style={{ display: "grid", gap: "4px" }}>
            <h2 style={{ margin: 0, fontSize: "22px" }}>{t.comments}</h2>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              {comments.length} {t.commentsCount}
            </p>
          </div>

          <ThreadedComments
            postId={post.id}
            initialComments={comments}
            currentUserId={currentUser?.user?.id ?? null}
            locale={locale}
          />
        </section>
      </section>
    </AppShell>
  );
}
