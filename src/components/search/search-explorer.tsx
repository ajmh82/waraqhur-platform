"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  author: { username: string } | null;
}

export function SearchExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<"all" | "users" | "posts">("all");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(async () => {
      const term = q.trim();

      const url = new URL(window.location.href);
      if (term) url.searchParams.set("q", term);
      else url.searchParams.delete("q");
      router.replace(`${url.pathname}?${url.searchParams.toString()}`);

      if (!term) {
        setUsers([]);
        setPosts([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          setError(payload?.error?.message ?? "تعذر تنفيذ البحث.");
          return;
        }

        setUsers(Array.isArray(payload?.data?.users) ? payload.data.users : []);
        setPosts(Array.isArray(payload?.data?.posts) ? payload.data.posts : []);
      } catch {
        setError("تعذر تنفيذ البحث.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(id);
  }, [q, router]);

  const hasResults = users.length > 0 || posts.length > 0;

  function highlight(text: string, keyword: string) {
    const term = keyword.trim();
    if (!term) return text;
    const i = text.toLowerCase().indexOf(term.toLowerCase());
    if (i < 0) return text;
    const before = text.slice(0, i);
    const hit = text.slice(i, i + term.length);
    const after = text.slice(i + term.length);
    return (
      <>
        {before}
        <mark style={{ background: "rgba(250,204,21,.35)", color: "inherit", padding: "0 2px" }}>{hit}</mark>
        {after}
      </>
    );
  }

  const visibleUsers = useMemo(() => (activeTab === "posts" ? [] : users), [activeTab, users]);
  const visiblePosts = useMemo(() => (activeTab === "users" ? [] : posts.filter((p): p is SearchPost & { slug: string } => Boolean(p.slug))), [activeTab, posts]);

  return (
    <section className="state-card" style={{ display: "grid", gap: 12 }}>
      <input
        type="search"
        placeholder="ابحث عن كلمة أو حساب..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className={`btn small ${activeTab === "all" ? "primary" : ""}`} onClick={() => setActiveTab("all")}>الكل</button>
        <button type="button" className={`btn small ${activeTab === "users" ? "primary" : ""}`} onClick={() => setActiveTab("users")}>الحسابات</button>
        <button type="button" className={`btn small ${activeTab === "posts" ? "primary" : ""}`} onClick={() => setActiveTab("posts")}>المنشورات</button>
      </div>

      {loading ? <p style={{ margin: 0, opacity: .8 }}>جارٍ البحث...</p> : null}
      {error ? <p style={{ margin: 0, color: "#f87171" }}>{error}</p> : null}
      {!loading && !error && q.trim() && !hasResults ? <p style={{ margin: 0, opacity: .8 }}>لا توجد نتائج.</p> : null}

      {visibleUsers.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          <strong>الحسابات</strong>
          {visibleUsers.map((u) => (
            <Link key={u.id} href={`/u/${u.username}`} className="search-item">
              <div>
                <div>{highlight(u.displayName || u.username, q)}</div>
                <small style={{ opacity: .75 }}>@{highlight(u.username, q)}</small>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {visiblePosts.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          <strong>المنشورات</strong>
          {visiblePosts.map((p) => (
            <Link key={p.id} href={`/posts/${p.slug}`} className="search-item">
              <div>
                <div>{highlight(p.title || "منشور", q)}</div>
                {p.excerpt ? <small style={{ opacity: .8 }}>{highlight(p.excerpt, q)}</small> : null}
                {p.author?.username ? <small style={{ display: "block", opacity: .65 }}>@{p.author.username}</small> : null}
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
