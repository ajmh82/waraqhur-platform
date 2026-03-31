import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { TimelineList } from "@/components/content/timeline-list";
import { ProfileActions } from "@/components/social/profile-actions";
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
  const isOwnProfile = Boolean(user?.isOwnProfile);
  const isFollowing = Boolean(user?.isFollowing);
  const userId = asString(user?.id, "");

  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: 0 }}>
        <div
          style={{
            height: 150,
            background:
              "linear-gradient(135deg, rgba(185,28,28,0.95) 0%, rgba(153,27,27,0.95) 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
          }}
        />
        <section
          style={{
            marginTop: -34,
            paddingInline: 14,
            paddingBottom: 12,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            background: "var(--background)",
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "999px",
              overflow: "hidden",
              border: "4px solid var(--background)",
              background: avatarUrl ? "transparent" : "linear-gradient(135deg, #0ea5e9, #2563eb)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: "26px",
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.15 }}>{displayName}</h1>
              <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: 18 }}>@{viewUsername}</p>
            </div>
            {!isOwnProfile && userId ? (
              <ProfileActions
                targetUserId={userId}
                initialIsFollowing={isFollowing}
                locale={locale}
              />
            ) : null}
          </div>

          {bio ? (
            <p style={{ margin: 0, fontSize: 16, color: "rgba(255,255,255,0.95)", lineHeight: 1.6 }}>
              {bio}
            </p>
          ) : null}

          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
            {isEn ? "Joined" : "انضم"}: {createdAt}
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "var(--muted)" }}>
            <Link href={`/u/${encodeURIComponent(viewUsername)}/following`} style={{ textDecoration: "none" }}>
              <strong style={{ color: "#fff" }}>{followingCount}</strong> {isEn ? "Following" : "يتابع"}
            </Link>
            <Link href={`/u/${encodeURIComponent(viewUsername)}/followers`} style={{ textDecoration: "none" }}>
              <strong style={{ color: "#fff" }}>{followersCount}</strong> {isEn ? "Followers" : "متابعون"}
            </Link>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Link href={`/u/${encodeURIComponent(viewUsername)}/posts`} className="app-header__timeline-tab is-active">
            {isEn ? "Posts" : "التغريدات"} ({postsCount})
          </Link>
          <Link href={`/u/${encodeURIComponent(viewUsername)}/replies`} className="app-header__timeline-tab">
            {isEn ? "Replies" : "الردود"} ({repliesCount})
          </Link>
          <Link href={`/u/${encodeURIComponent(viewUsername)}/reposts`} className="app-header__timeline-tab">
            {isEn ? "Reposts" : "إعادة النشر"} ({repostsCount})
          </Link>
          <Link href={`/u/${encodeURIComponent(viewUsername)}/followers`} className="app-header__timeline-tab">
            {isEn ? "Followers" : "المتابعون"}
          </Link>
        </div>

        <section style={{ display: "grid", gap: 10 }}>
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
