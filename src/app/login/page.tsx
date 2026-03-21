import { AppHeader } from "@/components/layout/app-header";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <section className="page-section">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
