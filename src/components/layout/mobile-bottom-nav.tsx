/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function extractHasUnread(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null;

  const hasUnreadDirect = Boolean(data?.hasUnread ?? root.hasUnread);
  const unreadCountRaw = Number(data?.unreadCount ?? root.unreadCount ?? 0);

  return hasUnreadDirect || unreadCountRaw > 0;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

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
  }, [pathname]);

  useEffect(() => {
    if (isAuthenticated === false) {
      setHasUnreadMessages(false);
      return;
    }

    let active = true;

    async function loadUnread() {
      try {
        const response = await fetch("/api/messages/unread-count", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          if (active) setHasUnreadMessages(false);
          return;
        }

        if (active) setHasUnreadMessages(extractHasUnread(payload));
      } catch {
        if (active) setHasUnreadMessages(false);
      }
    }

    loadUnread();
    const id = setInterval(loadUnread, 15000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [isAuthenticated, pathname]);


  useEffect(() => {
    if (isAuthenticated === false) {
      setHasUnreadNotifications(false);
      return;
    }

    let active = true;

    async function loadUnreadNotifications() {
      try {
        const response = await fetch("/api/notifications/unread-count", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          if (active) setHasUnreadNotifications(false);
          return;
        }

        if (active) setHasUnreadNotifications(extractHasUnread(payload));
      } catch {
        if (active) setHasUnreadNotifications(false);
      }
    }

    void loadUnreadNotifications();
    const id = setInterval(loadUnreadNotifications, 15000);

    const onChanged = () => void loadUnreadNotifications();
    window.addEventListener("notifications:changed", onChanged);

    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener("notifications:changed", onChanged);
    };
  }, [isAuthenticated, pathname]);

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
    {
      key: "home",
      route: "/timeline",
      href: "/timeline",
      label: isArabic ? "الرئيسية" : "Home",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
          <path d="M9 21V12h6v9" />
        </svg>
      ),
    },
    {
      key: "search",
      route: "/search",
      href: "/search",
      label: isArabic ? "بحث" : "Search",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
    },
    {
      key: "compose",
      route: "/compose",
      href: composeHref,
      label: isArabic ? "إنشاء" : "Compose",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      ),
      center: true,
    },
    {
      key: "notifications",
      route: "/notifications",
      href: isAuthenticated === false ? `/login?next=%2Fnotifications` : "/notifications",
      label: isArabic ? "الإشعارات" : "Notifications",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      key: "messages",
      route: "/messages",
      href: messagesHref,
      label: isArabic ? "الرسائل" : "Messages",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
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
          className={`mobile-bottom-nav__item ${isActive(item.route) ? "is-active" : ""}`}
          aria-label={item.label}
        >
          <span className="mobile-bottom-nav__icon-wrap">
            {item.icon}

            {((item.key === "messages" && hasUnreadMessages) || (item.key === "notifications" && hasUnreadNotifications)) ? (
              <span className="mobile-bottom-nav__unread-dot" aria-hidden="true" />
            ) : null}
          </span>
        </Link>
      ))}
    </nav>
  );
}
