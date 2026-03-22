import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TimelinePostRecord = Prisma.PostGetPayload<{
  include: {
    category: true;
    source: true;
    author: true;
    updatedBy: true;
    comments: true;
    likes: true;
    repostOfPost: {
      include: {
        author: true;
      };
    };
    quotedPost: {
      include: {
        author: true;
      };
    };
  };
}>;

function mapTimelinePost(post: TimelinePostRecord) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImageUrl: post.coverImageUrl,
    status: post.status,
    visibility: post.visibility,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    category: post.category
      ? {
          id: post.category.id,
          name: post.category.name,
          slug: post.category.slug,
        }
      : null,
    source: post.source
      ? {
          id: post.source.id,
          name: post.source.name,
          slug: post.source.slug,
        }
      : null,
    author: post.author
      ? {
          id: post.author.id,
          email: post.author.email,
          username: post.author.username,
        }
      : null,
    updatedBy: post.updatedBy
      ? {
          id: post.updatedBy.id,
          email: post.updatedBy.email,
          username: post.updatedBy.username,
        }
      : null,
    commentsCount: post.comments.length,
    likesCount: post.likes.length,
    repostOfPost: post.repostOfPost
      ? {
          id: post.repostOfPost.id,
          title: post.repostOfPost.title,
          slug: post.repostOfPost.slug,
          author: post.repostOfPost.author
            ? {
                id: post.repostOfPost.author.id,
                username: post.repostOfPost.author.username,
              }
            : null,
        }
      : null,
    quotedPost: post.quotedPost
      ? {
          id: post.quotedPost.id,
          title: post.quotedPost.title,
          slug: post.quotedPost.slug,
          author: post.quotedPost.author
            ? {
                id: post.quotedPost.author.id,
                username: post.quotedPost.author.username,
              }
            : null,
        }
      : null,
  };
}

const timelinePostInclude = {
  category: true,
  source: true,
  author: true,
  updatedBy: true,
  comments: true,
  likes: true,
  repostOfPost: {
    include: {
      author: true,
    },
  },
  quotedPost: {
    include: {
      author: true,
    },
  },
} as const;

export async function listHomeTimeline(viewerUserId?: string | null) {
  if (!viewerUserId) {
    const publicPosts = await prisma.post.findMany({
      include: timelinePostInclude,
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return publicPosts.map(mapTimelinePost);
  }

  const following = await prisma.follow.findMany({
    where: {
      followerId: viewerUserId,
    },
    select: {
      followingId: true,
    },
  });

  const visibleAuthorIds = Array.from(
    new Set([viewerUserId, ...following.map((item) => item.followingId)])
  );

  const timelinePosts = await prisma.post.findMany({
    where: {
      authorUserId: {
        in: visibleAuthorIds,
      },
      status: {
        not: "DELETED",
      },
    },
    include: timelinePostInclude,
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return timelinePosts.map(mapTimelinePost);
}
