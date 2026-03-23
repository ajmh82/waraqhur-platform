import Link from "next/link";

const adminLinks = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/invites", label: "Invites" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/comment-replies", label: "Comment Replies" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
] as const;

export function AdminNav() {
  return (
    <nav
      className="dashboard-nav"
      aria-label="Admin panel"
      style={{ display: "grid", gap: "10px" }}
    >
      {adminLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="dashboard-nav__link"
          style={{ display: "block" }}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
