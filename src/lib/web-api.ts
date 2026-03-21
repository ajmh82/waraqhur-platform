import { headers } from "next/headers";
import { env } from "@/lib/env";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

function getBaseUrl(host: string | null) {
  if (env.appUrl) {
    return env.appUrl;
  }

  if (!host) {
    return "http://localhost:3000";
  }

  return `http://${host}`;
}

async function parseJsonSafely(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const cookie = headerStore.get("cookie") ?? "";

  const response = await fetch(`${getBaseUrl(host)}${path}`, {
    ...init,
    method: "GET",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      cookie,
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await parseJsonSafely(response)) as ApiResponse<T> | null;

  if (!response.ok || !payload || !payload.success) {
    throw new Error(
      payload && !payload.success
        ? payload.error.message
        : `Request failed with status ${response.status}`
    );
  }

  return payload.data;
}
