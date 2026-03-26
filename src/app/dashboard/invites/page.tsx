import Link from "next/link";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface InvitesResponse {
  user: {
    id: string;
    username: string;
  };
  invites: Array<{
    id: string;
    email: string;
    token: string;
    status: string;
    maxUses: number;
    sentAt: string | null;
    expiresAt: string;
    acceptedAt: string | null;
    revokedAt: string | null;
    createdAt: string;
  }>;
}

async function loadData() {
  try {
    return {
      data: await dashboardApiGet<InvitesResponse>("/api/invitations"),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل صفحة الدعوات.",
    };
  }
}

export default async function DashboardInvitesPage() {
  const { data, error } = await loadData();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل الدعوات"
        description={error ?? "تعذر تحميل صفحة الدعوات."}
      />
    );
  }

  const activeInvites = data.invites.filter(
    (invite) => invite.status === "PENDING" || invite.status === "SENT"
  ).length;

  return (
    <section className="dashboard-panel">
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <Link href="/dashboard/settings" className="btn small">
          الإعدادات
        </Link>
        <Link href="/dashboard/activity" className="btn small">
          النشاط
        </Link>
        <Link href="/search" className="btn small">
          البحث
        </Link>
        <Link href={`/u/${data.user.username}`} className="btn small">
          الملف العام
        </Link>
      </div>

      <SectionHeading
        eyebrow="Invites"
        title="الدعوات"
        description="راجع الدعوات التي تم إنشاؤها وحالتها الحالية من مكان واحد."
      />

      <div
        className="state-card"
        style={{
          maxWidth: "100%",
          margin: "0 0 18px",
          display: "grid",
          gap: "8px",
        }}
      >
        <strong>ملخص الدعوات</strong>
        <p style={{ margin: 0 }}>
          لديك {activeInvites} دعوة نشطة من أصل {data.invites.length} دعوة.
        </p>
      </div>

      {data.invites.length === 0 ? (
        <EmptyState
          title="لا توجد دعوات بعد"
          description="عندما تقوم بإنشاء أو استلام دعوات ستظهر هنا."
        />
      ) : (
        <div className="dashboard-list">
          {data.invites.map((invite) => (
            <article key={invite.id} className="dashboard-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "start",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "grid", gap: "6px" }}>
                  <strong>{invite.email}</strong>
                  <span style={{ color: "var(--muted)", fontSize: "14px" }}>
                    الحالة: {invite.status}
                  </span>
                </div>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 10px",
                    borderRadius: "999px",
                    background:
                      invite.status === "ACCEPTED"
                        ? "rgba(34,197,94,0.14)"
                        : invite.status === "REVOKED"
                          ? "rgba(239,68,68,0.14)"
                          : "rgba(59,130,246,0.14)",
                    color:
                      invite.status === "ACCEPTED"
                        ? "#bbf7d0"
                        : invite.status === "REVOKED"
                          ? "#fecaca"
                          : "#dbeafe",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {invite.status}
                </span>
              </div>

              <div
                style={{
                  marginTop: "12px",
                  display: "grid",
                  gap: "6px",
                  color: "var(--muted)",
                  fontSize: "14px",
                }}
              >
                <span>عدد الاستخدامات: {invite.maxUses}</span>
                <span>
                  الإنشاء: {formatDateTimeInMakkah(invite.createdAt, "ar-BH")}
                </span>
                <span>
                  الإرسال:{" "}
                  {invite.sentAt
                    ? formatDateTimeInMakkah(invite.sentAt, "ar-BH")
                    : "لم تُرسل بعد"}
                </span>
                <span>
                  الانتهاء: {formatDateTimeInMakkah(invite.expiresAt, "ar-BH")}
                </span>
                <span>
                  القبول:{" "}
                  {invite.acceptedAt
                    ? formatDateTimeInMakkah(invite.acceptedAt, "ar-BH")
                    : "لم تُقبل بعد"}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
