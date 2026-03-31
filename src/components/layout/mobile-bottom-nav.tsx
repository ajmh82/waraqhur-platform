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

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "currentColor" : "currentColor";
  const fill = active ? "currentColor" : "none";
  const sw = active ? "2.2" : "2";

  switch (name) {
    case "home":
      return active ? (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V10.5Z" fill={stroke} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V10.5Z" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );

    case "search":
      return active ? (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10.5" cy="10.5" r="7" stroke={stroke} strokeWidth="2.8"/>
          <path d="M16 16L21 21" stroke={stroke} strokeWidth="2.8" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10.5" cy="10.5" r="7" stroke={stroke} strokeWidth={sw}/>
          <path d="M16 16L21 21" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
        </svg>
      );

    case "compose":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.71 5.63L18.37 3.29C18 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );

    case "notifications":
      return active ? (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8C18 6.4 17.36 4.86 16.24 3.76C15.12 2.64 13.6 2 12 2C10.4 2 8.88 2.64 7.76 3.76C6.64 4.88 6 6.4 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" fill={stroke} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21C13.55 21.3 13.3 21.55 12.99 21.71C12.68 21.88 12.34 21.97 12 21.97C11.66 21.97 11.32 21.88 11.01 21.71C10.7 21.55 10.45 21.3 10.27 21" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8C18 6.4 17.36 4.86 16.24 3.76C15.12 2.64 13.6 2 12 2C10.4 2 8.88 2.64 7.76 3.76C6.64 4.88 6 6.4 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21C13.55 21.3 13.3 21.55 12.99 21.71C12.68 21.88 12.34 21.97 12 21.97C11.66 21.97 11.32 21.88 11.01 21.71C10.7 21.55 10.45 21.3 10.27 21" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );

    case "messages":
      return active ? (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 11.5C21.02 12.83 20.7 14.15 20.08 15.33C19.34 16.73 18.22 17.88 16.84 18.63C15.46 19.39 13.9 19.73 12.33 19.6C11.07 19.5 9.85 19.1 8.78 18.44L3 20L4.56 15.22C3.9 14.15 3.5 12.93 3.4 11.67C3.27 10.1 3.61 8.54 4.37 7.16C5.12 5.78 6.27 4.66 7.67 3.92C8.85 3.3 10.17 2.98 11.5 3H12C14.08 3.12 16.05 3.99 17.53 5.47C19.01 6.95 19.88 8.92 20 11V11.5Z" fill={stroke} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 11.5C21.02 12.83 20.7 14.15 20.08 15.33C19.34 16.73 18.22 17.88 16.84 18.63C15.46 19.39 13.9 19.73 12.33 19.6C11.07 19.5 9.85 19.1 8.78 18.44L3 20L4.56 15.22C3.9 14.15 3.5 12.93 3.4 11.67C3.27 10.1 3.61 8.54 4.37 7.16C5.12 5.78 6.27 4.66 7.67 3.92C8.85 3.3 10.17 2.98 11.5 3H12C14.08 3.12 16.05 3.99 17.53 5.47C19.01 6.95 19.88 8.92 20 11V11.5Z" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );

    default:
      return null;
  }
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
    { key: "home",          route: "/timeline",      href: "/timeline" },
    { key: "search",        route: "/search",        href: "/search" },
    { key: "compose",       route: "/compose",       href: composeHref },
    { key: "notifications", route: "/notifications", href: notificationsHref },
    { key: "messages",      route: "/messages",      href: messagesHref },
  ] as const;

  const isActive = (route: string) => {
    if (route === "/timeline") return pathname === "/timeline" || pathname === "/";
    return pathname?.startsWith(route);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navItems.map((item) => {
        const active = Boolean(isActive(item.route));
        const hasUnread =
          (item.key === "messages" && hasUnreadMessages) ||
          (item.key === "notifications" && hasUnreadNotifications);

        return (
          <Link
            key={item.key}
            href={item.href}
            className={`mobile-bottom-nav__item ${active ? "mobile-bottom-nav__item--active" : ""}`}
            aria-label={item.key}
          >
            <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <NavIcon name={item.key} active={active} />

              {hasUnread ? (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "-3px",
                    insetInlineEnd: "-5px",
                    width: "9px",
                    height: "9px",
                    borderRadius: "999px",
                    background: "#1d9bf0",
                    border: "2px solid rgba(15,23,42,0.72)",
                  }}
                />
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
