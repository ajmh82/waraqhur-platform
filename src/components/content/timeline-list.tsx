import { PostCard } from "@/components/content/post-card";

interface TimelineListProps {
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
        provider?: string;
        fetchedAt?: string;
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
  locale?: "ar" | "en";
}

export function TimelineList({
  posts,
  locale = "ar",
}: TimelineListProps) {
  return (
    <div className="timeline-list">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} locale={locale} />
      ))}
    </div>
  );
}
