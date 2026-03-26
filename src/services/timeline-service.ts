import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TimelineSortMode = "latest" | "smart";

const timelineInclude = {
  category: true,
  source: true,
  author: true,
  updatedBy: true,
  repostOfPost: { include: { author: true } },
  quotedPost: { include: { author: true } },
  _count: { select: { comments: true, likes: true } },
} as const;

type TimelinePost = Prisma.PostGetPayload<{
  include: typeof timelineInclude;
}>;

interface ScoredPost {
  post: TimelinePost;
  score: number;
}

function scorePost(
  post: TimelinePost,
  userId?: string | null,
  followingIds: string[] = []
): number {
  const now = Date.now();
  const created = new Date(post.publishedAt || post.createdAt).getTime();
  const hours = (now - created) / (1000 * 60 * 60);

  const likes = post._count?.likes ?? 0;
  const comments = post._count?.comments ?? 0;

  const engagement = likes * 10 + comments * 20;
  const recency = Math.max(0, 100 / (1 + hours));
  const followBoost =
    userId && post.authorUserId && followingIds.includes(post.authorUserId)
      ? 25
      : 0;

  return engagement + recency + followBoost;
}

function cleanPost(post: TimelinePost) {
  return {
    ...post,
    repostOfPost:
      post.repostOfPost?.status === "PUBLISHED" ? post.repostOfPost : null,
    quotedPost:
      post.quotedPost?.status === "PUBLISHED" ? post.quotedPost : null,
    commentsCount: post._count?.comments ?? 0,
    likesCount: post._count?.likes ?? 0,
  };
}

export async function listHomeTimeline(
  userId?: string | null,
  sort: TimelineSortMode = "latest"
) {
  let followingIds: string[] = [];

  if (userId) {
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    followingIds = following.map((f) => f.followingId);
  }

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      visibility: "PUBLIC",
    },
    include: timelineInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (sort === "latest") {
    return posts.map(cleanPost);
  }

  const scored: ScoredPost[] = posts.map((post) => ({
    post,
    score: scorePost(post, userId, followingIds),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.map((item) => cleanPost(item.post));
}
