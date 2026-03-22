import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSourceNewPostForm } from "@/components/admin/admin-source-new-post-form";
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

interface AdminSourceNewPostPageResult {
  source: AdminSourceRecord | null;
  error: string | null;
}

async function loadAdminSourceNewPostPageData(
  sourceId: string
): Promise<AdminSourceNewPostPageResult> {
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

export default async function AdminSourceNewPostPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const { source, error } = await loadAdminSourceNewPostPageData(sourceId);

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
        title={`منشور جديد للمصدر: ${source.name}`}
        description="إنشاء منشور يدوي مرتبط بهذا المصدر مباشرة من لوحة الإدارة."
      />

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={`/admin/sources/${source.id}`} className="btn small">
          العودة إلى تفاصيل المصدر
        </Link>
        <Link href={`/admin/sources/${source.id}/posts`} className="btn small">
          All Source Posts
        </Link>
      </div>

      <AdminSourceNewPostForm source={source} />
    </section>
  );
}
