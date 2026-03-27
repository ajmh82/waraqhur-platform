import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";

interface RawCommentRecord {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    username: string;
    email: string;
    profile: {
      displayName: string;
      avatarUrl: string | null;
    } | null;
  } | null;
  likes: Array<{ userId: string }>;
}

interface ThreadCommentNode {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  likesCount: number;
  isLikedByCurrentUser: boolean;
  author: {
    id: string;
    username: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  replies: ThreadCommentNode[];
}

function buildCommentTree(
  comments: RawCommentRecord[],
  currentUserId: string | null,
  parentId: string | null = null
): ThreadCommentNode[] {
  return comments
    .filter((comment) => comment.parentId === parentId)
    .map((comment): ThreadCommentNode => ({
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      likesCount: comment.likes.length,
      isLikedByCurrentUser: currentUserId
        ? comment.likes.some((like) => like.userId === currentUserId)
        : false,
      author: comment.author
        ? {
            id: comment.author.id,
            username: comment.author.username,
            email: comment.author.email,
            displayName:
              comment.author.profile?.displayName ?? comment.author.username,
            avatarUrl: comment.author.profile?.avatarUrl ?? null,
          }
        : null,
      replies: buildCommentTree(comments, currentUserId, comment.id),
    }));
}

async function getOptionalCurrentUserId() {
  try {
    const cookieStore = await cookies();
    const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionValue) {
      return null;
    }

    const current = await getCurrentUserFromSession(sessionValue);
    return current.user.id;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await context.params;
    const currentUserId = await getOptionalCurrentUserId();

    const comments = await prisma.comment.findMany({
      where: {
        postId,
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        likes: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        comments: buildCommentTree(comments, currentUserId),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "THREAD_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Thread load failed",
        },
      },
      { status: 400 }
    );
  }
}
