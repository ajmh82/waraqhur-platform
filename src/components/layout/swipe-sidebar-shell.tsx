/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useRef, useState } from "react";

export function SwipeSidebarShell({ children }: { children: React.ReactNode }) {
  const startXRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      startXRef.current = e.touches[0]?.clientX ?? null;
    }

    function onTouchEnd(e: TouchEvent) {
      if (startXRef.current === null) return;
      const endX = e.changedTouches[0]?.clientX ?? 0;
      const diff = endX - startXRef.current;

      if (diff > 60) {
        setOpen(false); // swipe right => hide
      } else if (diff < -60) {
        setOpen(true); // swipe left => show
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

  return (
    <div className={`swipe-shell ${open ? "swipe-shell--menu-open" : ""}`}>
      <aside className="swipe-shell__panel">
        <a href="/timeline" className="btn small">الرئيسية</a>
        <a href="/search" className="btn small">البحث</a>
        <a href="/messages" className="btn small">الرسائل</a>
        <a href="/dashboard" className="btn small">الحساب</a>
      </aside>
      <main className="swipe-shell__content">{children}</main>
    </div>
  );
}
