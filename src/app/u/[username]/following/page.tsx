import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { UserConnectionsList } from "@/components/social/user-connections-list";
import { apiGet } from "@/lib/web-api";

interface FollowingPageData {
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  following: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
}

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  let data: FollowingPageData | null = null;

  try {
    data = await apiGet<FollowingPageData>(
      `/api/users/by-username/${encodeURIComponent(username)}/connections?type=following`
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
              ? `Accounts followed by @${data.user.username}`
              : `الحسابات التي يتابعها @${data.user.username}`
          }
          emptyMessage={
            locale === "en"
              ? "This account is not following anyone yet."
              : "هذا الحساب لا يتابع أي حسابات حتى الآن."
          }
          users={data.following}
        />
      </section>
    </AppShell>
  );
}
