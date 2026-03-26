import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q")?.trim() ?? "";

    if (!rawQuery) {
      return NextResponse.json({
        success: true,
        data: {
          query: "",
          users: [],
          posts: [],
        },
      });
    }

    const query = rawQuery.toLowerCase();

    const [users, posts] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            {
              username: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              profile: {
                is: {
                  displayName: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        },
        include: {
          profile: true,
          followers: true,
          following: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            {
              title: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              excerpt: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              content: {
                contains: query,
                mode: "insensitive",
              },
            },
          ],
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
        take: 12,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        query: rawQuery,
        users: users.map((user) => ({
          id: user.id,
          username: user.username,
          displayName: user.profile?.displayName ?? user.username,
          avatarUrl: user.profile?.avatarUrl ?? null,
          bio: user.profile?.bio ?? null,
          followersCount: user.followers.length,
          followingCount: user.following.length,
        })),
        posts: posts.map((post) => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          createdAt: post.createdAt.toISOString(),
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
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SEARCH_FAILED",
          message:
            error instanceof Error ? error.message : "Search request failed",
        },
      },
      { status: 400 }
    );
  }
}
