"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SortValue = "latest" | "oldest" | "user_asc" | "user_desc";
type StatusValue = "all" | "unread" | "read";

function normalizeSort(value: string | null | undefined): SortValue {
  if (value === "oldest") return "oldest";
  if (value === "user_asc") return "user_asc";
  if (value === "user_desc") return "user_desc";
  return "latest";
}

function normalizeStatus(value: string | null | undefined): StatusValue {
  if (value === "unread") return "unread";
  if (value === "read") return "read";
  return "all";
}

export function AuditMessagesFilters({
  locale,
  resultsCount,
}: {
  locale: "ar" | "en";
  resultsCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState<SortValue>(normalizeSort(searchParams.get("sort")));
  const [status, setStatus] = useState<StatusValue>(normalizeStatus(searchParams.get("status")));

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setSort(normalizeSort(searchParams.get("sort")));
    setStatus(normalizeStatus(searchParams.get("status")));
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());

      const trimmedQ = q.trim();
      if (trimmedQ.length > 0) next.set("q", trimmedQ);
      else next.delete("q");

      if (sort === "latest") next.delete("sort");
      else next.set("sort", sort);

      if (status === "all") next.delete("status");
      else next.set("status", status);

      const currentQuery = searchParams.toString();
      const nextQuery = next.toString();

      if (nextQuery !== currentQuery) {
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [q, sort, status, pathname, router, searchParams]);

  return (
    <div className="state-card" style={{ display: "grid", gap: 10, padding: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr minmax(170px, 220px) minmax(170px, 220px)",
          gap: 8,
        }}
      >
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            locale === "en"
              ? "Search by username or message text..."
              : "ابحث باسم المستخدم أو نص الرسالة..."
          }
          style={{ minHeight: 40 }}
        />

        <select
          value={sort}
          onChange={(e) => setSort(normalizeSort(e.target.value))}
          style={{ minHeight: 40 }}
        >
          <option value="latest">{locale === "en" ? "Latest" : "الأحدث"}</option>
          <option value="oldest">{locale === "en" ? "Oldest" : "الأقدم"}</option>
          <option value="user_asc">{locale === "en" ? "User A → Z" : "المستخدم أ → ي"}</option>
          <option value="user_desc">{locale === "en" ? "User Z → A" : "المستخدم ي → أ"}</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(normalizeStatus(e.target.value))}
          style={{ minHeight: 40 }}
        >
          <option value="all">{locale === "en" ? "All Messages" : "كل الرسائل"}</option>
          <option value="unread">{locale === "en" ? "Unread" : "غير مقروءة"}</option>
          <option value="read">{locale === "en" ? "Read" : "مقروءة"}</option>
        </select>
      </div>

      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
        {locale === "en" ? `Results: ${resultsCount}` : `عدد النتائج: ${resultsCount}`}
      </p>
    </div>
  );
}
