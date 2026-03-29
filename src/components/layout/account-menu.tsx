"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type ApiUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function pickUser(payload: unknown): ApiUser | null {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const current = asRecord(data?.current);

  const user =
    asRecord(data?.user) ??
    asRecord(current?.user) ??
    asRecord(data?.currentUser) ??
    asRecord(root?.user);

  if (!user) return null;

  const profile = asRecord(user.profile);
  const usernameRaw = String(user.username ?? "").trim();
  if (!usernameRaw) return null;

  return {
    id: String(user.id ?? ""),
    username: usernameRaw,
    displayName: String(profile?.displayName ?? usernameRaw).trim() || usernameRaw,
    avatarUrl: profile?.avatarUrl ? String(profile.avatarUrl) : null,
  };
}

function toCount(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function hasUnreadFromPayload(payload: unknown): boolean {
  const root = asRecord(payload);
  const data = asRecord(root?.data);

  const unreadCount = Number(data?.unreadCount ?? root?.unreadCount ?? 0);
  const hasUnreadFlag = Boolean(data?.hasUnread ?? root?.hasUnread);

  return hasUnreadFlag || (Number.isFinite(unreadCount) && unreadCount > 0);
}

export function AccountMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const isArabic =
    typeof document !== "undefined"
      ? document.documentElement.lang?.toLowerCase().startsWith("ar")
      : true;

  const t = useMemo(
    () =>
      isArabic
        ? {
            login: "تسجيل الدخول",
            timeline: "الصفحة الرئيسية",
            dashboard: "لوحة المستخدم",
            profile: "الملف الشخصي",
            settings: "الإعدادات",
            notifications: "الإشعارات",
            messages: "الرسائل الخاصة",
            messagesSettings: "إعدادات الرسائل",
            blockedUsers: "المحظورون",
            activity: "النشاط",
            search: "البحث",
            followers: "المتابعون",
            following: "يتابعهم",
            logout: "تسجيل خروج",
          }
        : {
            login: "Login",
            timeline: "Home",
            dashboard: "Dashboard",
            profile: "Profile",
            settings: "Settings",
            notifications: "Notifications",
            messages: "Messages",
            messagesSettings: "Messages Settings",
            blockedUsers: "Blocked Users",
            activity: "Activity",
            search: "Search",
            followers: "Followers",
            following: "Following",
            logout: "Logout",
          },
    [isArabic]
  );

  useEffect(() => {
    let active = true;

    async function loadSidebarData() {
      try {
        const meResponse = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const mePayload = await meResponse.json().catch(() => null);
        const nextUser = pickUser(mePayload);

        if (!active) return;
        setUser(nextUser);

        const root = asRecord(mePayload);
        const data = asRecord(root?.data);
        const dataUser = asRecord(data?.user) ?? asRecord(asRecord(data?.current)?.user);
        const fallbackFollowers = toCount(dataUser?.followersCount ?? data?.followersCount);
        const fallbackFollowing = toCount(dataUser?.followingCount ?? data?.followingCount);

        setFollowersCount(fallbackFollowers);
        setFollowingCount(fallbackFollowing);

        if (nextUser?.username) {
          const cResponse = await fetch(
            `/api/users/by-username/${encodeURIComponent(nextUser.username)}/connections`,
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
              headers: { Accept: "application/json" },
            }
          );

          const cPayload = await cResponse.json().catch(() => null);
          const cData = asRecord(asRecord(cPayload)?.data);

          const followers = toCount(
            cData?.followersCount ??
              (Array.isArray(cData?.followers) ? cData?.followers.length : undefined)
          );
          const following = toCount(
            cData?.followingCount ??
              (Array.isArray(cData?.following) ? cData?.following.length : undefined)
          );

          if (active) {
            setFollowersCount(followers || fallbackFollowers);
            setFollowingCount(following || fallbackFollowing);
          }
        }
      } catch {
        if (active) {
          setUser(null);
          setFollowersCount(0);
          setFollowingCount(0);
        }
      } finally {
        if (active) setLoaded(true);
      }
    }

    void loadSidebarData();

    const reloadConnections = () => void loadSidebarData();
    window.addEventListener("connections:changed", reloadConnections);

    const statsInterval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadSidebarData();
    }, 20000);

    return () => {
      active = false;
      window.removeEventListener("connections:changed", reloadConnections);
      window.clearInterval(statsInterval);
    };
  }, [pathname]);

  useEffect(() => {
    if (!user) {
      setHasUnreadNotifications(false);
      return;
    }

    let active = true;

    async function loadNotificationBadge() {
      try {
        const response = await fetch("/api/notifications/unread-count", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!active) return;

        if (response.status === 401) {
          setHasUnreadNotifications(false);
          return;
        }

        const payload = await response.json().catch(() => null);
        if (!active) return;

        setHasUnreadNotifications(hasUnreadFromPayload(payload));
      } catch {
        if (active) setHasUnreadNotifications(false);
      }
    }

    void loadNotificationBadge();

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadNotificationBadge();
    }, 15000);

    const onFocus = () => void loadNotificationBadge();
    const onChanged = () => void loadNotificationBadge();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("notifications:changed", onChanged);

    return () => {
      active = false;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("notifications:changed", onChanged);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setHasUnreadMessages(false);
      return;
    }

    let active = true;

    async function loadMessagesBadge() {
      try {
        const response = await fetch("/api/messages/unread-count", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!active) return;

        if (response.status === 401) {
          setHasUnreadMessages(false);
          return;
        }

        const payload = await response.json().catch(() => null);
        if (!active) return;

        setHasUnreadMessages(hasUnreadFromPayload(payload));
      } catch {
        if (active) setHasUnreadMessages(false);
      }
    }

    void loadMessagesBadge();

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadMessagesBadge();
    }, 12000);

    const onFocus = () => void loadMessagesBadge();
    const onChanged = () => void loadMessagesBadge();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("messages:changed", onChanged);

    return () => {
      active = false;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("messages:changed", onChanged);
    };
  }, [user]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  function go(path: string) {
    if (path === "/notifications") {
      setHasUnreadNotifications(false);
    }
    if (path === "/messages") {
      setHasUnreadMessages(false);
    }
    setOpen(false);
    router.push(path);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      setOpen(false);
      setUser(null);
      router.replace("/login");
      router.refresh();
    }
  }

  if (!loaded) return <span className="account-menu__guest-login">...</span>;

  if (!user) {
    return (
      <div className="account-menu account-menu__guest">
        <button type="button" className="account-menu__guest-login" onClick={() => router.push("/login")}>
          {t.login}
        </button>
      </div>
    );
  }

  const hasAnyUnread = hasUnreadNotifications || hasUnreadMessages;

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className={`account-menu__trigger ${hasAnyUnread ? "has-unread" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Open account menu"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt={user.displayName} className="account-menu__avatar" />
        ) : (
          <span className="account-menu__avatar account-menu__avatar--fallback">
            {user.displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="account-menu__backdrop"
            aria-label="Close account menu"
            onClick={() => setOpen(false)}
          />
          <aside className="account-menu__panel account-menu__panel--clean">
          <header className="account-menu__head account-menu__head--clean">
            <div className="account-menu__name">{user.displayName}</div>
            <div className="account-menu__username">@{user.username}</div>
          </header>

          <div className="account-menu__meta-row">
            <button type="button" className="account-menu__meta-btn" onClick={() => go(`/u/${user.username}/following`)}>
              <strong>{followingCount}</strong>
              <span>{t.following}</span>
            </button>
            <button type="button" className="account-menu__meta-btn" onClick={() => go(`/u/${user.username}/followers`)}>
              <strong>{followersCount}</strong>
              <span>{t.followers}</span>
            </button>
          </div>

          <nav className="account-menu__list-nav" aria-label="Account navigation">
            <button type="button" onClick={() => go("/timeline")}>{t.timeline}</button>
            <button type="button" onClick={() => go("/dashboard")}>{t.dashboard}</button>
            <button type="button" onClick={() => go("/dashboard/profile")}>{t.profile}</button>
            <button type="button" onClick={() => go("/dashboard/settings")}>{t.settings}</button>
            <button type="button" onClick={() => go("/notifications")}><span>{t.notifications}</span>{hasUnreadNotifications ? <span className="account-menu__item-dot" aria-hidden="true" /> : null}</button>
            <button type="button" onClick={() => go("/messages")}><span>{t.messages}</span>{hasUnreadMessages ? <span className="account-menu__item-dot" aria-hidden="true" /> : null}</button>
            <button type="button" onClick={() => go("/dashboard/settings/messages")}>{t.messagesSettings}</button>
            <button type="button" onClick={() => go("/dashboard/settings/blocks")}>{t.blockedUsers}</button>
            <button type="button" onClick={() => go("/dashboard/activity")}>{t.activity}</button>
            <button type="button" onClick={() => go("/search")}>{t.search}</button>
            <button type="button" className="account-menu__logout" onClick={handleLogout}>
              {t.logout}
            </button>
          </nav>
          </aside>
        </>
      ) : null}
    </div>
  );
}
