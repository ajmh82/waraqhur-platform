import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { dashboardApiGet } from "@/lib/dashboard-api";

type UserReply = {
  id: string;
  content: string;
  createdAt: string;
  post?: {
    id: string;
    slug: string | null;
    title?: string | null;
  } | null;
};

type ReplyData = {
  user: {
    username: string;
    profile?: { displayName?: string | null } | null;
    replies?: UserReply[];
  };
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export default async function UserRepliesPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  let data: ReplyData | null = null;
  try {
    data = await dashboardApiGet<ReplyData>(`/api/users/by-username/${encodeURIComponent(username)}`);
  } catch {
    data = null;
  }

  const user = asRecord(data?.user);
  const viewUsername = asString(user?.username, username);
  const profile = asRecord(user?.profile);
  const displayName = asString(profile?.displayName, viewUsername);

  const replies = Array.isArray(data?.user?.replies) ? data!.user!.replies : [];

  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>ردود @{viewUsername}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>{displayName}</p>

        {replies.length === 0 ? (
          <div className="dashboard-list-item">
            <span className="dashboard-list-item__body">لا توجد ردود حتى الآن.</span>
          </div>
        ) : (
          <div className="dashboard-list-nav">
            {replies.map((reply) => {
              const postHref = reply.post?.slug ? `/posts/${reply.post.slug}#comment-${reply.id}` : "/timeline";
              return (
                <Link key={reply.id} href={postHref} className="dashboard-list-item">
                  <span className="dashboard-list-item__title">
                    {(reply.content || "").trim() || "رد بدون نص"}
                  </span>
                  <span className="dashboard-list-item__body">
                    {new Date(reply.createdAt).toLocaleString("ar-BH")}
                    {reply.post?.title ? ` • ${reply.post.title}` : ""}
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
