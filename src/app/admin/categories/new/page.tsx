import Link from "next/link";
import { AdminCategoryCreateForm } from "@/components/admin/admin-category-create-form";
import { SectionHeading } from "@/components/content/section-heading";

export default function AdminNewCategoryPage() {
  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="تصنيف جديد"
        description="إنشاء تصنيف جديد من داخل لوحة الإدارة."
      />

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href="/admin/categories" className="btn small">
          العودة إلى التصنيفات
        </Link>
      </div>

      <AdminCategoryCreateForm />
    </section>
  );
}
