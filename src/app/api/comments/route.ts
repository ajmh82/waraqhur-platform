import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { createCommentSchema } from "@/services/content-schemas";
import { prisma } from "@/lib/prisma";
import { createInAppNotification } from "@/services/notification-service";

async function requireSessionUser() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required",
          },
        },
        { status: 401 }
      ),
    };
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    return {
      ok: true as const,
      current,
    };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_SESSION",
            message: "Invalid or expired session",
          },
        },
        { status: 401 }
      ),
    };
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const input = createCommentSchema.parse(body);

    const post = await prisma.post.findUnique({
      where: {
        id: input.postId,
      },
      select: {
        id: true,
        commentsEnabled: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "POST_NOT_FOUND",
            message: "Post not found",
          },
        },
        { status: 404 }
      );
    }

    if (!post.commentsEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "COMMENTS_DISABLED",
            message: "Comments are disabled for this post",
          },
        },
        { status: 403 }
      );
    }

    if (input.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: {
          id: input.parentId,
        },
      });

      if (!parentComment || parentComment.postId !== input.postId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_PARENT_COMMENT",
              message: "Parent comment is invalid",
            },
          },
          { status: 400 }
        );
      }
    }

    const comment = await prisma.comment.create({
      data: {
        postId: input.postId,
        parentId: input.parentId ?? null,
        content: input.content,
        authorUserId: auth.current.user.id,
        status: "ACTIVE",
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        replies: true,
        likes: true,
      },
    });

    const actorUsername = auth.current.user.username;
    const normalizedReplyBody = comment.content.replace(/\s+/g, " ").trim();
    const replyPreview =
      normalizedReplyBody.length > 140
        ? `${normalizedReplyBody.slice(0, 137)}...`
        : normalizedReplyBody;
    const postForNotification = await prisma.post.findUnique({
      where: { id: input.postId },
      select: { id: true, slug: true, authorUserId: true, updatedByUserId: true },
    });

    const actionUrl = postForNotification?.slug
      ? `/posts/${postForNotification.slug}#comment-${comment.id}`
      : `/posts/${input.postId}#comment-${comment.id}`;

    const postNotificationRecipientUserId =
      postForNotification?.authorUserId ??
      postForNotification?.updatedByUserId ??
      null;

    if (
      postNotificationRecipientUserId &&
      postNotificationRecipientUserId !== auth.current.user.id
    ) {
      await createInAppNotification({
        userId: postNotificationRecipientUserId,
        title: "رد جديد",
        body: `@${actorUsername} رد: "${replyPreview}"`,
        payload: {
          event: "post.replied",
          actionUrl,
          entityType: "comment",
          entityId: comment.id,
          metadata: {
            postId: input.postId,
            postSlug: postForNotification?.slug ?? null,
            commentId: comment.id,
            actorUserId: auth.current.user.id,
            actorUsername,
          },
        },
      });
    }

    if (input.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: input.parentId },
        select: { id: true, authorUserId: true },
      });

      if (
        parentComment?.authorUserId &&
        parentComment.authorUserId !== auth.current.user.id &&
        parentComment.authorUserId !== postNotificationRecipientUserId
      ) {
        await createInAppNotification({
          userId: parentComment.authorUserId,
          title: "رد على تعليقك",
          body: `@${actorUsername} رد: "${replyPreview}"`,
          payload: {
            event: "comment.replied",
            actionUrl,
            entityType: "comment",
            entityId: comment.id,
            metadata: {
              postId: input.postId,
              postSlug: postForNotification?.slug ?? null,
              commentId: comment.id,
              parentCommentId: parentComment.id,
              actorUserId: auth.current.user.id,
              actorUsername,
            },
          },
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          comment: {
            id: comment.id,
            postId: comment.postId,
            parentId: comment.parentId,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
            likesCount: comment.likes.length,
            author: comment.author
              ? {
                  id: comment.author.id,
                  username: comment.author.username,
                  email: comment.author.email,
                  displayName:
                    comment.author.profile?.displayName ??
                    comment.author.username,
                  avatarUrl: comment.author.profile?.avatarUrl ?? null,
                }
              : null,
            repliesCount: comment.replies.length,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid comment payload",
            details: error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COMMENT_CREATE_FAILED",
          message:
            error instanceof Error ? error.message : "Comment creation failed",
        },
      },
      { status: 400 }
    );
  }
}
