/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useRef, useState } from "react";

export function SwipeSidebarShell({ children }: { children: React.ReactNode }) {
  const startXRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      startXRef.current = e.touches[0]?.clientX ?? null;
    }

    function onTouchEnd(e: TouchEvent) {
      if (startXRef.current === null) return;
      const endX = e.changedTouches[0]?.clientX ?? 0;
      const diff = endX - startXRef.current;

      if (diff > 60) {
        setOpen(false);
      } else if (diff < -60) {
        setOpen(true);
      }

      startXRef.current = null;
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadUnread() {
      try {
        const res = await fetch("/api/messages/unread-count", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !active) return;
        const data = payload?.data ?? payload;
        const hasUnread = Boolean(data?.hasUnread) || Number(data?.unreadCount ?? 0) > 0;
        if (active) setHasUnreadMessages(hasUnread);
      } catch {
        // silent
      }
    }

    loadUnread();
    const id = setInterval(loadUnread, 15000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className={`swipe-shell ${open ? "swipe-shell--menu-open" : ""}`}>
      <aside className="swipe-shell__panel">
        <a href="/timeline" className="btn small">الرئيسية</a>
        <a href="/search" className="btn small">البحث</a>
        <a href="/messages" className="btn small" style={{ position: "relative" }}>
          الرسائل
          {hasUnreadMessages ? (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "-2px",
                insetInlineEnd: "-2px",
                width: "10px",
                height: "10px",
                borderRadius: "999px",
                background: "#ef4444",
                border: "2px solid rgba(11,18,32,0.96)",
                boxShadow: "0 0 0 2px rgba(239,68,68,0.25)",
              }}
            />
          ) : null}
        </a>
        <a href="/dashboard" className="btn small">الحساب</a>
      </aside>
      <main className="swipe-shell__content">{children}</main>
    </div>
  );
}
