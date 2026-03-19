import Link from "next/link";

const adminLinks = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/invites", label: "Invites" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
] as const;

export function AdminNav() {
  return (
    <nav className="dashboard-nav" aria-label="Admin panel">
      {adminLinks.map((link) => (
        <Link key={link.href} href={link.href} className="dashboard-nav__link">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
