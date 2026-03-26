import Link from "next/link";
import { TimelineList } from "@/components/content/timeline-list";
import { AppShell } from "@/components/layout/app-shell";
import { FollowProfileForm } from "@/components/social/follow-profile-form";
import { StartDirectMessageButton } from "@/components/social/start-direct-message-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface PublicUserProfileData {
  user: {
    id: string;
    username: string;
    status: string;
    createdAt: string;
    profile: {
      displayName: string;
      bio: string | null;
      avatarUrl: string | null;
      locale: string | null;
      timezone: string | null;
    } | null;
    roles: Array<{
      key: string;
      name: string;
    }>;
    followersCount: number;
    followingCount: number;
    isOwnProfile: boolean;
    isFollowing: boolean;
    posts: Array<{
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
    }>;
  };
}

interface CurrentUserData {
  user: {
    id: string;
    email: string;
    username: string;
    status: string;
    profile: {
      displayName: string;
      bio: string | null;
      avatarUrl: string | null;
      locale: string | null;
      timezone: string | null;
    } | null;
  };
  session: {
    id: string;
    expiresAt: string;
    lastUsedAt: string | null;
  };
}

interface PublicUserPageResult {
  profileData: PublicUserProfileData | null;
  currentUser: CurrentUserData["user"] | null;
  error: string | null;
}

async function loadPublicUserPageData(
  username: string
): Promise<PublicUserPageResult> {
  try {
    const profileData = await apiGet<PublicUserProfileData>(
      `/api/users/by-username/${username}`
    );

    try {
      const currentUserData = await apiGet<CurrentUserData>("/api/auth/me");

      return {
        profileData,
        currentUser: currentUserData.user,
        error: null,
      };
    } catch {
      return {
        profileData,
        currentUser: null,
        error: null,
      };
    }
  } catch (error) {
    return {
      profileData: null,
      currentUser: null,
      error:
        error instanceof Error
          ? error.message
          : "تعذر تحميل الملف العام للمستخدم.",
    };
  }
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

export default async function PublicUserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const { profileData, currentUser, error } =
    await loadPublicUserPageData(username);

  if (error || !profileData) {
    return (
      <AppShell>
        <section className="page-section">
          <ErrorState
            title="تعذر تحميل الملف العام"
            description={error ?? "تعذر تحميل الملف العام للمستخدم."}
          />
        </section>
      </AppShell>
    );
  }

  const profile = profileData.user.profile;
  const isOwnProfile = profileData.user.isOwnProfile;
  const displayName = profile?.displayName ?? profileData.user.username;

  return (
    <AppShell>
      <section className="hero-panel">
        <div
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <div
            className="tweet-card__avatar"
            style={{ width: "72px", height: "72px", fontSize: "28px" }}
          >
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profileData.user.username}
                className="account-menu__avatar-image"
              />
            ) : (
              getInitial(displayName)
            )}
          </div>

          <div style={{ display: "grid", gap: "6px" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              الملف العام
            </p>
            <h1 className="hero-panel__title" style={{ margin: 0 }}>
              {displayName}
            </h1>
            <p
              style={{
                margin: 0,
                color: "var(--muted)",
                fontSize: "14px",
              }}
            >
              @{profileData.user.username}
            </p>
          </div>
        </div>

        <p className="hero-panel__description">
          {profile?.bio ??
            "هذا هو الملف العام للمستخدم داخل ورق حر، ويجمع المنشورات والعلاقات الاجتماعية والوصول السريع إلى المتابعة والمراسلة."}
        </p>

        <div className="hero-metrics">
          <article className="hero-metric">
            <strong>{profileData.user.posts.length}</strong>
            <span>منشورات منشورة</span>
          </article>
          <Link
            href={`/u/${profileData.user.username}/followers`}
            className="hero-metric"
          >
            <strong>{profileData.user.followersCount}</strong>
            <span>متابعون</span>
          </Link>
          <Link
            href={`/u/${profileData.user.username}/following`}
            className="hero-metric"
          >
            <strong>{profileData.user.followingCount}</strong>
            <span>يتابع</span>
          </Link>
        </div>

        {!isOwnProfile && currentUser ? (
          <div
            style={{
              marginTop: "18px",
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "start",
            }}
          >
            <FollowProfileForm
              userId={profileData.user.id}
              isFollowing={profileData.user.isFollowing}
            />
            <StartDirectMessageButton
              targetUserId={profileData.user.id}
              className="btn small"
            />
          </div>
        ) : null}

        <div
          style={{
            marginTop: "18px",
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <Link href={`/u/${profileData.user.username}/followers`} className="btn small">
            عرض المتابعين
          </Link>
          <Link href={`/u/${profileData.user.username}/following`} className="btn small">
            عرض المتابَعين
          </Link>
          <Link href="/search" className="btn small">
            البحث
          </Link>
          <Link href="/messages" className="btn small">
            الرسائل
          </Link>
        </div>

        <p className="hero-panel__description">
          {isOwnProfile
            ? "أنت تشاهد ملفك العام الآن ويمكنك منه الوصول بسرعة إلى المتابعين والمتابَعين ورسائلك."
            : currentUser
              ? "أنت تشاهد الملف العام لمستخدم آخر ويمكنك الآن متابعته أو مراسلته مباشرة من هذه الصفحة."
              : "أنت تشاهد الملف العام كزائر غير مسجل دخول."}
        </p>
      </section>

      <section className="page-section">
        {profileData.user.posts.length === 0 ? (
          <EmptyState
            title="لا توجد منشورات لهذا المستخدم بعد"
            description="عندما يبدأ المستخدم بالنشر سيظهر محتواه هنا."
          />
        ) : (
          <TimelineList
            posts={profileData.user.posts.map((post) => ({
              ...post,
              author: {
                id: profileData.user.id,
                email: "",
                username: profileData.user.username,
              },
            }))}
          />
        )}
      </section>
    </AppShell>
  );
}
