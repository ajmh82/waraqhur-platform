"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [isPending, startTransition] = useTransition();
  const [token, setToken] = useState(tokenFromUrl);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        token: token.trim(),
        displayName,
        username,
        password,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر قبول الدعوة. تأكد من صحة رمز الدعوة.");
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
        <h2>تم قبول الدعوة بنجاح ✅</h2>
        <p>تم إنشاء حسابك. يمكنك الآن تسجيل الدخول.</p>
        <Link href="/login" className="btn-action" style={{ marginTop: "14px", display: "inline-flex" }}>
          الذهاب لتسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="state-card">
      <h2>قبول الدعوة</h2>
      <p>أدخل بياناتك لإنشاء حسابك عبر الدعوة المرسلة إليك.</p>

      <div style={{ display: "grid", gap: "12px", marginTop: "18px" }}>
        <label style={{ display: "grid", gap: "6px" }}>
          <span>رمز الدعوة</span>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="الصق رمز الدعوة هنا"
            required
            minLength={1}
          />
        </label>

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
          {isPending ? "جارٍ قبول الدعوة..." : "قبول الدعوة وإنشاء الحساب"}
        </button>
      </div>

      <p style={{ marginTop: "14px", color: "var(--muted)", fontSize: "14px" }}>
        لديك حساب بالفعل؟{" "}
        <Link href="/login" style={{ color: "var(--accent)" }}>سجّل دخولك</Link>
      </p>
    </form>
  );
}
