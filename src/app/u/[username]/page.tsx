import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { TimelineList } from "@/components/content/timeline-list";
import { dashboardApiGet } from "@/lib/dashboard-api";

type TimelinePost = {
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
    category?: { id: string; name: string; slug: string } | null;
    source?: { id: string; name: string; slug: string } | null;
    author: {
      id: string;
      email?: string;
      username: string;
      displayName?: string;
      avatarUrl?: string | null;
    } | null;
    metadata?: {
      social?: {
        postKind?: string;
        hashtags?: string[];
        mediaType?: "image" | "video" | null;
        mediaUrl?: string | null;
      };
    } | null;
  } | null;
  metadata?: {
    social?: {
      postKind?: string;
      hashtags?: string[];
      mediaType?: "image" | "video" | null;
      mediaUrl?: string | null;
    };
  } | null;
};

type UserReply = {
  id: string;
  content: string;
  createdAt: string;
  post?: {
    id: string;
    slug: string | null;
    title?: string | null;
  } | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}
function asNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export default async function PublicUserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const isEn = locale === "en";

  let data: unknown = null;
  try {
    data = await dashboardApiGet<unknown>(
      `/api/users/by-username/${encodeURIComponent(username)}`
    );
  } catch {
    data = null;
  }

  const root = asRecord(data);
  const user = asRecord(root?.user) ?? asRecord(asRecord(root?.data)?.user);
  const profile = asRecord(user?.profile);

  const viewUsername = asString(user?.username, username);
  const displayName = asString(profile?.displayName, viewUsername || username);
  const avatarUrlRaw = asString(profile?.avatarUrl, "");
  const avatarUrl = avatarUrlRaw.trim() ? avatarUrlRaw : null;
  const bio = asString(profile?.bio, "");

  const createdAtRaw = user?.createdAt;
  const createdAt = createdAtRaw
    ? new Date(String(createdAtRaw)).toLocaleDateString(
        isEn ? "en-US" : "ar-BH",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      )
    : isEn
      ? "Not available"
      : "غير متاح";

  const posts = (Array.isArray(user?.posts) ? user?.posts : []) as TimelinePost[];
  const reposts = (Array.isArray(user?.reposts) ? user?.reposts : []) as TimelinePost[];
  const replies = (Array.isArray(user?.replies) ? user?.replies : []) as UserReply[];

  const mergedTimeline = [...posts, ...reposts].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });

  const followersCount = asNumber(
    user?.followersCount ??
      asRecord(root?.stats)?.followersCount ??
      asRecord(asRecord(root?.data)?.stats)?.followersCount
  );
  const followingCount = asNumber(
    user?.followingCount ??
      asRecord(root?.stats)?.followingCount ??
      asRecord(asRecord(root?.data)?.stats)?.followingCount
  );
  const postsCount = posts.length;
  const repliesCount = replies.length;
  const repostsCount = reposts.length;

  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "999px",
              overflow: "hidden",
              flexShrink: 0,
              background: avatarUrl
                ? "transparent"
                : "linear-gradient(135deg, #0ea5e9, #2563eb)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: "24px",
              fontWeight: 900,
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              (displayName || viewUsername || "U").charAt(0).toUpperCase()
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0 }}>{displayName}</h1>
            <p style={{ margin: 0, color: "var(--muted)" }}>@{viewUsername}</p>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "13px" }}>
              {isEn ? "Joined" : "تاريخ التسجيل"}: {createdAt}
            </p>
          </div>
        </div>

        {bio ? (
          <div className="dashboard-list-item">
            <span className="dashboard-list-item__title">{isEn ? "Bio" : "النبذة المختصرة"}</span>
            <span className="dashboard-list-item__body">{bio}</span>
          </div>
        ) : null}

        <div className="dashboard-list-nav">
          <Link
            href={`/u/${encodeURIComponent(viewUsername)}/followers`}
            className="dashboard-list-item"
          >
            <span className="dashboard-list-item__title">{isEn ? "Followers" : "المتابعون"}</span>
            <span className="dashboard-list-item__body">{followersCount}</span>
          </Link>

          <Link
            href={`/u/${encodeURIComponent(viewUsername)}/following`}
            className="dashboard-list-item"
          >
            <span className="dashboard-list-item__title">{isEn ? "Following" : "يتابع"}</span>
            <span className="dashboard-list-item__body">{followingCount}</span>
          </Link>

          <Link
            href={`/u/${encodeURIComponent(viewUsername)}/posts`}
            className="dashboard-list-item"
          >
            <span className="dashboard-list-item__title">
              {isEn ? "Tweets count" : "عدد التغريدات"}
            </span>
            <span className="dashboard-list-item__body">{postsCount}</span>
          </Link>

          <Link
            href={`/u/${encodeURIComponent(viewUsername)}/replies`}
            className="dashboard-list-item"
          >
            <span className="dashboard-list-item__title">{isEn ? "Replies count" : "عدد الردود"}</span>
            <span className="dashboard-list-item__body">{repliesCount}</span>
          </Link>

          <Link
            href={`/u/${encodeURIComponent(viewUsername)}/reposts`}
            className="dashboard-list-item"
          >
            <span className="dashboard-list-item__title">
              {isEn ? "Reposts count" : "عدد إعادة النشر"}
            </span>
            <span className="dashboard-list-item__body">{repostsCount}</span>
          </Link>
        </div>

        <section className="dashboard-list-item" style={{ gap: 10 }}>
          <span className="dashboard-list-item__title">{isEn ? "Replies" : "الردود"}</span>
          {replies.length === 0 ? (
            <span className="dashboard-list-item__body">
              {isEn ? "No replies yet." : "لا توجد ردود حتى الآن."}
            </span>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {replies.slice(0, 5).map((reply) => {
                const href = reply.post?.slug
                  ? `/posts/${reply.post.slug}#comment-${reply.id}`
                  : "/timeline";
                return (
                  <Link key={reply.id} href={href} className="dashboard-list-item" style={{ padding: 10 }}>
                    <span className="dashboard-list-item__body">
                      {(reply.content || "").trim() ||
                        (isEn ? "Reply without content" : "رد بدون نص")}
                    </span>
                  </Link>
                );
              })}
              {replies.length > 5 ? (
                <Link
                  href={`/u/${encodeURIComponent(viewUsername)}/replies`}
                  className="btn small"
                >
                  {isEn ? "View all replies" : "عرض جميع الردود"}
                </Link>
              ) : null}
            </div>
          )}
        </section>

        <section style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: "20px" }}>
            {isEn ? "Timeline (tweets + reposts)" : "التايملاين (تغريدات + إعادة نشر)"}
          </h2>
          {mergedTimeline.length === 0 ? (
            <div className="dashboard-list-item">
              <span className="dashboard-list-item__body">
                {isEn ? "No content to show yet." : "لا يوجد محتوى للعرض حتى الآن."}
              </span>
            </div>
          ) : (
            <TimelineList posts={mergedTimeline} locale={locale} />
          )}
        </section>
      </section>
    </AppShell>
  );
}
