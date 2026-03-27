"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function HeaderTimelineTabs() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "following" ? "following" : "for-you";
  const isArabic =
    typeof document !== "undefined"
      ? document.documentElement.lang?.toLowerCase().startsWith("ar")
      : true;

  return (
    <nav className="app-header__tabs" aria-label="Timeline mode">
      <Link
        href="/timeline?tab=for-you"
        className={`app-header__tab ${tab === "for-you" ? "is-active" : ""}`}
      >
        {isArabic ? "لك" : "For You"}
      </Link>
      <Link
        href="/timeline?tab=following"
        className={`app-header__tab ${tab === "following" ? "is-active" : ""}`}
      >
        {isArabic ? "المتابَعون" : "Following"}
      </Link>
    </nav>
  );
}
