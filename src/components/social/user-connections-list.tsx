import Link from "next/link";
import { FollowUserButton } from "@/components/social/follow-user-button";

interface ConnectionUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowing?: boolean;
}

interface UserConnectionsListProps {
  title: string;
  emptyMessage: string;
  users: ConnectionUser[];
  locale?: "ar" | "en";
}

const copy = {
  ar: {
    accounts: "حساب",
    viewProfile: "عرض الحساب",
  },
  en: {
    accounts: "accounts",
    viewProfile: "View Profile",
  },
} as const;

export function UserConnectionsList({
  title,
  emptyMessage,
  users,
  locale = "ar",
}: UserConnectionsListProps) {
  const t = copy[locale];

  return (
    <section
      className="state-card"
      style={{
        margin: 0,
        maxWidth: "100%",
        display: "grid",
        gap: "14px",
        padding: "18px",
      }}
    >
      <div style={{ display: "grid", gap: "4px" }}>
        <h1 style={{ margin: 0, fontSize: "24px" }}>{title}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {users.length} {t.accounts}
        </p>
      </div>

      {users.length === 0 ? (
        <div
          style={{
            borderRadius: "18px",
            padding: "18px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--muted)",
          }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {users.map((user) => (
            <article
              key={user.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "14px",
                borderRadius: "18px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "999px",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: user.avatarUrl
                      ? "transparent"
                      : "linear-gradient(135deg, #0ea5e9, #2563eb)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                  }}
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    user.displayName.charAt(0).toUpperCase()
                  )}
                </div>

                <div style={{ minWidth: 0, display: "grid", gap: "3px" }}>
                  <strong
                    style={{
                      fontSize: "15px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user.displayName}
                  </strong>
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: "13px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    @{user.username}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <FollowUserButton
                  userId={user.id}
                  initialIsFollowing={Boolean(user.isFollowing)}
                  locale={locale}
                />
                <Link href={`/u/${user.username}`} className="btn small" style={{ flexShrink: 0 }}>
                  {t.viewProfile}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
