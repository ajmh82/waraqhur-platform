import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
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
            <p className="section-heading__eyebrow">إنشاء حساب</p>
            <h1 style={{ marginTop: 0, marginBottom: "14px" }}>
              انضم إلى ورق حر بحساب واضح وبسيط
            </h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.8 }}>
              التسجيل هنا يجهزك مباشرة لتجربة القراءة، المتابعة، الإشعارات،
              والنقاش حول المحتوى العربي المنظم داخل المنصة.
            </p>

            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "22px",
              }}
            >
              <div className="state-card" style={{ padding: "14px" }}>
                <strong>بعد إنشاء الحساب</strong>
                <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
                  ستتمكن من تسجيل الدخول، بناء موجزك، وحفظ المنشورات والتفاعل معها.
                </p>
              </div>

              <div className="state-card" style={{ padding: "14px" }}>
                <strong>هل لديك دعوة؟</strong>
                <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
                  إذا وصلك رمز دعوة، استخدم صفحة قبول الدعوة بدل التسجيل العادي.
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
              <Link href="/login" className="btn small">
                لدي حساب بالفعل
              </Link>
              <Link href="/accept-invitation" className="btn small">
                لدي دعوة
              </Link>
            </div>
          </div>

          <RegisterForm />
        </section>
      </div>
    </main>
  );
}
