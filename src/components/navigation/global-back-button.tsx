"use client";

import { usePathname, useRouter } from "next/navigation";

export function GlobalBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (!pathname || pathname === "/" || pathname === "/timeline") {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push("/timeline");
      }}
      className="global-back-button"
    >
      ←
    </button>
  );
}
