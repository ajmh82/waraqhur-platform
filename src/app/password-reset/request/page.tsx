"use client";

import { useState } from "react";
import Link from "next/link";

export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? "تعذر إرسال طلب استعادة كلمة المرور.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("تعذر إرسال طلب استعادة كلمة المرور.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-stack">
      <div className="page-container">
        <section className="page-section" style={{ maxWidth: 560, margin: "0 auto" }}>
          <form onSubmit={handleSubmit} className="state-card" style={{ display: "grid", gap: 12 }}>
            <h1 style={{ margin: 0 }}>نسيت كلمة المرور</h1>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.
            </p>

            <label style={{ display: "grid", gap: 6 }}>
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

            {error ? (
              <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
            ) : null}

            {success ? (
              <p style={{ margin: 0, color: "#22c55e" }}>
                إذا كان البريد موجودًا، تم إرسال رابط استعادة كلمة المرور.
              </p>
            ) : null}

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button type="submit" className="btn-action" disabled={isSubmitting}>
                {isSubmitting ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
              </button>
              <Link href="/login" className="btn small">
                العودة لتسجيل الدخول
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
