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

  const query = searchParams?.toString();
  const currentPath = `${pathname || "/timeline"}${query ? `?${query}` : ""}`;
  const encodedFrom = encodeURIComponent(currentPath);

  const composeHref =
    isAuthenticated === false
      ? `/login?next=${encodedFrom}`
      : `/compose?from=${encodedFrom}`;

  const messagesHref =
    isAuthenticated === false ? `/login?next=%2Fmessages` : "/messages";
  const notificationsHref =
    isAuthenticated === false ? `/login?next=%2Fnotifications` : "/notifications";

  const navItems = [
    {
      key: "home",
      route: "/timeline",
      href: "/timeline",
      label: isArabic ? "الرئيسية" : "Home",
      icon: "⌂",
    },
    {
      key: "notifications",
      route: "/notifications",
      href: notificationsHref,
      label: isArabic ? "الإشعارات" : "Notifications",
      icon: "🔔",
    },
    {
      key: "compose",
      route: "/compose",
      href: composeHref,
      label: isArabic ? "إنشاء" : "Compose",
      icon: "＋",
      center: true,
    },
    {
      key: "messages",
      route: "/messages",
      href: messagesHref,
      label: isArabic ? "الرسائل" : "Messages",
      icon: "✉",
    },
    {
      key: "search",
      route: "/search",
      href: "/search",
      label: isArabic ? "بحث" : "Search",
      icon: "⌕",
    },
  ] as const;

  const isActive = (route: string) => {
    if (route === "/timeline") return pathname === "/timeline" || pathname === "/";
    return pathname?.startsWith(route);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation" style={{ display: "flex" }}>
      {navItems.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`mobile-bottom-nav__item ${isActive(item.route) ? "is-active" : ""} ${
            "center" in item && item.center ? "is-center" : ""
          }`}
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

          <span className="mobile-bottom-nav__label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
