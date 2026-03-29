"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PullToRefreshProps {
  children: React.ReactNode;
  locale?: "ar" | "en";
  threshold?: number;
}

export function PullToRefresh({
  children,
  locale = "ar",
  threshold = 88,
}: PullToRefreshProps) {
  const router = useRouter();
  const startYRef = useRef<number | null>(null);
  const canPullRef = useRef(false);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const label =
    locale === "en"
      ? isRefreshing
        ? "Refreshing..."
        : "Pull to refresh"
      : isRefreshing
        ? "جارٍ التحديث..."
        : "اسحب للتحديث";

  function resetPullState() {
    startYRef.current = null;
    canPullRef.current = false;
    setPullDistance(0);
  }

  async function handleTouchEnd() {
    if (!canPullRef.current) {
      resetPullState();
      return;
    }

    if (pullDistance < threshold || isRefreshing) {
      resetPullState();
      return;
    }

    setIsRefreshing(true);
    setPullDistance(threshold);

    try {
      router.refresh();
      await new Promise((resolve) => setTimeout(resolve, 450));
    } finally {
      setIsRefreshing(false);
      resetPullState();
    }
  }

  return (
    <div
      onTouchStart={(event) => {
        if (typeof window === "undefined") {
          return;
        }

        const atTop = window.scrollY <= 0;
        if (!atTop || isRefreshing) {
          canPullRef.current = false;
          startYRef.current = null;
          return;
        }

        canPullRef.current = true;
        startYRef.current = event.touches[0]?.clientY ?? null;
      }}
      onTouchMove={(event) => {
        if (!canPullRef.current || startYRef.current === null || isRefreshing) {
          return;
        }

        const currentY = event.touches[0]?.clientY ?? startYRef.current;
        const rawDelta = currentY - startYRef.current;
        const safeDelta = Math.max(0, rawDelta);
        const limited = Math.min(140, safeDelta);

        if (safeDelta > 0) {
          event.preventDefault();
        }

        setPullDistance(limited);
      }}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetPullState}
      style={{
        transform: `translateY(${Math.min(pullDistance * 0.55, 64)}px)`,
        transition:
          pullDistance === 0 ? "transform 180ms ease-out" : "transform 70ms linear",
      }}
    >
      <div
        aria-hidden={pullDistance === 0 && !isRefreshing}
        style={{
          height: isRefreshing || pullDistance > 0 ? "34px" : "0px",
          opacity: isRefreshing || pullDistance > 0 ? 1 : 0,
          transition: "height 160ms ease, opacity 140ms ease",
          display: "grid",
          placeItems: "center",
          color: "var(--muted)",
          fontSize: "13px",
          fontWeight: 700,
          overflow: "hidden",
        }}
      >
        {label}
      </div>

      {children}
    </div>
  );
}
