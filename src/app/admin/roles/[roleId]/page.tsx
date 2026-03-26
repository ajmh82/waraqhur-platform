import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminRoleRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isنظامي: boolean;
  usersCount: number;
  users: Array<{
    id: string;
    email: string;
    username: string;
    status: string;
    assignedAt: string;
  }>;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

interface AdminRoleDetailsPageResult {
  role: AdminRoleRecord | null;
  error: string | null;
}

async function loadAdminRoleDetailsPageData(
  roleId: string
): Promise<AdminRoleDetailsPageResult> {
  try {
    const response = await dashboardApiGet<{
      data: {
        roles: AdminRoleRecord[];
      };
    }>("/api/admin/roles");

    const roles = Array.isArray(response.data.roles) ? response.data.roles : [];
    const role = roles.find((item) => item.id === roleId) ?? null;

    return {
      role,
      error: null,
    };
  } catch (error) {
    return {
      role: null,
      error: error instanceof Error ? error.message : "Unable to load role details.",
    };
  }
}

export default async function AdminRoleDetailsPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  const { role, error } = await loadAdminRoleDetailsPageData(roleId);

  if (error) {
    return <ErrorState title="تعذر تحميل تفاصيل الدور" description={error} />;
  }

  if (!role) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={role.name}
        description="تفاصيل الدور والصلاحيات والمستخدمين المرتبطين به."
      />

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link href="/admin/roles" className="btn small">
          العودة إلى الأدوار
        </Link>
        <Link href={`/admin/roles/${role.id}/users`} className="btn small">
          مستخدمو الدور
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div className="state-card">
          <strong>نوع الدور</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {role.isنظامي ? "SYSTEM" : "CUSTOM"}
          </p>
        </div>
        <div className="state-card">
          <strong>عدد المستخدمين</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{role.usersCount}</p>
        </div>
        <div className="state-card">
          <strong>عدد الصلاحيات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {role.permissions.length}
          </p>
        </div>
      </div>

      

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <p><strong>الاسم:</strong> {role.name}</p>
          <p><strong>المعرّف:</strong> {role.key}</p>
          <p><strong>الوصف:</strong> {role.description ?? "-"}</p>
          <p><strong>نوع الدور:</strong> {role.isنظامي ? "نظامي" : "مخصص"}</p>
          <p><strong>تاريخ الإنشاء:</strong> {formatDateTimeInMakkah(role.createdAt, "ar-BH")}</p>
          <p><strong>آخر تحديث:</strong> {formatDateTimeInMakkah(role.updatedAt, "ar-BH")}</p>
        </div>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <h2 style={{ marginTop: 0 }}>الصلاحيات</h2>
        {role.permissions.length === 0 ? (
          <p style={{ marginBottom: 0 }}>لا توجد صلاحيات مرتبطة بهذا الدور.</p>
        ) : (
          <div className="admin-chip-list">
            {role.permissions.map((permission) => (
              <span key={permission} className="badge-chip">
                {permission}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="state-card">
        <h2 style={{ marginTop: 0 }}>المستخدمون</h2>
        {role.users.length === 0 ? (
          <p style={{ marginBottom: 0 }}>لا يوجد مستخدمون مرتبطون بهذا الدور.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {role.users.map((user) => (
              <div key={user.id} className="state-card">
                <p style={{ margin: 0 }}>
                  <strong>{user.username}</strong> ({user.email})
                </p>
                <p style={{ margin: "8px 0 0" }}>
                  <strong>الحالة:</strong> {user.status}
                </p>
                <p style={{ margin: "8px 0 0" }}>
                  <strong>تاريخ الإسناد:</strong> {formatDateTimeInMakkah(user.assignedAt, "ar-BH")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
