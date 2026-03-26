import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatDateTimeInMakkah } from "@/lib/date-time";
import { normalizeUiLocale, uiCopy, type UiLocale } from "@/lib/ui-copy";
import { apiGet } from "@/lib/web-api";

interface MediaResponse {
  posts: Array<{
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
    createdAt: string;
    mediaUrl: string | null;
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

interface CurrentUserLocaleData {
  user: {
    profile: {
      locale: string | null;
    } | null;
  };
}

async function getLocale(): Promise<UiLocale> {
  try {
    const currentUser = await apiGet<CurrentUserLocaleData>("/api/auth/me");
    return normalizeUiLocale(currentUser.user.profile?.locale);
  } catch {
    return "ar";
  }
}

async function loadData() {
  try {
    return {
      data: await apiGet<MediaResponse>("/api/media"),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل صفحة الوسائط.",
    };
  }
}

export default async function MediaPage() {
  const [locale, { data, error }] = await Promise.all([getLocale(), loadData()]);
  const copy = uiCopy[locale];

  if (error || !data) {
    return (
      <AppShell>
        <section className="page-section">
          <ErrorState
            title={locale === "en" ? "Unable to load media" : "تعذر تحميل الوسائط"}
            description={error ?? (locale === "en" ? "Unable to load media page." : "تعذر تحميل صفحة الوسائط.")}
          />
        </section>
      </AppShell>
    );
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
          <Link href="/" className="btn small">
            {copy.home}
          </Link>
          <Link href="/timeline" className="btn small">
            {copy.timelineTitle}
          </Link>
          <Link href="/search" className="btn small">
            {copy.search}
          </Link>
        </div>

        <SectionHeading
          eyebrow={copy.mediaEyebrow}
          title={copy.mediaTitle}
          description={copy.mediaDescription}
        />

        <div
          className="state-card"
          style={{
            maxWidth: "100%",
            margin: "0 0 18px",
            display: "grid",
            gap: "8px",
          }}
        >
          <strong>{copy.mediaSummary}</strong>
          <p style={{ margin: 0 }}>
            {copy.mediaSummaryText.replace("{count}", String(data.posts.length))}
          </p>
        </div>

        {data.posts.length === 0 ? (
          <EmptyState
            title={copy.noMediaTitle}
            description={copy.noMediaDescription}
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            {data.posts.map((post) => (
              <article key={post.id} className="dashboard-card">
                {post.mediaUrl ? (
                  <div
                    style={{
                      marginBottom: "14px",
                      overflow: "hidden",
                      borderRadius: "16px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <img
                      src={post.mediaUrl}
                      alt={post.title}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "220px",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ) : null}

                <div style={{ display: "grid", gap: "8px" }}>
                  <strong>{post.title}</strong>

                  {post.excerpt ? (
                    <p style={{ margin: 0, color: "var(--muted)" }}>
                      {post.excerpt}
                    </p>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      flexWrap: "wrap",
                      color: "var(--muted)",
                      fontSize: "13px",
                    }}
                  >
                    {post.author ? <span>@{post.author.username}</span> : null}
                    <span>
                      {formatDateTimeInMakkah(
                        post.createdAt,
                        locale === "en" ? "en-GB" : "ar-BH"
                      )}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "14px",
                      flexWrap: "wrap",
                      color: "var(--muted)",
                      fontSize: "14px",
                    }}
                  >
                    <span>{post.likesCount}</span>
                    <span>{post.commentsCount}</span>
                  </div>

                  <div
                    style={{
                      marginTop: "6px",
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <Link
                      href={post.slug ? `/posts/${post.slug}` : "#"}
                      className="btn small"
                    >
                      {copy.openPost}
                    </Link>

                    {post.author ? (
                      <Link href={`/u/${post.author.username}`} className="btn small">
                        {copy.postAuthor}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
