"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminUserRoleAssignmentFormProps {
  user: {
    id: string;
    username: string;
  };
  roles: Array<{
    id: string;
    key: string;
    name: string;
    description: string | null;
  }>;
}

export function AdminUserRoleAssignmentForm({
  user,
  roles,
}: AdminUserRoleAssignmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [roleKey, setRoleKey] = useState(roles[0]?.key ?? "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/users/roles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        userId: user.id,
        roleKey,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر إسناد الدور.");
      return;
    }

    startTransition(() => {
      router.push(`/admin/users/${user.id}/roles`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="state-card">
      <div style={{ display: "grid", gap: "12px" }}>
        <p style={{ margin: 0 }}>
          <strong>المستخدم:</strong> {user.username}
        </p>

        <select
          className="search-input"
          value={roleKey}
          onChange={(event) => setRoleKey(event.target.value)}
          required
          disabled={roles.length === 0}
        >
          {roles.length === 0 ? (
            <option value="">لا توجد أدوار متاحة</option>
          ) : (
            roles.map((role) => (
              <option key={role.id} value={role.key}>
                {role.name} ({role.key})
              </option>
            ))
          )}
        </select>
      </div>

      {error ? (
        <p style={{ color: "#ff7b7b", marginTop: "14px", marginBottom: 0 }}>
          {error}
        </p>
      ) : null}

      <div
        style={{
          marginTop: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="submit"
          className="btn primary"
          disabled={isPending || roles.length === 0}
        >
          {isPending ? "جارٍ الإسناد..." : "إسناد الدور"}
        </button>
      </div>
    </form>
  );
}
