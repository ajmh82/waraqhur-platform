import { AppHeader } from "@/components/layout/app-header";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />
        <section className="page-section">
          <RegisterForm />
        </section>
      </div>
    </main>
  );
}
