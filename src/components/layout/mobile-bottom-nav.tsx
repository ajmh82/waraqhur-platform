"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/timeline", label: "Home", icon: "⌂" },
  { href: "/media", label: "Media", icon: "▣" },
  { href: "/compose", label: "＋", icon: "＋", center: true },
  { href: "/messages", label: "Messages", icon: "✉" },
  { href: "/search", label: "Search", icon: "⌕" },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/timeline") return pathname === "/timeline" || pathname === "/";
    if (href === "/compose") return pathname?.startsWith("/compose");
    return pathname?.startsWith(href);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`mobile-bottom-nav__item ${isActive(item.href) ? "is-active" : ""} ${item.center ? "is-center" : ""}`}
        >
          <span className="mobile-bottom-nav__icon" aria-hidden="true">{item.icon}</span>
          <span className="mobile-bottom-nav__label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
