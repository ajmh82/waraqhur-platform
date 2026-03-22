import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminSourceDetailsResponse {
  source: {
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
  };
}

interface AdminSourcePageResult {
  data: AdminSourceDetailsResponse | null;
  error: string | null;
}

async function loadAdminSourcePageData(
  sourceId: string
): Promise<AdminSourcePageResult> {
  try {
    const data = await dashboardApiGet<{
      sources: AdminSourceDetailsResponse["source"][];
    }>("/api/sources");

    const source = data.sources.find((item) => item.id === sourceId);

    if (!source) {
      return {
        data: null,
        error: null,
      };
    }

    return {
      data: { source },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل بيانات المصدر.",
    };
  }
}

export default async function AdminSourceDetailsPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const { data, error } = await loadAdminSourcePageData(sourceId);

  if (error) {
    return (
      <ErrorState
        title="تعذر تحميل المصدر"
        description={error}
      />
    );
  }

  if (!data) {
    notFound();
  }

  const { source } = data;

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={source.name}
        description="صفحة إدارية مفصلة للمصدر، تعرض أهم بياناته التشغيلية الحالية."
      />

      <div className="state-card">
        <div style={{ display: "grid", gap: "12px" }}>
          <p><strong>الاسم:</strong> {source.name}</p>
          <p><strong>Slug:</strong> {source.slug}</p>
          <p><strong>النوع:</strong> {source.type}</p>
          <p><strong>الحالة:</strong> {source.status}</p>
          <p><strong>التصنيف:</strong> {source.category.name}</p>
          <p><strong>الرابط:</strong> {source.url ?? "-"}</p>
          <p><strong>المعرف:</strong> {source.handle ?? "-"}</p>
          <p><strong>عدد المنشورات:</strong> {source.postsCount}</p>
          <p>
            <strong>آخر ingest:</strong>{" "}
            {source.lastIngestedAt
              ? new Date(source.lastIngestedAt).toLocaleString("ar-BH")
              : "-"}
          </p>
          <p>
            <strong>تاريخ الإنشاء:</strong>{" "}
            {new Date(source.createdAt).toLocaleString("ar-BH")}
          </p>
          <p>
            <strong>آخر تحديث:</strong>{" "}
            {new Date(source.updatedAt).toLocaleString("ar-BH")}
          </p>
        </div>

        <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/admin/sources" className="btn small">
            العودة إلى المصادر
          </Link>
          <Link href={`/sources/${source.slug}`} className="btn small">
            فتح الصفحة العامة
          </Link>
        </div>
      </div>
    </section>
  );
}
