import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SectionHeading } from "@/components/content/section-heading";
import { TimelineList } from "@/components/content/timeline-list";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { StartDirectMessageButton } from "@/components/social/start-direct-message-button";
import { normalizeUiLocale, uiCopy, type UiLocale } from "@/lib/ui-copy";
import { apiGet } from "@/lib/web-api";

interface SearchResponse {
  query: string;
  users: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    followersCount: number;
    followingCount: number;
  }>;
  posts: Array<{
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
    createdAt: string;
    commentsCount: number;
    likesCount: number;
    category: {
      id: string;
      name: string;
      slug: string;
    } | null;
    source: {
      id: string;
      name: string;
      slug: string;
    } | null;
    author: {
      id: string;
      email: string;
      username: string;
    } | null;
  }>;
}

interface CurrentUserResponse {
  user: {
    id: string;
    username: string;
    profile: {
      locale: string | null;
    } | null;
  };
  session: {
    id: string;
    expiresAt: string;
    lastUsedAt: string | null;
  };
}

async function loadData(query: string) {
  try {
    if (!query.trim()) {
      return {
        data: {
          query: "",
          users: [],
          posts: [],
        },
        error: null,
      };
    }

    return {
      data: await apiGet<SearchResponse>(
        `/api/search?q=${encodeURIComponent(query)}`
      ),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "تعذر تنفيذ البحث.",
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

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";
  const [{ data, error }, currentUser] = await Promise.all([
    loadData(query),
    loadOptionalCurrentUser(),
  ]);

  const locale: UiLocale = normalizeUiLocale(currentUser?.user.profile?.locale);
  const copy = uiCopy[locale];

  if (error || !data) {
    return (
      <AppShell>
        <section className="page-section">
          <ErrorState
            title={locale === "en" ? "Unable to search" : "تعذر تنفيذ البحث"}
            description={error ?? (locale === "en" ? "Unable to complete search." : "تعذر تنفيذ البحث.")}
          />
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="page-section">
        <SectionHeading
          eyebrow={copy.searchEyebrow}
          title={copy.searchTitle}
          description={copy.searchDescription}
        />

        <form
          action="/search"
          method="GET"
          className="state-card"
          style={{
            maxWidth: "100%",
            margin: "0 0 18px",
            display: "grid",
            gap: "12px",
          }}
        >
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder={copy.searchPlaceholder}
          />

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="submit" className="btn-action">
              {copy.searchButton}
            </button>

            <Link href="/search" className="btn small">
              {copy.clearButton}
            </Link>
          </div>
        </form>

        {!query ? (
          <div
            className="state-card"
            style={{
              maxWidth: "100%",
              margin: 0,
              display: "grid",
              gap: "10px",
            }}
          >
            <strong>{copy.startSearch}</strong>
            <p style={{ margin: 0 }}>
              {copy.startSearchDescription}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "20px" }}>
            <section>
              <div className="section-heading">
                <p className="section-heading__eyebrow">Users</p>
                <h2>{copy.usersSection}</h2>
              </div>

              {data.users.length === 0 ? (
                <EmptyState
                  title={copy.noUsersTitle}
                  description={copy.noUsersDescription}
                />
              ) : (
                <div className="dashboard-list">
                  {data.users.map((user) => {
                    const isCurrentUser = currentUser?.user.id === user.id;

                    return (
                      <article key={user.id} className="dashboard-card">
                        <div
                          style={{
                            display: "flex",
                            gap: "12px",
                            alignItems: "center",
                          }}
                        >
                          <div className="tweet-card__avatar">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.username}
                                className="account-menu__avatar-image"
                              />
                            ) : (
                              getInitial(user.displayName)
                            )}
                          </div>

                          <div style={{ display: "grid", gap: "4px" }}>
                            <strong>{user.displayName}</strong>
                            <span
                              style={{
                                color: "var(--muted)",
                                fontSize: "14px",
                              }}
                            >
                              @{user.username}
                            </span>
                          </div>
                        </div>

                        {user.bio ? (
                          <p style={{ marginTop: "14px" }}>{user.bio}</p>
                        ) : null}

                        <div
                          style={{
                            display: "flex",
                            gap: "14px",
                            flexWrap: "wrap",
                            marginTop: "14px",
                            color: "var(--muted)",
                            fontSize: "14px",
                          }}
                        >
                          <span>
                            {copy.followersCountLabel.replace(
                              "{count}",
                              String(user.followersCount)
                            )}
                          </span>
                          <span>
                            {copy.followingCountLabel.replace(
                              "{count}",
                              String(user.followingCount)
                            )}
                          </span>
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
                          <Link href={`/u/${user.username}`} className="btn small">
                            {copy.viewProfile}
                          </Link>

                          <Link
                            href={`/u/${user.username}/followers`}
                            className="btn small"
                          >
                            {copy.followers}
                          </Link>

                          {!isCurrentUser ? (
                            <StartDirectMessageButton
                              targetUserId={user.id}
                              className="btn small"
                              label={copy.privateMessage}
                            />
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <div className="section-heading">
                <p className="section-heading__eyebrow">Posts</p>
                <h2>{copy.postsSection}</h2>
              </div>

              {data.posts.length === 0 ? (
                <EmptyState
                  title={copy.noPostsTitle}
                  description={copy.noPostsDescription}
                />
              ) : (
                <TimelineList posts={data.posts} />
              )}
            </section>
          </div>
        )}
      </section>
    </AppShell>
  );
}
