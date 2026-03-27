import Image from "next/image";
import Link from "next/link";
import { FollowUserButton } from "@/components/social/follow-user-button";
import { StartDirectMessageButton } from "@/components/social/start-direct-message-button";
import { TimelineList } from "@/components/content/timeline-list";

interface ProfilePost {
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
      originalUrl?: string | null;
    };
    social?: {
      postKind?: string;
      hashtags?: string[];
      mediaType?: "image" | "video" | null;
      mediaUrl?: string | null;
    };
  } | null;
}

interface PublicProfileViewProps {
  locale?: "ar" | "en";
  user: {
    id: string;
    username: string;
    email?: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    followersCount: number;
    followingCount: number;
    isFollowing: boolean;
    isOwnProfile: boolean;
  };
  posts: ProfilePost[];
}

const copy = {
  ar: {
    followers: "متابع",
    following: "يتابع",
    dm: "مراسلة خاصة",
    editProfile: "تعديل الملف",
    settings: "الإعدادات",
    posts: "التغريدات",
    tweetCount: "تغريدة",
    empty: "لا توجد تغريدات لهذا الحساب حتى الآن.",
  },
  en: {
    followers: "Followers",
    following: "Following",
    dm: "Direct Message",
    editProfile: "Edit Profile",
    settings: "Settings",
    posts: "Posts",
    tweetCount: "posts",
    empty: "This account has no posts yet.",
  },
} as const;

export function PublicProfileView({
  locale = "ar",
  user,
  posts,
}: PublicProfileViewProps) {
  const t = copy[locale];

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <section
        className="state-card"
        style={{
          margin: 0,
          maxWidth: "100%",
          padding: "20px",
          display: "grid",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: "92px",
              height: "92px",
              borderRadius: "999px",
              overflow: "hidden",
              flexShrink: 0,
              background: user.avatarUrl
                ? "transparent"
                : "linear-gradient(135deg, #0ea5e9, #2563eb)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: "28px",
              fontWeight: 900,
            }}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              user.displayName.charAt(0).toUpperCase()
            )}
          </div>

          <div style={{ display: "grid", gap: "10px", flex: 1, minWidth: 0 }}>
            <div style={{ display: "grid", gap: "4px" }}>
              <h1 style={{ margin: 0, fontSize: "28px", lineHeight: 1.2 }}>
                {user.displayName}
              </h1>
              <p style={{ margin: 0, color: "var(--muted)" }}>
                @{user.username}
              </p>
            </div>

            {user.bio ? (
              <p
                style={{
                  margin: 0,
                  lineHeight: 1.8,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                {user.bio}
              </p>
            ) : null}

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Link href={`/u/${user.username}/followers`} className="btn small">
                {user.followersCount} {t.followers}
              </Link>

              <Link href={`/u/${user.username}/following`} className="btn small">
                {user.followingCount} {t.following}
              </Link>
            </div>

            {!user.isOwnProfile ? (
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <FollowUserButton
                  userId={user.id}
                  initialIsFollowing={user.isFollowing}
                  locale={locale}
                />

                <StartDirectMessageButton
                  targetUserId={user.id}
                  label={t.dm}
                  className="btn small"
                  locale={locale}
                />
              </div>
            ) : (
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Link href="/dashboard/profile" className="btn small">
                  {t.editProfile}
                </Link>
                <Link href="/dashboard/settings" className="btn small">
                  {t.settings}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

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
          <h2 style={{ margin: 0, fontSize: "22px" }}>{t.posts}</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            {posts.length} {t.tweetCount}
          </p>
        </div>

        {posts.length === 0 ? (
          <div
            style={{
              borderRadius: "18px",
              padding: "18px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--muted)",
            }}
          >
            {t.empty}
          </div>
        ) : (
          <TimelineList posts={posts} />
        )}
      </section>
    </div>
  );
}
