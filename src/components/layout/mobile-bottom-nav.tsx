"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function toUnreadNotificationsCount(payload: unknown): number {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const notifications = Array.isArray(data?.notifications) ? data.notifications : [];

  return notifications.reduce((sum, item) => {
    const row = asRecord(item);
    return row?.readAt ? sum : sum + 1;
  }, 0);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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

    void checkAuth();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotifications(0);
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

        if (!active) return;

        if (!response.ok || !payload?.success) {
          setUnreadNotifications(0);
          return;
        }

        setUnreadNotifications(toUnreadNotificationsCount(payload));
      } catch {
        if (active) {
          setUnreadNotifications(0);
        }
      }
    }

    void loadUnreadNotifications();
    const id = setInterval(() => {
      void loadUnreadNotifications();
    }, 15000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [isAuthenticated]);

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
      label: isArabic ? "الإشعارات" : "Alerts",
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
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navItems.map((item) => {
        const showNotificationDot = item.key === "notifications" && unreadNotifications > 0;

        return (
          <Link
            key={item.key}
            href={item.href}
            className={`mobile-bottom-nav__item ${isActive(item.route) ? "is-active" : ""} ${
              "center" in item && item.center ? "is-center" : ""
            }`}
            onClick={() => {
              if (item.key === "notifications") {
                setUnreadNotifications(0);
              }
            }}
          >
            <span className="mobile-bottom-nav__icon-wrap" style={{ position: "relative" }}>
              <span className="mobile-bottom-nav__icon" aria-hidden="true">
                {item.icon}
              </span>

              {showNotificationDot ? (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: -3,
                    insetInlineEnd: -4,
                    width: 9,
                    height: 9,
                    borderRadius: "999px",
                    background: "#ef4444",
                    boxShadow: "0 0 0 2px rgba(11,18,32,0.96), 0 0 10px rgba(239,68,68,0.55)",
                  }}
                />
              ) : null}
            </span>
            <span className="mobile-bottom-nav__label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
