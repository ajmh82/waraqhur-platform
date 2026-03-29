"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarContextNav() {
  const pathname = usePathname();
  const isArabic =
    typeof document !== "undefined"
      ? document.documentElement.lang?.toLowerCase().startsWith("ar")
      : true;

  // يظهر فقط داخل صفحات الداشبورد (خيارات السايدبار)
  if (!pathname?.startsWith("/dashboard")) return null;

  return (
    <nav
      aria-label="Sidebar context navigation"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        gap: "8px",
        marginBottom: "10px",
        padding: "8px 0",
        background: "var(--background)",
      }}
    >
      <Link href="/timeline" className="btn small">
        {isArabic ? "الصفحة الرئيسية" : "Home"}
      </Link>
      <Link href="/dashboard" className="btn small">
        {isArabic ? "القائمة" : "Menu"}
      </Link>
    </nav>
  );
}
