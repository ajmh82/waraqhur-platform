"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileBottomNavProps {
  locale?: "ar" | "en";
}

const navCopy = {
  ar: {
    home: "الرئيسية",
    media: "الوسائط",
    compose: "كتابة",
    messages: "الرسائل",
    search: "البحث",
  },
  en: {
    home: "Home",
    media: "Media",
    compose: "Compose",
    messages: "Messages",
    search: "Search",
  },
} as const;

export function MobileBottomNav({ locale = "ar" }: MobileBottomNavProps) {
  const pathname = usePathname();
  const copy = navCopy[locale];

  const navItems = [
    { href: "/timeline", label: copy.home, icon: "⌂", side: "normal" as const },
    { href: "/media", label: copy.media, icon: "▣", side: "normal" as const },
    { href: "/compose", label: copy.compose, icon: "+", side: "center" as const },
    { href: "/messages", label: copy.messages, icon: "✉", side: "normal" as const },
    { href: "/search", label: copy.search, icon: "⌕", side: "normal" as const },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/timeline" &&
            item.href !== "/compose" &&
            pathname.startsWith(item.href));

        if (item.side === "center") {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="mobile-bottom-nav__compose"
              aria-label={item.label}
            >
              <span className="mobile-bottom-nav__compose-icon">{item.icon}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-bottom-nav__item ${
              isActive ? "mobile-bottom-nav__item--active" : ""
            }`}
          >
            <span className="mobile-bottom-nav__icon">{item.icon}</span>
            <span className="mobile-bottom-nav__label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
