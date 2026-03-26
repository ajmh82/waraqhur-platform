import { Suspense } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";

export default function AcceptInvitationPage() {
  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <section
          className="page-section"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <div className="state-card">
            <p className="section-heading__eyebrow">قبول الدعوة</p>
            <h1 style={{ marginTop: 0, marginBottom: "14px" }}>
              فعّل دعوتك وادخل مباشرة إلى المنصة
            </h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.8 }}>
              إذا تلقيت رمز دعوة، فهذه الصفحة هي أسرع طريق لإنشاء حسابك وربطه
              بالدعوة المرسلة لك بدون المرور بالتسجيل العادي.
            </p>

            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "22px",
              }}
            >
              <div className="state-card" style={{ padding: "14px" }}>
                <strong>قبل أن تبدأ</strong>
                <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
                  جهز رمز الدعوة، واسم المستخدم، والاسم المعروض، وكلمة المرور.
                </p>
              </div>

              <div className="state-card" style={{ padding: "14px" }}>
                <strong>إذا لم تكن لديك دعوة</strong>
                <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
                  يمكنك إنشاء حساب عادي أو تسجيل الدخول إذا كان لديك حساب مسبقًا.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginTop: "20px",
              }}
            >
              <Link href="/register" className="btn small">
                إنشاء حساب عادي
              </Link>
              <Link href="/login" className="btn small">
                تسجيل الدخول
              </Link>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="state-card">
                <p>جارٍ تحميل نموذج قبول الدعوة...</p>
              </div>
            }
          >
            <AcceptInvitationForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
