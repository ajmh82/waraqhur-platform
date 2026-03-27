import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { UserConnectionsList } from "@/components/social/user-connections-list";
import { apiGet } from "@/lib/web-api";

interface FollowersPageData {
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  followers: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
}

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  let data: FollowersPageData | null = null;

  try {
    data = await apiGet<FollowersPageData>(
      `/api/users/by-username/${encodeURIComponent(username)}/connections?type=followers`
    );
  } catch {
    notFound();
  }

  return (
    <AppShell>
      <section className="page-section">
        <UserConnectionsList
          locale={locale}
          title={
            locale === "en"
              ? `Followers of @${data.user.username}`
              : `متابعو @${data.user.username}`
          }
          emptyMessage={
            locale === "en"
              ? "This account has no followers yet."
              : "لا يوجد متابعون لهذا الحساب حتى الآن."
          }
          users={data.followers}
        />
      </section>
    </AppShell>
  );
}
