"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface TimelineSortTabsProps {
  sortMode: "latest" | "smart";
  locale?: "ar" | "en";
}

const copy = {
  ar: {
    latest: "الأحدث",
    smart: "الذكي",
  },
  en: {
    latest: "For You",
    smart: "Following",
  },
} as const;

export function TimelineSortTabs({
  sortMode,
  locale = "ar",
}: TimelineSortTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const t = copy[locale];

  function handleSelect(nextSortMode: "latest" | "smart") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", nextSortMode);

    startTransition(async () => {
      try {
        await fetch("/api/preferences/timeline-sort", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sort: nextSortMode,
          }),
        });
      } catch {
        // ignore
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      router.refresh();
    });
  }

  return (
    <div className="timeline-sort-tabs" aria-label="Timeline sort">
      <button
        type="button"
        onClick={() => handleSelect("latest")}
        className={`timeline-sort-tabs__tab ${
          sortMode === "latest" ? "timeline-sort-tabs__tab--active" : ""
        }`}
        disabled={isPending}
        aria-pressed={sortMode === "latest"}
      >
        {t.latest}
      </button>

      <button
        type="button"
        onClick={() => handleSelect("smart")}
        className={`timeline-sort-tabs__tab ${
          sortMode === "smart" ? "timeline-sort-tabs__tab--active" : ""
        }`}
        disabled={isPending}
        aria-pressed={sortMode === "smart"}
      >
        {t.smart}
      </button>
    </div>
  );
}
