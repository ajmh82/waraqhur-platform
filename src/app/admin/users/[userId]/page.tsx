import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUserActions } from "@/components/admin/admin-user-actions";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminUsersResponse {
  users: Array<{
    id: string;
    email: string;
    username: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    profile: {
      displayName: string;
    } | null;
    roles: Array<{
      key: string;
      name: string;
      assignedAt: string;
    }>;
    lastActivityAt: string | null;
  }>;
}

interface AdminUserDetailsPageResult {
  user: AdminUsersResponse["users"][number] | null;
  error: string | null;
}

async function loadAdminUserDetailsPageData(
  userId: string
): Promise<AdminUserDetailsPageResult> {
  try {
    const data = await dashboardApiGet<AdminUsersResponse>("/api/admin/users");
    const user = data.users.find((item) => item.id === userId) ?? null;

    return {
      user,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error:
        error instanceof Error ? error.message : "Unable to load user details.",
    };
  }
}

export default async function AdminUserDetailsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { user, error } = await loadAdminUserDetailsPageData(userId);

  if (error) {
    return <ErrorState title="Failed to load user" description={error} />;
  }

  if (!user) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={user.profile?.displayName ?? user.username}
        description="تفاصيل المستخدم من داخل لوحة الإدارة."
      />

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href="/admin/users" className="btn small">
          العودة إلى المستخدمين
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <p><strong>اسم المستخدم:</strong> {user.username}</p>
          <p><strong>الاسم الظاهر:</strong> {user.profile?.displayName ?? "-"}</p>
          <p><strong>البريد الإلكتروني:</strong> {user.email}</p>
          <p><strong>الحالة:</strong> {user.status}</p>
          <p>
            <strong>آخر نشاط:</strong>{" "}
            {user.lastActivityAt
              ? new Date(user.lastActivityAt).toLocaleString("ar-BH")
              : "No activity"}
          </p>
          <p><strong>تاريخ التسجيل:</strong> {new Date(user.createdAt).toLocaleString("ar-BH")}</p>
          <p><strong>آخر تحديث:</strong> {new Date(user.updatedAt).toLocaleString("ar-BH")}</p>
        </div>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <h2 style={{ marginTop: 0 }}>الأدوار</h2>

        {user.roles.length === 0 ? (
          <EmptyState
            title="لا توجد أدوار"
            description="لا توجد أدوار مرتبطة بهذا المستخدم."
          />
        ) : (
          <div className="admin-chip-list">
            {user.roles.map((role) => (
              <span key={`${role.key}-${role.assignedAt}`} className="badge-chip">
                {role.name} ({role.key})
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="state-card">
        <h2 style={{ marginTop: 0 }}>إجراءات المستخدم</h2>
        <AdminUserActions
          user={{
            id: user.id,
            email: user.email,
            status: user.status,
          }}
        />
      </div>
    </section>
  );
}
