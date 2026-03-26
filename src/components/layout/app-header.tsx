import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
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

function getInitials(
  profile: CurrentUserData["user"]["profile"],
  username: string
) {
  const source = profile?.displayName?.trim() || username.trim() || "?";
  return source.charAt(0).toUpperCase();
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
            <details className="account-menu">
              <summary className="account-menu__trigger">
                {currentUser.user.profile?.avatarUrl ? (
                  <img
                    src={currentUser.user.profile.avatarUrl}
                    alt={currentUser.user.username}
                    className="account-menu__avatar-image"
                  />
                ) : (
                  <span className="account-menu__avatar-fallback">
                    {getInitials(
                      currentUser.user.profile,
                      currentUser.user.username
                    )}
                  </span>
                )}
              </summary>

              <div className="account-menu__panel">
                <div className="account-menu__profile">
                  <div className="account-menu__profile-avatar">
                    {currentUser.user.profile?.avatarUrl ? (
                      <img
                        src={currentUser.user.profile.avatarUrl}
                        alt={currentUser.user.username}
                        className="account-menu__avatar-image"
                      />
                    ) : (
                      <span className="account-menu__avatar-fallback">
                        {getInitials(
                          currentUser.user.profile,
                          currentUser.user.username
                        )}
                      </span>
                    )}
                  </div>

                  <div className="account-menu__profile-text">
                    <strong>
                      {currentUser.user.profile?.displayName ??
                        currentUser.user.username}
                    </strong>
                    <span>@{currentUser.user.username}</span>
                  </div>
                </div>

                <div className="account-menu__stats">
                  <Link
                    href={`/u/${currentUser.user.username}/followers`}
                    className="account-menu__stat"
                  >
                    <strong>{currentUser.user.followersCount ?? 0}</strong>
                    <span>{copy.followers}</span>
                  </Link>

                  <Link
                    href={`/u/${currentUser.user.username}/following`}
                    className="account-menu__stat"
                  >
                    <strong>{currentUser.user.followingCount ?? 0}</strong>
                    <span>{copy.following}</span>
                  </Link>
                </div>

                <nav className="account-menu__links">
                  <Link href={`/u/${currentUser.user.username}`}>
                    {copy.publicProfile}
                  </Link>
                  <Link href="/dashboard/profile">{copy.profile}</Link>
                  <Link href="/dashboard">{copy.dashboard}</Link>
                  <Link href="/dashboard/activity">{copy.activity}</Link>
                  <Link href="/dashboard/notifications">{copy.notifications}</Link>
                  <Link href="/dashboard/account">{copy.accountSettings}</Link>
                  <Link href="/dashboard/security">{copy.security}</Link>
                  <Link href="/dashboard/settings">{copy.settings}</Link>
                </nav>

                <div className="account-menu__logout">
                  <LogoutButton />
                </div>
              </div>
            </details>
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
          <Link href="/" className="app-header__brand app-header__brand--centered">
            <span className="app-header__brand-mark">و</span>
          </Link>
        </div>

        <div className="app-header__side app-header__side--left">
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <Link href="/" className="btn small">
              {copy.home}
            </Link>
            <Link href="/timeline" className="btn small">
              {copy.timelineTitle}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
