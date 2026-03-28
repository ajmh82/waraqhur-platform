"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

function toUnreadNotificationsCount(payload: unknown): number {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const notifications = Array.isArray(data?.notifications) ? data.notifications : [];

  return notifications.reduce((sum, item) => {
    const row = asRecord(item);
    return row?.readAt ? sum : sum + 1;
  }, 0);
}

export function AccountMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
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
            blockedUsers: "المحظورون",
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
            blockedUsers: "Blocked Users",
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
          setUnreadNotifications(0);
        }
      } finally {
        if (active) setLoaded(true);
      }
    }

    loadSidebarData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setUnreadNotifications(0);
      return;
    }

    let active = true;

    async function loadUnreadNotifications() {
      try {
        const res = await fetch("/api/notifications/unread-count", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const payload = await res.json().catch(() => null);
        if (!active) return;

        if (!res.ok || !payload?.success) {
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
  }, [user?.id]);

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
    setOpen(false);
    router.push(path);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      setOpen(false);
      setUser(null);
      setUnreadNotifications(0);
      router.replace("/login");
      router.refresh();
    }
  }

  if (!loaded) {
    return <span className="account-menu__guest-login">...</span>;
  }

  if (!user) {
    return (
      <div className="account-menu account-menu__guest">
        <button type="button" className="account-menu__guest-login" onClick={() => router.push("/login")}>
          {t.login}
        </button>
      </div>
    );
  }

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="account-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Open account menu"
        style={{ position: "relative" }}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt={user.displayName} className="account-menu__avatar" />
        ) : (
          <span className="account-menu__avatar account-menu__avatar--fallback">
            {user.displayName.slice(0, 1).toUpperCase()}
          </span>
        )}

        {unreadNotifications > 0 ? (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 2,
              insetInlineEnd: 2,
              width: 10,
              height: 10,
              borderRadius: "999px",
              background: "#ef4444",
              boxShadow: "0 0 0 2px rgba(11,18,32,0.96), 0 0 12px rgba(239,68,68,0.55)",
            }}
          />
        ) : null}
      </button>

      {open ? (
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
            <button type="button" onClick={() => go("/messages")}>{t.messages}</button>
            <button type="button" onClick={() => go("/dashboard/settings/blocks")}>{t.blockedUsers}</button>
            <button type="button" onClick={() => go("/search")}>{t.search}</button>
            <button type="button" className="account-menu__logout" onClick={handleLogout}>
              {t.logout}
            </button>
          </nav>
        </aside>
      ) : null}
    </div>
  );
}
