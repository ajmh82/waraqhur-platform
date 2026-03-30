"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/timeline";
  const [isPending, startTransition] = useTransition();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: identifier, password }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error?.message ?? "تعذر تسجيل الدخول.");
      return;
    }

    startTransition(() => {
      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="state-card">
      <h2>تسجيل الدخول</h2>
      <p>ادخل إلى حسابك للوصول إلى المتابعة والتفاعل وباقي ميزات ورق حر.</p>

      <div style={{ display: "grid", gap: "12px", marginTop: "18px" }}>
        <label style={{ display: "grid", gap: "6px" }}>
          <span>البريد الإلكتروني أو اسم المستخدم</span>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="example@email.com أو username"
            autoComplete="username"
            required
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span>كلمة المرور</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              autoComplete="current-password"
              required
              minLength={8}
            />
            <button
              type="button"
              className="btn small"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              style={{ whiteSpace: "nowrap" }}
            >
              {showPassword ? "إخفاء" : "إظهار"}
            </button>
          </div>
        </label>
      </div>

      <div style={{ marginTop: "10px" }}>
        <Link href="/password-reset/request" style={{ color: "var(--muted)", fontSize: "14px" }}>
          نسيت كلمة المرور؟
        </Link>
      </div>

      {error ? (
        <p style={{ color: "var(--danger)", marginTop: "14px", marginBottom: 0 }}>{error}</p>
      ) : null}

      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "18px" }}>
        <button type="submit" className="btn-action" disabled={isPending}>
          {isPending ? "جارٍ تسجيل الدخول..." : "دخول"}
        </button>
        <Link href="/register" style={{ color: "var(--muted)", fontSize: "14px" }}>
          ليس لديك حساب؟ أنشئ واحداً
        </Link>
      </div>
    </form>
  );
}
