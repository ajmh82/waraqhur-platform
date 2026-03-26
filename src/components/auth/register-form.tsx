"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, username, displayName, password }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error?.message ?? "تعذر إنشاء الحساب.");
      return;
    }

    setSuccess(true);
    startTransition(() => {
      router.push("/login");
    });
  }

  if (success) {
    return (
      <div className="state-card">
        <h2>تم إنشاء الحساب بنجاح ✅</h2>
        <p>يمكنك الآن تسجيل الدخول بحسابك الجديد.</p>
        <Link href="/login" className="btn-action" style={{ marginTop: "14px", display: "inline-flex" }}>
          الذهاب لتسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="state-card">
      <h2>إنشاء حساب جديد</h2>
      <p>أنشئ حسابك للانضمام إلى وراق حر والمشاركة في النقاشات.</p>

      <div style={{ display: "grid", gap: "12px", marginTop: "18px" }}>
        <label style={{ display: "grid", gap: "6px" }}>
          <span>الاسم المعروض</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="مثال: أحمد محمد"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span>اسم المستخدم</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="مثال: ahmad_99 (أحرف إنجليزية وأرقام و _ فقط)"
            autoComplete="username"
            required
            minLength={3}
            maxLength={30}
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span>البريد الإلكتروني</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            autoComplete="email"
            required
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span>كلمة المرور</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8 أحرف على الأقل"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
      </div>

      {error ? (
        <p style={{ color: "var(--danger)", marginTop: "14px", marginBottom: 0 }}>{error}</p>
      ) : null}

      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "18px" }}>
        <button type="submit" className="btn-action" disabled={isPending}>
          {isPending ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
        </button>
        <Link href="/login" style={{ color: "var(--muted)", fontSize: "14px" }}>
          لديك حساب؟ سجّل دخولك
        </Link>
      </div>
    </form>
  );
}
