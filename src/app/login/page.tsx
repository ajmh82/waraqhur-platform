import { Suspense } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
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
            <p className="section-heading__eyebrow">الدخول إلى الحساب</p>
            <h1 style={{ marginTop: 0, marginBottom: "14px" }}>
              ادخل إلى ورق حر وابدأ من حيث توقفت
            </h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.8 }}>
              هذه الصفحة مخصصة للعودة السريعة إلى الموجز، التفاعل مع المنشورات،
              متابعة المصادر، وإدارة حسابك الشخصي بدون تعقيد.
            </p>

            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "22px",
              }}
            >
              <div className="state-card" style={{ padding: "14px" }}>
                <strong>ماذا ستحصل بعد الدخول؟</strong>
                <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
                  موجزك، إشعاراتك، إعدادات الحساب، والتفاعل الكامل مع المحتوى.
                </p>
              </div>

              <div className="state-card" style={{ padding: "14px" }}>
                <strong>هل أنت جديد هنا؟</strong>
                <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
                  يمكنك إنشاء حساب جديد أو قبول دعوة إذا تم إرسال واحدة لك.
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
                إنشاء حساب جديد
              </Link>
              <Link href="/accept-invitation" className="btn small">
                قبول دعوة
              </Link>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="state-card">
                <p>جارٍ تحميل نموذج تسجيل الدخول...</p>
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
