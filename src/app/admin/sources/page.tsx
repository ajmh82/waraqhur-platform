import type { CSSProperties } from "react";
import { prisma } from "@/lib/prisma";
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
  return new Date(date).toLocaleString();
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
    healthy: sourceConfigs.filter((entry) => entry.config.statusHealth === "HEALTHY").length,
    broken: sourceConfigs.filter((entry) => entry.config.statusHealth === "BROKEN").length,
    degraded: sourceConfigs.filter((entry) => entry.config.statusHealth === "DEGRADED").length,
    static: sourceConfigs.filter((entry) => entry.config.statusHealth === "STATIC").length,
  };

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
          fontWeight: 800,
          fontSize: 15,
        }}
      >
        <div style={{ color: "#22c55e" }}>🟢 {summaryStats.healthy} Healthy</div>
        <div style={{ color: "#ef4444" }}>🔴 {summaryStats.broken} Broken</div>
        <div style={{ color: "#f59e0b" }}>🟡 {summaryStats.degraded} Degraded</div>
        <div style={{ color: "#a1a1aa" }}>⚪ {summaryStats.static} Static</div>
      </div>

      <h1 style={{ fontSize: 26, fontWeight: "bold", marginBottom: 20 }}>
        📡 Sources Dashboard
      </h1>

      <div
        style={{
          overflowX: "auto",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <th style={{ padding: 14 }}>الاسم</th>
              <th style={{ padding: 14 }}>النوع</th>
              <th style={{ padding: 14 }}>الحالة</th>
              <th style={{ padding: 14 }}>الصحة</th>
              <th style={{ padding: 14 }}>آخر نجاح</th>
              <th style={{ padding: 14 }}>آخر خطأ</th>
              <th style={{ padding: 14 }}>فشل متتالي</th>
              <th style={{ padding: 14 }}>الإجراء</th>
            </tr>
          </thead>

          <tbody>
            {sourceConfigs.map(({ source, config }) => (
              <tr
                key={source.id}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  verticalAlign: "top",
                }}
              >
                <td style={{ padding: 14, fontWeight: 700 }}>{source.name}</td>
                <td style={{ padding: 14 }}>{source.type}</td>
                <td style={{ padding: 14 }}>{source.status}</td>
                <td style={{ padding: 14 }}>
                  <span style={healthStyle(config.statusHealth)}>
                    {config.statusHealth || "-"}
                  </span>
                </td>
                <td style={{ padding: 14, whiteSpace: "nowrap" }}>
                  {formatDate(config.lastSuccessAt)}
                </td>
                <td style={{ padding: 14, color: "#fca5a5", maxWidth: 320 }}>
                  {config.lastErrorMessage || "-"}
                </td>
                <td style={{ padding: 14 }}>{config.consecutiveFailures || 0}</td>
                <td style={{ padding: 14 }}>
                  {source.type === "MANUAL" ? (
                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
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
    </div>
  );
}
