import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        followers: {
          include: {
            follower: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        following: {
          include: {
            following: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
        },
        followers: user.followers.map((entry) => ({
          id: entry.follower.id,
          username: entry.follower.username,
          displayName:
            entry.follower.profile?.displayName ?? entry.follower.username,
          avatarUrl: entry.follower.profile?.avatarUrl ?? null,
        })),
        following: user.following.map((entry) => ({
          id: entry.following.id,
          username: entry.following.username,
          displayName:
            entry.following.profile?.displayName ?? entry.following.username,
          avatarUrl: entry.following.profile?.avatarUrl ?? null,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "USER_CONNECTIONS_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to load user connections",
        },
      },
      { status: 400 }
    );
  }
}
