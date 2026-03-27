import Image from "next/image";
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LocaleToggleButton } from "@/components/layout/locale-toggle-button";

interface AccountMenuLabels {
  followers: string;
  following: string;
  publicProfile: string;
  profile: string;
  dashboard: string;
  activity: string;
  notifications: string;
  accountSettings: string;
  security: string;
  settings: string;
  logout?: string;
}

interface AccountMenuProps {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  followersCount: number;
  followingCount: number;
  locale: "ar" | "en";
  labels: AccountMenuLabels;
}

export function AccountMenu({
  username,
  displayName,
  avatarUrl,
  followersCount,
  followingCount,
  locale,
  labels,
}: AccountMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setIsOpen(false);
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="account-menu__trigger"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={displayName}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="account-menu__avatar-image"
          />
        ) : (
          <span className="account-menu__avatar-fallback">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {isOpen ? (
        <div className="account-menu__panel" role="menu">
          <div className="account-menu__profile">
            <div className="account-menu__profile-avatar">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="account-menu__avatar-image"
                />
              ) : (
                <span className="account-menu__avatar-fallback">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="account-menu__profile-text">
              <strong>{displayName}</strong>
              <span>@{username}</span>
            </div>
          </div>

          <div className="account-menu__stats">
            <Link
              href={`/u/${username}/followers`}
              className="account-menu__stat"
              onClick={() => setIsOpen(false)}
            >
              <strong>{followersCount}</strong>
              <span>{labels.followers}</span>
            </Link>

            <Link
              href={`/u/${username}/following`}
              className="account-menu__stat"
              onClick={() => setIsOpen(false)}
            >
              <strong>{followingCount}</strong>
              <span>{labels.following}</span>
            </Link>
          </div>

          <div className="account-menu__links">
            <Link href={`/u/${username}`} onClick={() => setIsOpen(false)}>
              {labels.publicProfile}
            </Link>

            <Link href="/dashboard/profile" onClick={() => setIsOpen(false)}>
              {labels.profile}
            </Link>

            <Link href="/dashboard" onClick={() => setIsOpen(false)}>
              {labels.dashboard}
            </Link>

            <Link href="/dashboard/activity" onClick={() => setIsOpen(false)}>
              {labels.activity}
            </Link>

            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
            >
              {labels.notifications}
            </Link>

            <Link href="/dashboard/account" onClick={() => setIsOpen(false)}>
              {labels.accountSettings}
            </Link>

            <Link href="/dashboard/security" onClick={() => setIsOpen(false)}>
              {labels.security}
            </Link>

            <Link href="/dashboard/settings" onClick={() => setIsOpen(false)}>
              {labels.settings}
            </Link>
          </div>

          <LocaleToggleButton locale={locale} />

          <button
            type="button"
            className="btn small"
            onClick={handleLogout}
            style={{
              width: "100%",
              borderColor: "rgba(248,113,113,0.25)",
              color: "#fecaca",
            }}
          >
            {labels.logout ?? (locale === "en" ? "Log Out" : "تسجيل الخروج")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
