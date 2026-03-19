const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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

async function parseJsonSafely(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    method: "GET",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
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
