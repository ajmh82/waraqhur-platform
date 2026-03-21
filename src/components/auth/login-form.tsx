"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("ajmh8233@gmail.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error?.message ?? "تعذر تسجيل الدخول.");
      return;
    }

    startTransition(() => {
      router.push("/timeline");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="state-card">
      <h2>تسجيل الدخول</h2>
      <p>ادخل إلى حسابك للوصول إلى المتابعة والتفاعل وباقي ميزات ورق حر.</p>

      <div style={{ display: "grid", gap: "12px", marginTop: "18px" }}>
        <label style={{ display: "grid", gap: "6px" }}>
          <span>البريد الإلكتروني</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="search-input"
            autoComplete="email"
            required
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span>كلمة المرور</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="search-input"
            autoComplete="current-password"
            required
          />
        </label>
      </div>

      {error ? (
        <p style={{ color: "#ff7b7b", marginTop: "14px", marginBottom: 0 }}>
          {error}
        </p>
      ) : null}

      <div style={{ marginTop: "18px" }}>
        <button type="submit" className="btn primary" disabled={isPending}>
          {isPending ? "جارٍ تسجيل الدخول..." : "دخول"}
        </button>
      </div>
    </form>
  );
}
