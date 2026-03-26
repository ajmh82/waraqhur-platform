import Link from "next/link";
import { apiGet } from "@/lib/web-api";
import { LogoutButton } from "@/components/auth/logout-button";

interface CurrentUserData {
  user: { id: string; email: string; username: string; status: string; profile: { displayName: string } | null };
  session: { id: string; expiresAt: string; lastUsedAt: string | null };
}

async function getOptionalCurrentUser() {
  try { return await apiGet<CurrentUserData>("/api/auth/me"); }
  catch { return null; }
}

export async function AppHeader() {
  const currentUser = await getOptionalCurrentUser();

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link href="/" className="app-header__brand">
          <span className="app-header__brand-mark">و</span>
          <span><strong>وراق حر</strong></span>
        </Link>
        <nav className="app-header__nav" aria-label="التنقل الرئيسي">
          <Link href="/">الرئيسية</Link>
          <Link href="/timeline">الموجز</Link>
          {currentUser ? (
            <>
              <Link href="/dashboard">لوحتي</Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login">الدخول</Link>
              <Link href="/register" className="btn small">حساب جديد</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
