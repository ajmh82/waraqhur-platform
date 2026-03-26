"use client";

import { useRouter, useSearchParams } from "next/navigation";

type SortMode = "latest" | "smart";

function tabStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 16px",
    borderRadius: "14px",
    fontWeight: 700,
    fontSize: "14px",
    color: active ? "#ffffff" : "rgba(255,255,255,0.82)",
    border: active
      ? "1px solid rgba(59,130,246,0.4)"
      : "1px solid rgba(255,255,255,0.1)",
    background: active
      ? "linear-gradient(180deg, rgba(59,130,246,0.22), rgba(37,99,235,0.16))"
      : "rgba(255,255,255,0.03)",
    boxShadow: active ? "0 10px 24px rgba(37,99,235,0.14)" : "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
  };
}

async function savePreference(sort: SortMode) {
  try {
    await fetch("/api/preferences/timeline-sort", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sort }),
    });
  } catch {}
}

export function TimelineSortTabs({ sortMode }: { sortMode: SortMode }) {
  const router = useRouter();
  const params = useSearchParams();

  const changeSort = async (sort: SortMode) => {
    if (sort === sortMode) return;

    await savePreference(sort);

    const newParams = new URLSearchParams(params.toString());
    newParams.set("sort", sort);

    router.push(`/timeline?${newParams.toString()}`);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
        marginTop: "16px",
      }}
    >
      <button
        onClick={() => changeSort("latest")}
        style={tabStyle(sortMode === "latest")}
      >
        🕒 الأحدث
      </button>

      <button
        onClick={() => changeSort("smart")}
        style={tabStyle(sortMode === "smart")}
      >
        ✨ الذكي
      </button>
    </div>
  );
}
