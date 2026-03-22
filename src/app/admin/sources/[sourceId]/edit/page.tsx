import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSourceEditForm } from "@/components/admin/admin-source-edit-form";
import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminSourceRecord {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  url: string | null;
  handle: string | null;
  postsCount: number;
  lastIngestedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface AdminSourceEditPageResult {
  source: AdminSourceRecord | null;
  error: string | null;
}

async function loadAdminSourceEditPageData(
  sourceId: string
): Promise<AdminSourceEditPageResult> {
  try {
    const data = await dashboardApiGet<{
      sources: AdminSourceRecord[];
    }>("/api/sources");

    const source = data.sources.find((item) => item.id === sourceId) ?? null;

    return {
      source,
      error: null,
    };
  } catch (error) {
    return {
      source: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل بيانات المصدر.",
    };
  }
}

export default async function AdminSourceEditPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const { source, error } = await loadAdminSourceEditPageData(sourceId);

  if (error) {
    return (
      <ErrorState
        title="تعذر تحميل المصدر"
        description={error}
      />
    );
  }

  if (!source) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`تعديل المصدر: ${source.name}`}
        description="تعديل بيانات المصدر من داخل لوحة الإدارة."
      />

      <div style={{ marginBottom: "18px" }}>
        <Link href={`/admin/sources/${source.id}`} className="btn small">
          العودة إلى تفاصيل المصدر
        </Link>
      </div>

      <AdminSourceEditForm source={source} />
    </section>
  );
}
