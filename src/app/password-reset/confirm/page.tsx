"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PasswordResetConfirmPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!token) {
      setError("رابط إعادة التعيين غير صالح.");
      return;
    }

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? "تعذر إعادة تعيين كلمة المرور.");
        return;
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("تعذر إعادة تعيين كلمة المرور.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-stack">
      <div className="page-container">
        <section className="page-section" style={{ maxWidth: 560, margin: "0 auto" }}>
          <form onSubmit={handleSubmit} className="state-card" style={{ display: "grid", gap: 12 }}>
            <h1 style={{ margin: 0 }}>تعيين كلمة مرور جديدة</h1>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              أدخل كلمة مرور جديدة لتأمين حسابك.
            </p>

            {!token ? (
              <p style={{ margin: 0, color: "var(--danger)" }}>
                الرابط غير صالح أو ناقص.
              </p>
            ) : null}

            <label style={{ display: "grid", gap: 6 }}>
              <span>كلمة المرور الجديدة</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="btn small"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "إخفاء" : "إظهار"}
                </button>
              </div>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>تأكيد كلمة المرور الجديدة</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="btn small"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                >
                  {showConfirmPassword ? "إخفاء" : "إظهار"}
                </button>
              </div>
            </label>

            {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}

            {success ? (
              <p style={{ margin: 0, color: "#22c55e" }}>
                تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.
              </p>
            ) : null}

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button type="submit" className="btn-action" disabled={isSubmitting || !token}>
                {isSubmitting ? "جارٍ الحفظ..." : "حفظ كلمة المرور الجديدة"}
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
