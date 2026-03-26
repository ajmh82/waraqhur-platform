import { Suspense } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";

export default function AcceptInvitationPage() {
  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />
        <section className="page-section">
          <Suspense fallback={<div className="state-card"><p>جارٍ التحميل...</p></div>}>
            <AcceptInvitationForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
