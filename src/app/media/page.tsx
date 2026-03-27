import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { MediaGallery } from "@/components/media/media-gallery";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface TimelineMediaPageData {
  posts: Array<{
    id: string;
    title: string;
    slug: string | null;
    coverImageUrl?: string | null;
    author: {
      username: string;
      displayName?: string;
    } | null;
    metadata?: {
      social?: {
        mediaType?: "image" | "video" | null;
        mediaUrl?: string | null;
      };
    } | null;
  }>;
}

export default async function MediaPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  let data: TimelineMediaPageData | null = null;
  let error: string | null = null;

  try {
    data = await apiGet<TimelineMediaPageData>(
      "/api/timeline?page=1&limit=48&sort=latest"
    );
  } catch (requestError) {
    error =
      requestError instanceof Error
        ? requestError.message
        : locale === "en"
          ? "Failed to load media page."
          : "تعذر تحميل صفحة الوسائط.";
  }

  if (!data || error) {
    return (
      <AppShell>
        <section className="page-section">
          <ErrorState
            title={locale === "en" ? "Failed to load media" : "تعذر تحميل الوسائط"}
            description={
              error ?? (locale === "en" ? "Failed to load media page." : "تعذر تحميل صفحة الوسائط.")
            }
          />
        </section>
      </AppShell>
    );
  }

  const items = data.posts
    .map((post) => {
      const mediaUrl =
        post.metadata?.social?.mediaUrl ?? post.coverImageUrl ?? null;

      const mediaType =
        post.metadata?.social?.mediaType ??
        (post.coverImageUrl ? "image" : null);

      if (!mediaUrl || (mediaType !== "image" && mediaType !== "video")) {
        return null;
      }

      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        mediaUrl,
        mediaType,
        author: post.author
          ? {
              username: post.author.username,
              displayName: post.author.displayName ?? post.author.username,
            }
          : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <AppShell>
      <section className="page-section">
        <MediaGallery locale={locale} items={items} />
      </section>
    </AppShell>
  );
}
