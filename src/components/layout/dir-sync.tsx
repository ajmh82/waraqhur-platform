"use client";

import { useEffect } from "react";

export function DirSync() {
  useEffect(() => {
    const html = document.documentElement;
    const lang = (html.lang || "ar").toLowerCase();
    html.dir = lang.startsWith("ar") ? "rtl" : "ltr";
  }, []);

  return null;
}
