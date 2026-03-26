import Link from "next/link";
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
  };
  session: {
    id: string;
    expiresAt: string;
    lastUsedAt: string | null;
  };
}

async function getOptionalCurrentUser() {
  try {
    return await apiGet<CurrentUserData>("/api/auth/me");
  } catch {
    return null;
  }
}

export async function MobileBottomNav() {
  const currentUser = await getOptionalCurrentUser();
  const composeHref = currentUser ? "/admin/posts/new" : "/login";
  const locale = normalizeUiLocale(currentUser?.user.profile?.locale);
  const copy = uiCopy[locale];

  return (
    <nav className="mobile-bottom-nav" aria-label={copy.bottomNavLabel}>
      <Link href="/" className="mobile-bottom-nav__item">
        <span className="mobile-bottom-nav__icon">⌂</span>
        <span>{copy.home}</span>
      </Link>

      <Link href="/media" className="mobile-bottom-nav__item">
        <span className="mobile-bottom-nav__icon">▣</span>
        <span>{copy.media}</span>
      </Link>

      <Link
        href={composeHref}
        className="mobile-bottom-nav__item mobile-bottom-nav__item--compose"
        aria-label={copy.compose}
      >
        <span className="mobile-bottom-nav__icon">＋</span>
      </Link>

      <Link href="/messages" className="mobile-bottom-nav__item">
        <span className="mobile-bottom-nav__icon">✉</span>
        <span>{copy.messages}</span>
      </Link>

      <Link href="/search" className="mobile-bottom-nav__item">
        <span className="mobile-bottom-nav__icon">⌕</span>
        <span>{copy.search}</span>
      </Link>
    </nav>
  );
}
