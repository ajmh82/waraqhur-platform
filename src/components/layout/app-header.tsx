/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AccountMenu } from "@/components/layout/account-menu";

type AccountMenuComponent = (props: Record<string, unknown>) => ReactElement;
const SafeAccountMenu = AccountMenu as unknown as AccountMenuComponent;

export function AppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isArabic =
    typeof document !== "undefined"
      ? document.documentElement.lang?.toLowerCase().startsWith("ar")
      : true;
  const isMessagesRoute = pathname?.startsWith("/messages");
  const isTimelineRoute = pathname === "/" || pathname?.startsWith("/timeline");

  if (isMessagesRoute) {
    return null;
  }

  const mode = searchParams?.get("mode") === "sources" ? "sources" : "people";
  const sort = searchParams?.get("sort") ?? "latest";

  return (
    <header className="app-header app-header--neo app-header--constrained">
      <div className="app-header__inner app-header__inner--social">
        <div className="app-header__side app-header__side--left" />
        <div className="app-header__center">
          <Link
            href="/timeline"
            className="app-header__brand"
            style={{ fontWeight: 900, letterSpacing: "0.02em", fontSize: "20px" }}
            aria-label="Waraqhur Home"
          >
            ورق حر
          </Link>
        </div>
        <div className="app-header__side app-header__side--right">
          <SafeAccountMenu />
        </div>
      </div>
      {isTimelineRoute ? (
        <div className="app-header__timeline-tabs">
          <Link
            href={`/timeline?mode=people&sort=${encodeURIComponent(sort)}`}
            className={`app-header__timeline-tab ${
              mode === "people" ? "is-active" : ""
            }`}
          >
            {isArabic ? "ورق" : "Waraq"}
          </Link>
          <Link
            href={`/timeline?mode=sources&sort=${encodeURIComponent(sort)}`}
            className={`app-header__timeline-tab ${
              mode === "sources" ? "is-active" : ""
            }`}
          >
            {isArabic ? "مصادري" : "My Sources"}
          </Link>
        </div>
      ) : null}
    </header>
  );
}
