import { TimelineList } from "@/components/content/timeline-list";
import { AppHeader } from "@/components/layout/app-header";
import { FollowProfileForm } from "@/components/social/follow-profile-form";
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

export default async function PublicUserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const { profileData, currentUser, error } = await loadPublicUserPageData(username);

  if (error || !profileData) {
    return (
      <main className="page-stack">
        <div className="page-container">
          <AppHeader />
          <ErrorState
            title="تعذر تحميل الملف العام"
            description={error ?? "تعذر تحميل الملف العام للمستخدم."}
          />
        </div>
      </main>
    );
  }

  const profile = profileData.user.profile;
  const isOwnProfile = profileData.user.isOwnProfile;

  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <section className="hero-panel">
          <p className="eyebrow">الملف العام</p>
          <h1 className="hero-panel__title">
            {profile?.displayName ?? profileData.user.username}
          </h1>
          <p className="hero-panel__description">
            {profile?.bio ??
              "هذا هو الملف العام للمستخدم داخل ورق حر، وسيصبح لاحقًا نقطة الارتكاز لميزات المتابعة والتايم لاين الشخصي والتفاعل الاجتماعي."}
          </p>

          <div className="hero-metrics">
            <article className="hero-metric">
              <strong>@{profileData.user.username}</strong>
              <span>اسم المستخدم</span>
            </article>
            <article className="hero-metric">
              <strong>{profileData.user.posts.length}</strong>
              <span>منشورات منشورة</span>
            </article>
            <article className="hero-metric">
              <strong>{profileData.user.followersCount}</strong>
              <span>متابعون</span>
            </article>
            <article className="hero-metric">
              <strong>{profileData.user.followingCount}</strong>
              <span>يتابع</span>
            </article>
          </div>

          {!isOwnProfile && currentUser ? (
            <div style={{ marginTop: "18px" }}>
              <FollowProfileForm
                userId={profileData.user.id}
                isFollowing={profileData.user.isFollowing}
              />
            </div>
          ) : null}

          <p className="hero-panel__description">
            {isOwnProfile
              ? "أنت تشاهد ملفك العام الآن."
              : currentUser
                ? "أنت تشاهد الملف العام لمستخدم آخر ويمكنك الآن متابعته مباشرة من هذه الصفحة."
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
      </div>
    </main>
  );
}
