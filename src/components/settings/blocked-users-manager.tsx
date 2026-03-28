"use client";

import { useEffect, useMemo, useState } from "react";

interface BlockedUserRow {
  id: string;
  blockedAt: string;
  blockedUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface BlockedUsersManagerProps {
  locale?: "ar" | "en";
}

type SortMode = "newest" | "oldest" | "name";

const copy = {
  ar: {
    title: "المستخدمون المحظورون",
    empty: "لا يوجد مستخدمون محظورون حالياً.",
    unblock: "فك البلوك",
    unblocking: "جارٍ فك البلوك...",
    failed: "تعذر تحميل أو تحديث قائمة المحظورين.",
    searchPlaceholder: "ابحث بالاسم أو اسم المستخدم...",
    clear: "مسح",
    sortNewest: "الأحدث",
    sortOldest: "الأقدم",
    sortName: "الاسم",
    blockedAt: "تاريخ البلوك",
    results: "نتيجة",
  },
  en: {
    title: "Blocked Users",
    empty: "No blocked users right now.",
    unblock: "Unblock",
    unblocking: "Unblocking...",
    failed: "Failed to load or update blocked users.",
    searchPlaceholder: "Search by name or username...",
    clear: "Clear",
    sortNewest: "Newest",
    sortOldest: "Oldest",
    sortName: "Name",
    blockedAt: "Blocked At",
    results: "results",
  },
} as const;

export function BlockedUsersManager({ locale = "ar" }: BlockedUsersManagerProps) {
  const t = copy[locale];
  const [rows, setRows] = useState<BlockedUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  async function loadBlocked() {
    try {
      setError(null);
      const res = await fetch("/api/users/blocks", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.failed);
        return;
      }

      const list = Array.isArray(payload?.data?.blockedUsers) ? payload.data.blockedUsers : [];
      setRows(list);
    } catch {
      setError(t.failed);
    } finally {
      setLoading(false);
    }
  }

  async function unblock(userId: string) {
    setPendingUserId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/users/blocks/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.failed);
        return;
      }

      setRows((prev) => prev.filter((row) => row.blockedUser.id !== userId));
    } catch {
      setError(t.failed);
    } finally {
      setPendingUserId(null);
    }
  }

  useEffect(() => {
    loadBlocked();
  }, []);

  const visibleRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    let next = rows.filter((row) => {
      if (!keyword) return true;
      const name = row.blockedUser.displayName.toLowerCase();
      const username = row.blockedUser.username.toLowerCase();
      return name.includes(keyword) || username.includes(keyword);
    });

    next = [...next].sort((a, b) => {
      if (sortMode === "name") {
        const an = a.blockedUser.displayName.toLowerCase();
        const bn = b.blockedUser.displayName.toLowerCase();
        return an.localeCompare(bn);
      }

      const at = new Date(a.blockedAt).getTime();
      const bt = new Date(b.blockedAt).getTime();
      return sortMode === "oldest" ? at - bt : bt - at;
    });

    return next;
  }, [rows, query, sortMode]);

  return (
    <section className="state-card" style={{ padding: "16px", display: "grid", gap: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: "18px" }}>{t.title}</h2>
        <span style={{ color: "var(--muted)", fontSize: "13px" }}>
          {visibleRows.length} {t.results}
        </span>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <input
          className="settings-form__input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchPlaceholder}
          style={{ minWidth: "220px", flex: "1 1 260px" }}
        />
        <select
          className="settings-form__input"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
          style={{ width: "160px" }}
        >
          <option value="newest">{t.sortNewest}</option>
          <option value="oldest">{t.sortOldest}</option>
          <option value="name">{t.sortName}</option>
        </select>
        <button type="button" className="btn small" onClick={() => setQuery("")}>
          {t.clear}
        </button>
      </div>

      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}

      {loading ? (
        <p style={{ margin: 0, color: "var(--muted)" }}>...</p>
      ) : visibleRows.length === 0 ? (
        <p style={{ margin: 0, color: "var(--muted)" }}>{t.empty}</p>
      ) : (
        <div style={{ display: "grid", gap: "8px" }}>
          {visibleRows.map((row) => (
            <div
              key={row.id}
              className="dashboard-list-item"
              style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}
            >
              <div style={{ minWidth: 0, display: "grid", gap: "3px" }}>
                <strong style={{ display: "block" }}>{row.blockedUser.displayName}</strong>
                <span style={{ color: "var(--muted)", fontSize: "13px" }}>
                  @{row.blockedUser.username}
                </span>
                <span style={{ color: "var(--muted)", fontSize: "12px" }}>
                  {t.blockedAt}: {new Date(row.blockedAt).toLocaleString(locale === "en" ? "en-US" : "ar-BH", { hour12: locale !== "en" })}
                </span>
              </div>

              <button
                type="button"
                className="btn small"
                disabled={pendingUserId === row.blockedUser.id}
                onClick={() => unblock(row.blockedUser.id)}
              >
                {pendingUserId === row.blockedUser.id ? t.unblocking : t.unblock}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
