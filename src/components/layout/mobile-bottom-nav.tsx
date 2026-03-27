"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => null);
        const user =
          payload?.data?.user ??
          payload?.data?.current?.user ??
          payload?.data?.currentUser ??
          payload?.user ??
          null;

        if (active) setIsAuthenticated(Boolean(user));
      } catch {
        if (active) setIsAuthenticated(false);
      }
    }

    checkAuth();
    return () => {
      active = false;
    };
  }, []);

  if (pathname === "/compose" || pathname?.startsWith("/compose/")) {
    return null;
  }

  const isArabic =
    typeof document !== "undefined"
      ? document.documentElement.lang?.toLowerCase().startsWith("ar")
      : true;

  const query = searchParams?.toString();
  const currentPath = `${pathname || "/timeline"}${query ? `?${query}` : ""}`;
  const encodedFrom = encodeURIComponent(currentPath);

  const composeHref =
    isAuthenticated === false
      ? `/login?next=${encodedFrom}`
      : `/compose?from=${encodedFrom}`;

  const messagesHref =
    isAuthenticated === false ? `/login?next=%2Fmessages` : "/messages";

  const navItems = [
    { key: "home", route: "/timeline", href: "/timeline", label: isArabic ? "الرئيسية" : "Home", icon: "⌂" },
    { key: "media", route: "/media", href: "/media", label: isArabic ? "الوسائط" : "Media", icon: "▣" },
    { key: "compose", route: "/compose", href: composeHref, label: isArabic ? "إنشاء" : "Compose", icon: "＋", center: true },
    { key: "messages", route: "/messages", href: messagesHref, label: isArabic ? "الرسائل" : "Messages", icon: "✉" },
    { key: "search", route: "/search", href: "/search", label: isArabic ? "بحث" : "Search", icon: "⌕" },
  ] as const;

  const isActive = (route: string) => {
    if (route === "/timeline") return pathname === "/timeline" || pathname === "/";
    return pathname?.startsWith(route);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navItems.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`mobile-bottom-nav__item ${isActive(item.route) ? "is-active" : ""} ${("center" in item && item.center) ? "is-center" : ""}`}
        >
          <span className="mobile-bottom-nav__icon-wrap">
            <span className="mobile-bottom-nav__icon" aria-hidden="true">{item.icon}</span>
          </span>
          <span className="mobile-bottom-nav__label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
