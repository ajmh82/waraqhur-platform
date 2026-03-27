import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { PublicProfileView } from "@/components/profile/public-profile-view";
import { apiGet } from "@/lib/web-api";

interface PublicProfilePageData {
  user: {
    id: string;
    username: string;
    email?: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    followersCount: number;
    followingCount: number;
    isFollowing: boolean;
    isOwnProfile: boolean;
  };
  posts: Array<{
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
    content?: string | null;
    coverImageUrl?: string | null;
    createdAt: string;
    updatedAt?: string;
    commentsCount: number;
    likesCount?: number;
    repostsCount?: number;
    bookmarksCount?: number;
    viewsCount?: number;
    category: { id: string; name: string; slug: string } | null;
    source: { id: string; name: string; slug: string } | null;
    author: {
      id: string;
      email: string;
      username: string;
      displayName?: string;
      avatarUrl?: string | null;
      isFollowing?: boolean;
      isOwnProfile?: boolean;
    } | null;
    repostOfPost?: {
      id: string;
      title: string;
      slug: string | null;
      author: { id: string; username: string } | null;
    } | null;
    quotedPost?: {
      id: string;
      title: string;
      slug: string | null;
      author: { id: string; username: string } | null;
    } | null;
    metadata?: {
      ingestion?: {
        originalUrl?: string | null;
      };
      social?: {
        postKind?: string;
        hashtags?: string[];
        mediaType?: "image" | "video" | null;
        mediaUrl?: string | null;
      };
    } | null;
  }>;
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  let data: PublicProfilePageData | null = null;

  try {
    data = await apiGet<PublicProfilePageData>(
      `/api/users/by-username/${encodeURIComponent(username)}`
    );
  } catch {
    notFound();
  }

  return (
    <AppShell>
      <section className="page-section">
        <PublicProfileView
          locale={locale}
          user={data.user}
          posts={data.posts ?? []}
        />
      </section>
    </AppShell>
  );
}
