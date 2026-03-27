import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim();

    if (!query) {
      return NextResponse.json({
        success: true,
        data: {
          query: "",
          users: [],
          posts: [],
        },
      });
    }

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
                displayName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            },
          ],
        },
        include: {
          profile: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      }),
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          slug: {
            not: null,
          },
          OR: [
            {
              title: {
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
            {
              excerpt: {
                contains: query,
                mode: "insensitive",
              },
            },
          ],
        },
        include: {
          author: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 18,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        query,
        users: users.map((user) => ({
          id: user.id,
          username: user.username,
          displayName: user.profile?.displayName ?? user.username,
          avatarUrl: user.profile?.avatarUrl ?? null,
        })),
        posts: posts.map((post) => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          createdAt: post.createdAt.toISOString(),
          author: post.author
            ? {
                id: post.author.id,
                username: post.author.username,
                displayName:
                  post.author.profile?.displayName ?? post.author.username,
                avatarUrl: post.author.profile?.avatarUrl ?? null,
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
            error instanceof Error ? error.message : "Failed to search",
        },
      },
      { status: 400 }
    );
  }
}
