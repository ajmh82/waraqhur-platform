"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface SearchPost {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string | null;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

interface SearchExplorerProps {
  initialQuery: string;
  locale?: "ar" | "en";
}

const copy = {
  ar: {
    title: "البحث",
    subtitle: "ابحث عن حسابات أو كلمات داخل التغريدات.",
    placeholder: "ابحث عن حساب أو كلمة...",
    submit: "بحث",
    loading: "جارٍ البحث...",
    failed: "تعذر تنفيذ البحث.",
    users: "الحسابات",
    posts: "التغريدات",
    results: "نتيجة",
    noUsers: "لا توجد حسابات مطابقة.",
    noPosts: "لا توجد تغريدات مطابقة.",
    noExtraText: "بدون نص إضافي",
  },
  en: {
    title: "Search",
    subtitle: "Search for accounts or keywords inside posts.",
    placeholder: "Search for an account or keyword...",
    submit: "Search",
    loading: "Searching...",
    failed: "Search failed.",
    users: "Accounts",
    posts: "Posts",
    results: "results",
    noUsers: "No matching accounts found.",
    noPosts: "No matching posts found.",
    noExtraText: "No additional text",
  },
} as const;

export function SearchExplorer({
  initialQuery,
  locale = "ar",
}: SearchExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = copy[locale];

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentQuery = (searchParams.get("q") ?? "").trim();
    setQuery(currentQuery);

    if (!currentQuery) {
      setUsers([]);
      setPosts([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(currentQuery)}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.success) {
          if (!cancelled) {
            setError(payload?.error?.message ?? t.failed);
          }
          return;
        }

        if (!cancelled) {
          setUsers(payload.data.users ?? []);
          setPosts(payload.data.posts ?? []);
          setHasSearched(true);
        }
      } catch {
        if (!cancelled) {
          setError(t.failed);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchParams, t.failed]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) {
      router.replace("/search");
      return;
    }

    router.replace(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <section
      className="state-card"
      style={{
        margin: 0,
        maxWidth: "100%",
        padding: "20px",
        display: "grid",
        gap: "18px",
      }}
    >
      <div style={{ display: "grid", gap: "6px" }}>
        <h1 style={{ margin: 0, fontSize: "24px" }}>{t.title}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>{t.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.placeholder}
          style={{ minHeight: "48px" }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn-action">
            {t.submit}
          </button>
        </div>
      </form>

      {loading ? <p style={{ margin: 0, color: "var(--muted)" }}>{t.loading}</p> : null}
      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}

      {hasSearched && !loading && !error ? (
        <div style={{ display: "grid", gap: "18px" }}>
          <section style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "grid", gap: "4px" }}>
              <h2 style={{ margin: 0, fontSize: "18px" }}>{t.users}</h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px" }}>
                {users.length} {t.results}
              </p>
            </div>

            {users.length === 0 ? (
              <div
                style={{
                  borderRadius: "18px",
                  padding: "14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--muted)",
                }}
              >
                {t.noUsers}
              </div>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {users.map((user) => (
                  <Link key={user.id} href={`/u/${user.username}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <article
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "14px",
                        borderRadius: "18px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        style={{
                          width: "46px",
                          height: "46px",
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
                          <img src={user.avatarUrl} alt={user.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          user.displayName.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div style={{ display: "grid", gap: "3px", minWidth: 0 }}>
                        <strong>{user.displayName}</strong>
                        <span style={{ color: "var(--muted)", fontSize: "13px" }}>@{user.username}</span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "grid", gap: "4px" }}>
              <h2 style={{ margin: 0, fontSize: "18px" }}>{t.posts}</h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px" }}>
                {posts.length} {t.results}
              </p>
            </div>

            {posts.length === 0 ? (
              <div
                style={{
                  borderRadius: "18px",
                  padding: "14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--muted)",
                }}
              >
                {t.noPosts}
              </div>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {posts.map((post) => (
                  <Link key={post.id} href={post.slug ? `/posts/${post.slug}` : "/timeline"} style={{ textDecoration: "none", color: "inherit" }}>
                    <article
                      style={{
                        display: "grid",
                        gap: "8px",
                        padding: "14px",
                        borderRadius: "18px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div style={{ display: "grid", gap: "3px" }}>
                        <strong style={{ lineHeight: 1.6 }}>
                          {post.title || post.content || t.posts}
                        </strong>
                        {post.author ? (
                          <span style={{ color: "var(--muted)", fontSize: "13px" }}>
                            {post.author.displayName} @{post.author.username}
                          </span>
                        ) : null}
                      </div>

                      <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, fontSize: "14px" }}>
                        {(post.content ?? post.excerpt ?? "").slice(0, 180) || t.noExtraText}
                      </p>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
