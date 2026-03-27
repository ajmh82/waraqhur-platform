"use client";

import { useSearchParams } from "next/navigation";

export function TimelineModeStrip() {
  const params = useSearchParams();
  const tab = params.get("tab") === "following" ? "following" : "for-you";
  const isArabic =
    typeof document !== "undefined"
      ? document.documentElement.lang?.toLowerCase().startsWith("ar")
      : true;

  const label =
    tab === "following"
      ? isArabic ? "الوضع الحالي: المتابَعون" : "Current mode: Following"
      : isArabic ? "الوضع الحالي: لك" : "Current mode: For You";

  return (
    <div className="timeline-mode-strip" role="status" aria-live="polite">
      {label}
    </div>
  );
}
