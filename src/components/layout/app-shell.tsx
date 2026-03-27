import Link from "next/link";
import { cookies } from "next/headers";
import { AppHeader } from "@/components/layout/app-header";
import { DirSync } from "@/components/layout/dir-sync";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const isArabic = locale === "ar";

  return (
    <div className="page-stack">
      <DirSync />
      <AppHeader />

      <nav className="global-top-nav" aria-label="Global shortcuts">
        <Link href="/timeline" className="global-top-nav__btn">
          {isArabic ? "الصفحة الرئيسية" : "Home"}
        </Link>
        <Link href="/dashboard" className="global-top-nav__btn">
          {isArabic ? "القائمة" : "Menu"}
        </Link>
      </nav>

      <main className="page-container">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
