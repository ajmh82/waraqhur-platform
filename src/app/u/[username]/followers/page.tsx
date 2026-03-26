import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SectionHeading } from "@/components/content/section-heading";
import { StartDirectMessageButton } from "@/components/social/start-direct-message-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface ConnectionsResponse {
  user: {
    id: string;
    username: string;
  };
  followers: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
  following: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
}

interface CurrentUserResponse {
  user: {
    id: string;
    username: string;
  };
  session: {
    id: string;
    expiresAt: string;
    lastUsedAt: string | null;
  };
}

async function loadData(username: string) {
  try {
    return {
      data: await apiGet<ConnectionsResponse>(
        `/api/users/by-username/${username}/connections`
      ),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل قائمة المتابعين.",
    };
  }
}

async function loadOptionalCurrentUser() {
  try {
    return await apiGet<CurrentUserResponse>("/api/auth/me");
  } catch {
    return null;
  }
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [{ data, error }, currentUser] = await Promise.all([
    loadData(username),
    loadOptionalCurrentUser(),
  ]);

  if (error) {
    return (
      <AppShell>
        <section className="page-section">
          <ErrorState
            title="تعذر تحميل المتابعين"
            description={error}
          />
        </section>
      </AppShell>
    );
  }

  if (!data) {
    notFound();
  }

  return (
    <AppShell>
      <section className="page-section">
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <Link href={`/u/${data.user.username}`} className="btn small">
            العودة إلى الملف العام
          </Link>
          <Link href={`/u/${data.user.username}/following`} className="btn small">
            عرض المتابَعين
          </Link>
          <Link href="/search" className="btn small">
            البحث
          </Link>
        </div>

        <SectionHeading
          eyebrow="Followers"
          title={`متابعو @${data.user.username}`}
          description="هذه الصفحة تعرض الحسابات التي تتابع هذا المستخدم مع وصول سريع إلى ملفاتهم ومراسلتهم."
        />

        {data.followers.length === 0 ? (
          <EmptyState
            title="لا يوجد متابعون بعد"
            description="عندما يبدأ المستخدم بالحصول على متابعين ستظهر أسماؤهم هنا."
          />
        ) : (
          <div className="dashboard-list">
            {data.followers.map((item) => {
              const isCurrentUser = currentUser?.user.id === item.id;

              return (
                <article key={item.id} className="dashboard-card">
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div className="tweet-card__avatar">
                      {item.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt={item.username}
                          className="account-menu__avatar-image"
                        />
                      ) : (
                        getInitial(item.displayName)
                      )}
                    </div>

                    <div style={{ display: "grid", gap: "4px" }}>
                      <strong>{item.displayName}</strong>
                      <span style={{ color: "var(--muted)", fontSize: "14px" }}>
                        @{item.username}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "14px",
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      alignItems: "start",
                    }}
                  >
                    <Link href={`/u/${item.username}`} className="btn small">
                      عرض الملف
                    </Link>

                    {!isCurrentUser ? (
                      <StartDirectMessageButton
                        targetUserId={item.id}
                        className="btn small"
                      />
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
