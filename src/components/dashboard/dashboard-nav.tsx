import Link from "next/link";

const dashboardLinks = [
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/account", label: "Account Settings" },
  { href: "/dashboard/security", label: "Security" },
  { href: "/dashboard/invites", label: "Invites" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/activity", label: "Activity" },
] as const;

export function DashboardNav() {
  return (
    <nav className="dashboard-nav" aria-label="User dashboard">
      {dashboardLinks.map((link) => (
        <Link key={link.href} href={link.href} className="dashboard-nav__link">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
