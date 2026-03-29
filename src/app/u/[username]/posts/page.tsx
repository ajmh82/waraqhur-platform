import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { dashboardApiGet } from "@/lib/dashboard-api";

type UserPost = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  createdAt: string;
};

type UserPageData = {
  user: {
    username: string;
    profile?: { displayName?: string | null } | null;
    posts?: UserPost[];
  };
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export default async function UserPostsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  let data: UserPageData | null = null;
  try {
    data = await dashboardApiGet<UserPageData>(`/api/users/by-username/${encodeURIComponent(username)}`);
  } catch {
    data = null;
  }

  const user = asRecord(data?.user);
  const viewUsername = asString(user?.username, username);
  const profile = asRecord(user?.profile);
  const displayName = asString(profile?.displayName, viewUsername);

  const rawPosts = Array.isArray(data?.user?.posts) ? data!.user!.posts : [];

  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>تغريدات @{viewUsername}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>{displayName}</p>

        {rawPosts.length === 0 ? (
          <div className="dashboard-list-item">
            <span className="dashboard-list-item__body">لا توجد تغريدات حتى الآن.</span>
          </div>
        ) : (
          <div className="dashboard-list-nav">
            {rawPosts.map((post) => (
              <Link
                key={post.id}
                href={post.slug ? `/posts/${post.slug}` : `/timeline`}
                className="dashboard-list-item"
              >
                <span className="dashboard-list-item__title">{post.title || "منشور بدون عنوان"}</span>
                <span className="dashboard-list-item__body">
                  {(post.excerpt || "").trim() || "بدون نص مختصر"} •{" "}
                  {new Date(post.createdAt).toLocaleString("ar-BH")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
