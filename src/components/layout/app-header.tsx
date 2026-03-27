import Link from "next/link";
import { AccountMenu } from "@/components/layout/account-menu";
import { normalizeUiLocale, uiCopy } from "@/lib/ui-copy";
import { apiGet } from "@/lib/web-api";

interface CurrentUserData {
  user: {
    id: string;
    email: string;
    username: string;
    status: string;
    profile: {
      displayName: string;
      avatarUrl?: string | null;
      locale?: string | null;
    } | null;
    followersCount?: number;
    followingCount?: number;
  };
  session: {
    id: string;
    expiresAt: string;
    lastUsedAt: string | null;
  };
}

async function getOptionalCurrentUser() {
  try {
    const current = await apiGet<CurrentUserData>("/api/auth/me");
    const publicProfile = await apiGet<{
      user: {
        followersCount: number;
        followingCount: number;
      };
    }>(`/api/users/by-username/${current.user.username}`);

    return {
      ...current,
      user: {
        ...current.user,
        followersCount: publicProfile.user.followersCount,
        followingCount: publicProfile.user.followingCount,
      },
    };
  } catch {
    return null;
  }
}

export async function AppHeader() {
  const currentUser = await getOptionalCurrentUser();
  const locale = normalizeUiLocale(currentUser?.user.profile?.locale);
  const copy = uiCopy[locale];

  return (
    <header className="app-header">
      <div className="app-header__inner app-header__inner--social">
        <div className="app-header__side app-header__side--right">
          {currentUser ? (
            <AccountMenu
              username={currentUser.user.username}
              displayName={
                currentUser.user.profile?.displayName ??
                currentUser.user.username
              }
              avatarUrl={currentUser.user.profile?.avatarUrl ?? null}
              followersCount={currentUser.user.followersCount ?? 0}
              followingCount={currentUser.user.followingCount ?? 0}
              locale={locale === "en" ? "en" : "ar"}
              labels={{
                followers: copy.followers,
                following: copy.following,
                publicProfile: copy.publicProfile,
                profile: copy.profile,
                dashboard: copy.dashboard,
                activity: copy.activity,
                notifications: copy.notifications,
                accountSettings: copy.accountSettings,
                security: copy.security,
                settings: copy.settings,
                logout: locale === "en" ? "Log Out" : "تسجيل الخروج",
              }}
            />
          ) : (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link href="/login" className="btn small">
                {copy.login}
              </Link>
              <Link href="/register" className="btn small">
                {copy.register}
              </Link>
            </div>
          )}
        </div>

        <div className="app-header__center">
          <Link
            href="/timeline"
            className="app-header__brand app-header__brand--centered"
          >
            <span className="app-header__brand-mark">و</span>
          </Link>
        </div>

        <div className="app-header__side app-header__side--left" />
      </div>
    </header>
  );
}
