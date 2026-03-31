import { headers } from "next/headers";

function getBaseUrl(host: string | null) {
  if (!host) {
    return "http://localhost:3000";
  }

  const isLocalhost =
    host.includes("localhost") || host.startsWith("127.0.0.1");

  return `${isLocalhost ? "http" : "https"}://${host}`;
}

export async function dashboardApiGet<T>(path: string): Promise<T> {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const cookie = headerStore.get("cookie") ?? "";

  const response = await fetch(`${getBaseUrl(host)}${path}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      cookie,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? `Request failed for ${path}`);
  }

  return payload.data;
}
