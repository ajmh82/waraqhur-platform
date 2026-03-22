import { AdminSourceCreateForm } from "@/components/admin/admin-source-create-form";
import { SectionHeading } from "@/components/content/section-heading";

export default function AdminNewSourcePage() {
  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="مصدر جديد"
        description="إنشاء مصدر جديد داخل ورق حر، مع دعم خاص للمصادر الخارجية مثل NITTER."
      />

      <AdminSourceCreateForm />
    </section>
  );
}
