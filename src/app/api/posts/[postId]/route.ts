import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { updatePostSchema } from "@/services/content-schemas";
import { deletePost, updatePost } from "@/services/content-service";
import { userHasPermission } from "@/services/authorization-service";
import { createAuditLog } from "@/services/audit-log-service";

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
      displayName: string | null;
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

function getSocialMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = metadata as {
    social?: {
      postKind?: string;
      hashtags?: string[];
      mediaType?: "image" | "video" | null;
      mediaUrl?: string | null;
    };
  };

  return value.social ?? null;
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

async function getOptionalCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionValue) {
      return null;
    }

    const current = await getCurrentUserFromSession(sessionValue);
    return current.user;
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
    const currentUser = await getOptionalCurrentUser();
    const currentUserId = currentUser?.id ?? null;

    const post = await prisma.post.findFirst({
      where: {
        OR: [{ id: postId }, { slug: postId }],
      },
      include: {
        category: true,
        source: true,
        author: {
          include: {
            profile: true,
            followers: currentUserId
              ? {
                  where: {
                    followerId: currentUserId,
                  },
                  select: {
                    followerId: true,
                  },
                }
              : false,
          },
        },
        comments: {
          where: {
            status: "ACTIVE",
          },
          include: {
            author: {
              include: {
                profile: true,
              },
            },
            likes: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        likes: true,
        reposts: true,
        bookmarks: true,
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

    const social = getSocialMetadata(post.metadata);
    const commentsTree = buildCommentTree(post.comments, currentUserId);

    return NextResponse.json({
      success: true,
      data: {
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          coverImageUrl: post.coverImageUrl,
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
          commentsCount: post.comments.length,
          commentsEnabled: post.commentsEnabled,
          likesCount: post.likes.length,
          repostsCount: post.reposts.length,
          bookmarksCount: post.bookmarks.length,
          viewsCount:
            post.comments.length +
            post.likes.length +
            post.reposts.length +
            post.bookmarks.length +
            1,
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
                displayName:
                  post.author.profile?.displayName ?? post.author.username,
                avatarUrl: post.author.profile?.avatarUrl ?? null,
                isFollowing: currentUserId
                  ? Array.isArray(post.author.followers) &&
                    post.author.followers.length > 0
                  : false,
                isOwnProfile: currentUserId
                  ? post.author.id === currentUserId
                  : false,
              }
            : null,
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
          metadata: {
            social: social
              ? {
                  postKind: social.postKind ?? null,
                  hashtags: social.hashtags ?? [],
                  mediaType: social.mediaType ?? null,
                  mediaUrl: social.mediaUrl ?? null,
                }
              : undefined,
          },
        },
        comments: commentsTree,
        currentUser: currentUser
          ? {
              user: {
                id: currentUser.id,
                username: currentUser.username,
              },
            }
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "POST_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Post load failed",
        },
      },
      { status: 400 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      },
      { status: 401 }
    );
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    const canUpdatePosts = await userHasPermission(
      current.user.id,
      "posts.update"
    );

    if (!canUpdatePosts) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to update posts",
          },
        },
        { status: 403 }
      );
    }

    const { postId } = await context.params;
    const body = await request.json();
    const input = updatePostSchema.parse(body);
    const post = await updatePost(postId, input, current.user.id);

    await createAuditLog({
      actorUserId: current.user.id,
      actorType: "USER",
      action: "POST_UPDATED",
      targetType: "POST",
      targetId: post.id,
      metadata: {
        title: post.title,
        slug: post.slug,
        status: post.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        post,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid post update payload",
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
          code: "POST_UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Post update failed",
        },
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      },
      { status: 401 }
    );
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    const canDeletePosts = await userHasPermission(
      current.user.id,
      "posts.delete"
    );

    if (!canDeletePosts) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to delete posts",
          },
        },
        { status: 403 }
      );
    }

    const { postId } = await context.params;
    const post = await deletePost(postId, current.user.id);

    await createAuditLog({
      actorUserId: current.user.id,
      actorType: "USER",
      action: "POST_DELETED",
      targetType: "POST",
      targetId: post.id,
      metadata: {
        title: post.title,
        slug: post.slug,
        status: post.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        post,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "POST_DELETE_FAILED",
          message: error instanceof Error ? error.message : "Post delete failed",
        },
      },
      { status: 400 }
    );
  }
}
