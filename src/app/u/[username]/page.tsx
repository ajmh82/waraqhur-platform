import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { dashboardApiGet } from "@/lib/dashboard-api";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}
function asNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export default async function PublicUserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  let data: unknown = null;
  try {
    data = await dashboardApiGet<unknown>(`/api/users/by-username/${encodeURIComponent(username)}`);
  } catch {
    data = null;
  }

  const root = asRecord(data);
  const user = asRecord(root?.user) ?? asRecord(asRecord(root?.data)?.user);
  const profile = asRecord(user?.profile);

  const viewUsername = asString(user?.username, username);
  const displayName = asString(profile?.displayName, viewUsername || username);
  const avatarUrlRaw = asString(profile?.avatarUrl, "");
  const avatarUrl = avatarUrlRaw.trim() ? avatarUrlRaw : null;

  const createdAtRaw = user?.createdAt;
  const createdAt = createdAtRaw
    ? new Date(String(createdAtRaw)).toLocaleDateString("ar-BH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "غير متاح";

  const followersCount = asNumber(
    user?.followersCount ?? asRecord(root?.stats)?.followersCount ?? asRecord(asRecord(root?.data)?.stats)?.followersCount
  );
  const followingCount = asNumber(
    user?.followingCount ?? asRecord(root?.stats)?.followingCount ?? asRecord(asRecord(root?.data)?.stats)?.followingCount
  );
  const postsCount = asNumber(
    user?.postsCount ?? user?.tweetsCount ?? asRecord(root?.stats)?.postsCount ?? asRecord(asRecord(root?.data)?.stats)?.postsCount
  );
  const repliesCount = asNumber(
    user?.repliesCount ?? asRecord(root?.stats)?.repliesCount ?? asRecord(asRecord(root?.data)?.stats)?.repliesCount
  );
  const repostsCount = Array.isArray(user?.reposts)
    ? user!.reposts!.length
    : asNumber(
        asRecord(root?.stats)?.repostsCount ?? asRecord(asRecord(root?.data)?.stats)?.repostsCount
      );

  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "999px",
              overflow: "hidden",
              flexShrink: 0,
              background: avatarUrl ? "transparent" : "linear-gradient(135deg, #0ea5e9, #2563eb)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: "24px",
              fontWeight: 900,
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              (displayName || viewUsername || "U").charAt(0).toUpperCase()
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0 }}>{displayName}</h1>
            <p style={{ margin: 0, color: "var(--muted)" }}>@{viewUsername}</p>
          </div>
        </div>

        <div className="dashboard-list-nav">
          <div className="dashboard-list-item">
            <span className="dashboard-list-item__title">تاريخ التسجيل</span>
            <span className="dashboard-list-item__body">{createdAt}</span>
          </div>

          <Link href={`/u/${encodeURIComponent(viewUsername)}/followers`} className="dashboard-list-item">
            <span className="dashboard-list-item__title">المتابعون</span>
            <span className="dashboard-list-item__body">{followersCount}</span>
          </Link>

          <Link href={`/u/${encodeURIComponent(viewUsername)}/following`} className="dashboard-list-item">
            <span className="dashboard-list-item__title">يتابع</span>
            <span className="dashboard-list-item__body">{followingCount}</span>
          </Link>

          <Link href={`/u/${encodeURIComponent(viewUsername)}/posts`} className="dashboard-list-item">
            <span className="dashboard-list-item__title">عدد التغريدات</span>
            <span className="dashboard-list-item__body">{postsCount}</span>
          </Link>

          <Link href={`/u/${encodeURIComponent(viewUsername)}/replies`} className="dashboard-list-item">
            <span className="dashboard-list-item__title">عدد الردود</span>
            <span className="dashboard-list-item__body">{repliesCount}</span>
          </Link>

          <Link href={`/u/${encodeURIComponent(viewUsername)}/reposts`} className="dashboard-list-item">
            <span className="dashboard-list-item__title">عدد إعادة النشر</span>
            <span className="dashboard-list-item__body">{repostsCount}</span>
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
