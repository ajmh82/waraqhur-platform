import type { CSSProperties } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/content/section-heading";
import { SourceIngestButton } from "@/components/admin/source-ingest-button";

type SourceHealth = "HEALTHY" | "DEGRADED" | "BROKEN" | "STATIC";

interface SourceRuntimeConfig {
  statusHealth?: SourceHealth;
  lastSuccessAt?: string | null;
  lastErrorMessage?: string | null;
  consecutiveFailures?: number;
}

function readSourceConfig(value: unknown): SourceRuntimeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const raw = value as Record<string, unknown>;

  return {
    statusHealth:
      raw.statusHealth === "HEALTHY" ||
      raw.statusHealth === "DEGRADED" ||
      raw.statusHealth === "BROKEN" ||
      raw.statusHealth === "STATIC"
        ? raw.statusHealth
        : undefined,
    lastSuccessAt:
      typeof raw.lastSuccessAt === "string" ? raw.lastSuccessAt : null,
    lastErrorMessage:
      typeof raw.lastErrorMessage === "string" ? raw.lastErrorMessage : null,
    consecutiveFailures:
      typeof raw.consecutiveFailures === "number"
        ? raw.consecutiveFailures
        : 0,
  };
}

function healthStyle(health?: SourceHealth | null): CSSProperties {
  if (health === "HEALTHY") return { color: "#22c55e", fontWeight: 700 };
  if (health === "DEGRADED") return { color: "#f59e0b", fontWeight: 700 };
  if (health === "BROKEN") return { color: "#ef4444", fontWeight: 700 };
  if (health === "STATIC") return { color: "#a1a1aa", fontWeight: 700 };
  return { color: "#94a3b8", fontWeight: 700 };
}

function formatDate(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleString("ar-BH");
}

export default async function SourcesPage() {
  const sources = await prisma.source.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  const sourceConfigs = sources.map((source) => ({
    source,
    config: readSourceConfig(source.config),
  }));

  const summaryStats = {
    total: sourceConfigs.length,
    healthy: sourceConfigs.filter(
      (entry) => entry.config.statusHealth === "HEALTHY"
    ).length,
    broken: sourceConfigs.filter(
      (entry) => entry.config.statusHealth === "BROKEN"
    ).length,
    degraded: sourceConfigs.filter(
      (entry) => entry.config.statusHealth === "DEGRADED"
    ).length,
    static: sourceConfigs.filter(
      (entry) => entry.config.statusHealth === "STATIC"
    ).length,
  };

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="الإدارة"
        title="إدارة المصادر"
        description="متابعة حالة المصادر، الصحة التشغيلية، وعمليات الجلب من مكان واحد واضح."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div className="state-card">
          <strong>إجمالي المصادر</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {summaryStats.total}
          </p>
        </div>
        <div className="state-card">
          <strong>سليمة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0", color: "#22c55e" }}>
            {summaryStats.healthy}
          </p>
        </div>
        <div className="state-card">
          <strong>متدهورة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0", color: "#f59e0b" }}>
            {summaryStats.degraded}
          </p>
        </div>
        <div className="state-card">
          <strong>معطلة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0", color: "#ef4444" }}>
            {summaryStats.broken}
          </p>
        </div>
        <div className="state-card">
          <strong>ثابتة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0", color: "#a1a1aa" }}>
            {summaryStats.static}
          </p>
        </div>
      </div>

      <div
        className="state-card"
        style={{
          maxWidth: "100%",
          margin: "0 0 18px",
          padding: "16px",
          display: "grid",
          gap: "10px",
        }}
      >
        <strong>ملخص سريع</strong>
        <p style={{ margin: 0 }}>
          هذه الصفحة مخصصة لمراجعة أداء كل مصدر ومعرفة ما إذا كان يعمل بشكل طبيعي
          أو يحتاج تدخلًا، مع تنفيذ الجلب اليدوي مباشرة عند الحاجة.
        </p>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>النوع</th>
              <th>الحالة</th>
              <th>الصحة</th>
              <th>آخر نجاح</th>
              <th>آخر خطأ</th>
              <th>فشل متتالي</th>
              <th>عرض</th>
              <th>إجراء</th>
            </tr>
          </thead>

          <tbody>
            {sourceConfigs.map(({ source, config }) => (
              <tr key={source.id}>
                <td>{source.name}</td>
                <td>{source.type}</td>
                <td>{source.status}</td>
                <td>
                  <span style={healthStyle(config.statusHealth)}>
                    {config.statusHealth || "-"}
                  </span>
                </td>
                <td>{formatDate(config.lastSuccessAt)}</td>
                <td style={{ color: "#fca5a5" }}>
                  {config.lastErrorMessage || "-"}
                </td>
                <td>{config.consecutiveFailures || 0}</td>
                <td>
                  <Link href={`/admin/sources/${source.id}`} className="btn small">
                    تفاصيل
                  </Link>
                </td>
                <td>
                  {source.type === "MANUAL" ? (
                    <span
                      style={{
                        color: "rgba(255,255,255,0.45)",
                        fontSize: "13px",
                      }}
                    >
                      غير مطلوب
                    </span>
                  ) : (
                    <SourceIngestButton sourceId={source.id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
