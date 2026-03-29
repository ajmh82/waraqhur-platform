import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { dashboardApiGet } from "@/lib/dashboard-api";

type UserRepost = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  createdAt: string;
  repostOfPost?: {
    id: string;
    slug: string | null;
    title: string;
    author?: { username?: string | null } | null;
  } | null;
};

type RepostsData = {
  user: {
    username: string;
    profile?: { displayName?: string | null } | null;
    reposts?: UserRepost[];
  };
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export default async function UserRepostsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  let data: RepostsData | null = null;
  try {
    data = await dashboardApiGet<RepostsData>(`/api/users/by-username/${encodeURIComponent(username)}`);
  } catch {
    data = null;
  }

  const user = asRecord(data?.user);
  const viewUsername = asString(user?.username, username);
  const profile = asRecord(user?.profile);
  const displayName = asString(profile?.displayName, viewUsername);

  const reposts = Array.isArray(data?.user?.reposts) ? data!.user!.reposts : [];

  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>إعادات النشر @{viewUsername}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>{displayName}</p>

        {reposts.length === 0 ? (
          <div className="dashboard-list-item">
            <span className="dashboard-list-item__body">لا توجد إعادات نشر حتى الآن.</span>
          </div>
        ) : (
          <div className="dashboard-list-nav">
            {reposts.map((post) => {
              const targetHref = post.repostOfPost?.slug
                ? `/posts/${post.repostOfPost.slug}`
                : post.slug
                  ? `/posts/${post.slug}`
                  : "/timeline";

              const fromUser = post.repostOfPost?.author?.username
                ? ` • من @${post.repostOfPost.author.username}`
                : "";

              return (
                <Link key={post.id} href={targetHref} className="dashboard-list-item">
                  <span className="dashboard-list-item__title">
                    {(post.repostOfPost?.title || post.title || "").trim() || "إعادة نشر بدون عنوان"}
                  </span>
                  <span className="dashboard-list-item__body">
                    {(post.excerpt || "").trim() || "بدون نص مختصر"}{fromUser} •{" "}
                    {new Date(post.createdAt).toLocaleString("ar-BH")}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
