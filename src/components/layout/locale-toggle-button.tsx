"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface LocaleToggleButtonProps {
  locale: "ar" | "en";
}

const copy = {
  ar: {
    switchTo: "Switch to English",
    loading: "Switching...",
    failed: "تعذر تغيير اللغة.",
  },
  en: {
    switchTo: "التبديل إلى العربية",
    loading: "جارٍ التبديل...",
    failed: "Failed to switch language.",
  },
} as const;

export function LocaleToggleButton({ locale }: LocaleToggleButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = copy[locale];

  async function handleToggle() {
    setError(null);
    const nextLocale = locale === "ar" ? "en" : "ar";

    const response = await fetch("/api/preferences/locale", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locale: nextLocale,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? t.failed);
      return;
    }

    startTransition(() => {
      router.refresh();
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        className="btn small"
        onClick={handleToggle}
        disabled={isPending}
        style={{ width: "100%" }}
      >
        {isPending ? t.loading : t.switchTo}
      </button>

      {error ? (
        <p style={{ margin: 0, color: "var(--danger)", fontSize: "13px" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
