"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Viewer = {
  user?: {
    id: string;
    username: string;
    profile?: { displayName?: string | null; avatarUrl?: string | null } | null;
    followersCount?: number;
    followingCount?: number;
  } | null;
};

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json().catch(() => null))
      .then((p) => {
        if (!mounted) return;
        if (p?.success) setViewer(p?.data ?? null);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  const user = viewer?.user;
  const username = user?.username ?? "user";
  const displayName = user?.profile?.displayName?.trim() || username;
  const avatar = user?.profile?.avatarUrl || "";
  const followers = user?.followersCount ?? 0;
  const following = user?.followingCount ?? 0;

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="account-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Open account menu"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={displayName} className="account-menu__avatar" />
        ) : (
          <span className="account-menu__avatar account-menu__avatar--fallback">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </button>

      {open ? (
        <aside className="account-menu__panel">
          <div className="account-menu__head">
            <div className="account-menu__name">{displayName}</div>
            <div className="account-menu__username">@{username}</div>
          </div>

          <div className="account-menu__stats">
            <Link href={`/u/${username}/following`} className="account-menu__stat" onClick={() => setOpen(false)}>
              <strong>{following}</strong>
              <span>يتابعهم</span>
            </Link>
            <Link href={`/u/${username}/followers`} className="account-menu__stat" onClick={() => setOpen(false)}>
              <strong>{followers}</strong>
              <span>المتابعون</span>
            </Link>
          </div>

          <nav className="account-menu__links">
            <Link href="/dashboard" onClick={() => setOpen(false)}>لوحة المستخدم</Link>
            <Link href="/dashboard/profile" onClick={() => setOpen(false)}>الملف الشخصي</Link>
            <Link href="/dashboard/settings" onClick={() => setOpen(false)}>الإعدادات</Link>
            <Link href="/messages" onClick={() => setOpen(false)}>الرسائل الخاصة</Link>
            <Link href="/search" onClick={() => setOpen(false)}>البحث</Link>
          </nav>
        </aside>
      ) : null}
    </div>
  );
}
