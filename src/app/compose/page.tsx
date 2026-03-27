"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ComposeTweetForm } from "@/components/compose/compose-tweet-form";

export default function ComposePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const from = searchParams.get("from");
  const safeFrom =
    from && from.startsWith("/") && !from.startsWith("/compose")
      ? from
      : null;

  const closeModal = useCallback(() => {
    if (safeFrom) {
      router.replace(safeFrom);
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.replace("/timeline");
  }, [router, safeFrom]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }

    function onPointerDown(event: PointerEvent) {
      const card = cardRef.current;
      if (!card) return;
      if (!card.contains(event.target as Node)) closeModal();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [closeModal]);

  return (
    <main className="compose-modal-overlay" aria-label="Compose modal">
      <div className="compose-modal-card" ref={cardRef}>
        <div className="compose-modal-card__top">
          <button type="button" className="compose-modal-close" onClick={closeModal}>
            ✕
          </button>
        </div>
        <ComposeTweetForm />
      </div>
    </main>
  );
}
