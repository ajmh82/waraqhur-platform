/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

export function GlobalBackButton() {
  const [mounted, setMounted] = useState(false);
  const [pathname, setPathname] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setPathname(window.location.pathname);
  }, []);

  if (!mounted) return null;
  if (!pathname || pathname === "/" || pathname === "/timeline") return null;

  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
        window.location.assign("/timeline");
      }}
      className="global-back-btn"
    >
      ←
    </button>
  );
}
