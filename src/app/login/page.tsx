import { Suspense } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />
        <section className="page-section">
          <Suspense fallback={<div className="state-card"><p>جارٍ التحميل...</p></div>}>
            <LoginForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
