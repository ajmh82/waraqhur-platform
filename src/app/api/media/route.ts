import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function hasMedia(post: {
  coverImageUrl: string | null;
  metadata: unknown;
}) {
  if (post.coverImageUrl) {
    return true;
  }

  if (!post.metadata || typeof post.metadata !== "object") {
    return false;
  }

  const metadata = post.metadata as {
    ingestion?: {
      imageUrl?: string | null;
      thumbnailUrl?: string | null;
      originalUrl?: string | null;
    };
  };

  return Boolean(
    metadata.ingestion?.imageUrl ||
      metadata.ingestion?.thumbnailUrl ||
      metadata.ingestion?.originalUrl
  );
}

function getMediaUrl(post: {
  coverImageUrl: string | null;
  metadata: unknown;
}) {
  if (post.coverImageUrl) {
    return post.coverImageUrl;
  }

  if (!post.metadata || typeof post.metadata !== "object") {
    return null;
  }

  const metadata = post.metadata as {
    ingestion?: {
      imageUrl?: string | null;
      thumbnailUrl?: string | null;
      originalUrl?: string | null;
    };
  };

  return (
    metadata.ingestion?.imageUrl ??
    metadata.ingestion?.thumbnailUrl ??
    metadata.ingestion?.originalUrl ??
    null
  );
}

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
      },
      include: {
        category: true,
        source: true,
        author: true,
        comments: true,
        likes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
    });

    const mediaPosts = posts
      .filter(hasMedia)
      .map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        createdAt: post.createdAt.toISOString(),
        mediaUrl: getMediaUrl(post),
        commentsCount: post.comments.length,
        likesCount: post.likes.length,
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
      }));

    return NextResponse.json({
      success: true,
      data: {
        posts: mediaPosts,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MEDIA_LIST_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to load media posts",
        },
      },
      { status: 400 }
    );
  }
}
