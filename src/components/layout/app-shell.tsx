import { cookies } from "next/headers";
import { AppHeader } from "@/components/layout/app-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  return (
    <div className="page-stack">
      <AppHeader />
      <main className="page-container">{children}</main>
      <MobileBottomNav locale={locale} />
    </div>
  );
}
