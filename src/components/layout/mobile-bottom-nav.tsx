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
      setHasUnreadNotifications(false);
      return;
    }

    let active = true;

    async function loadUnread() {
      try {
        const [messagesResponse, notificationsResponse] = await Promise.all([
          fetch("/api/messages/unread-count", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: { Accept: "application/json" },
          }),
          fetch("/api/notifications/unread-count", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: { Accept: "application/json" },
          }),
        ]);

        const [messagesPayload, notificationsPayload] = await Promise.all([
          messagesResponse.json().catch(() => null),
          notificationsResponse.json().catch(() => null),
        ]);

        if (active) {
          setHasUnreadMessages(
            messagesResponse.ok ? extractHasUnread(messagesPayload) : false
          );
          setHasUnreadNotifications(
            notificationsResponse.ok ? extractHasUnread(notificationsPayload) : false
          );
        }
      } catch {
        if (active) {
          setHasUnreadMessages(false);
          setHasUnreadNotifications(false);
        }
      }
    }

    loadUnread();
    const id = setInterval(loadUnread, 15000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [isAuthenticated, pathname]);

  if (pathname === "/compose" || pathname?.startsWith("/compose/")) {
    return null;
  }

  const isArabic =
    typeof document !== "undefined"
      ? document.documentElement.lang?.toLowerCase().startsWith("ar")
      : true;

  const mode = searchParams?.get("mode") ?? "people";
  const sort = searchParams?.get("sort") ?? "latest";

  const messagesHref =
    isAuthenticated === false ? `/login?next=%2Fmessages` : "/messages";
  const notificationsHref =
    isAuthenticated === false ? `/login?next=%2Fnotifications` : "/notifications";
  const sourcesHref = `/timeline?mode=sources&sort=${encodeURIComponent(sort)}`;

  const navItems = [
    {
      key: "home",
      route: "/timeline",
      href: `/timeline?mode=people&sort=${encodeURIComponent(sort)}`,
      label: isArabic ? "الرئيسية" : "Home",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M3.5 10.2 12 3.5l8.5 6.7v8.6a1.7 1.7 0 0 1-1.7 1.7h-4.1v-6.2h-5.4v6.2H5.2a1.7 1.7 0 0 1-1.7-1.7v-8.6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: "search",
      route: "/search",
      href: "/search",
      label: isArabic ? "بحث" : "Search",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3.6-3.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      key: "sources",
      route: "/timeline",
      href: sourcesHref,
      label: isArabic ? "مصادري" : "Sources",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M4 12c4.5 0 6.8-7.5 16-8-3.2 2.1-5.5 7.6-9.4 12.2C8.6 18.6 6.8 20 4 20c4.5 0 6.8-7.5 16-8-3.2 2.1-5.5 7.6-9.4 12.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: "notifications",
      route: "/notifications",
      href: notificationsHref,
      label: isArabic ? "الإشعارات" : "Notifications",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M12 3a4.7 4.7 0 0 0-4.7 4.7v2.2c0 1.3-.4 2.6-1.2 3.7l-1 1.4h13.8l-1-1.4a6.2 6.2 0 0 1-1.2-3.7V7.7A4.7 4.7 0 0 0 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      key: "messages",
      route: "/messages",
      href: messagesHref,
      label: isArabic ? "الرسائل" : "Messages",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M20 11.2c0 4.5-4.1 8.1-9.2 8.1-1.1 0-2.2-.2-3.2-.6L4 20l1.4-3c-2.3-1.5-3.8-3.6-3.8-5.8C1.6 6.7 5.7 3 10.8 3S20 6.7 20 11.2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ] as const;

  const isActive = (key: string, route: string) => {
    if (key === "home") {
      return (pathname === "/timeline" || pathname === "/") && mode !== "sources";
    }
    if (key === "sources") {
      return (pathname === "/timeline" || pathname === "/") && mode === "sources";
    }
    return pathname?.startsWith(route);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navItems.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`mobile-bottom-nav__item ${isActive(item.key, item.route) ? "is-active" : ""} ${
            "center" in item && item.center ? "is-center" : ""
          }`}
          aria-label={item.label}
          title={item.label}
        >
          <span className="mobile-bottom-nav__icon-wrap" style={{ position: "relative" }}>
            <span className="mobile-bottom-nav__icon" aria-hidden="true">
              {item.icon}
            </span>

            {(item.key === "messages" && hasUnreadMessages) ||
            (item.key === "notifications" && hasUnreadNotifications) ? (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "-3px",
                  insetInlineEnd: "-4px",
                  width: "10px",
                  height: "10px",
                  borderRadius: "999px",
                  background: "#ef4444",
                  border: "2px solid rgba(11,18,32,0.96)",
                  boxShadow: "0 0 0 2px rgba(239,68,68,0.25)",
                }}
              />
            ) : null}

          </span>
        </Link>
      ))}
    </nav>
  );
}
