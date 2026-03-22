import {
  CategoryStatus,
  CommentStatus,
  PostStatus,
  Prisma,
  SourceStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CreateCategoryInput,
  CreateCommentInput,
  CreatePostInput,
  CreateSourceInput,
  UpdateCategoryInput,
  UpdateCommentInput,
  UpdatePostInput,
  UpdateSourceInput,
} from "@/services/content-schemas";

function normalizeNullableString(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function mapCategory(category: Prisma.CategoryGetPayload<Record<string, never>>) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    status: category.status,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function mapSource(
  source: Prisma.SourceGetPayload<{
    include: {
      category: true;
      posts: true;
    };
  }>
) {
  const config =
    source.config && typeof source.config === "object" && !Array.isArray(source.config)
      ? source.config
      : null;

  const lastIngestedAt =
    config && "lastIngestedAt" in config && typeof config.lastIngestedAt === "string"
      ? config.lastIngestedAt
      : null;

  return {
    id: source.id,
    categoryId: source.categoryId,
    name: source.name,
    slug: source.slug,
    type: source.type,
    url: source.url,
    handle: source.handle,
    status: source.status,
    config: source.config,
    postsCount: source.posts.length,
    lastIngestedAt,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
    category: {
      id: source.category.id,
      name: source.category.name,
      slug: source.category.slug,
    },
  };
}

function mapPost(
  post: Prisma.PostGetPayload<{
    include: {
      category: true;
      source: true;
      author: true;
      updatedBy: true;
      comments: true;
    };
  }>
) {
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
    metadata: post.metadata,
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
    likesCount: 0,
  };
}

function mapComment(
  comment: Prisma.CommentGetPayload<{
    include: {
      author: true;
      replies: true;
    };
  }>
) {
  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    content: comment.content,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: comment.author
      ? {
          id: comment.author.id,
          email: comment.author.email,
          username: comment.author.username,
        }
      : null,
    repliesCount: comment.replies.length,
  };
}

function buildCommentTree<
  T extends {
    id: string;
    parentId: string | null;
    replies: T[];
  },
>(comments: T[]) {
  const byId = new Map<string, T>();
  const roots: T[] = [];

  for (const comment of comments) {
    byId.set(comment.id, comment);
  }

  for (const comment of comments) {
    if (comment.parentId) {
      const parent = byId.get(comment.parentId);
      if (parent) {
        parent.replies.push(comment);
        continue;
      }
    }

    roots.push(comment);
  }

  return roots;
}

export async function createCategory(input: CreateCategoryInput) {
  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: normalizeNullableString(input.description),
      status: CategoryStatus.ACTIVE,
      sortOrder: input.sortOrder,
    },
  });

  return mapCategory(category);
}

export async function listCategories() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return categories.map(mapCategory);
}

export async function updateCategory(categoryId: string, input: UpdateCategoryInput) {
  const category = await prisma.category.update({
    where: {
      id: categoryId,
    },
    data: {
      name: input.name,
      slug: input.slug,
      description: normalizeNullableString(input.description),
      sortOrder: input.sortOrder,
    },
  });

  return mapCategory(category);
}

export async function deleteCategory(categoryId: string) {
  const category = await prisma.category.update({
    where: {
      id: categoryId,
    },
    data: {
      status: CategoryStatus.ARCHIVED,
    },
  });

  return mapCategory(category);
}

export async function createSource(input: CreateSourceInput) {
  const source = await prisma.source.create({
    data: {
      categoryId: input.categoryId,
      name: input.name,
      slug: input.slug,
      type: input.type,
      url: normalizeNullableString(input.url),
      handle: normalizeNullableString(input.handle),
      config: (input.config ?? null) as Prisma.InputJsonValue,
      status: SourceStatus.ACTIVE,
    },
    include: {
      category: true,
      posts: true,
    },
  });

  return mapSource(source);
}

export async function listSources() {
  const sources = await prisma.source.findMany({
    include: {
      category: true,
      posts: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return sources.map(mapSource);
}

export async function updateSource(sourceId: string, input: UpdateSourceInput) {
  const source = await prisma.source.update({
    where: {
      id: sourceId,
    },
    data: {
      categoryId: input.categoryId,
      name: input.name,
      slug: input.slug,
      type: input.type,
      url: normalizeNullableString(input.url),
      handle: normalizeNullableString(input.handle),
      config:
        input.config === undefined
          ? undefined
          : ((input.config ?? null) as Prisma.InputJsonValue),
    },
    include: {
      category: true,
      posts: true,
    },
  });

  return mapSource(source);
}

export async function deleteSource(sourceId: string) {
  const source = await prisma.source.update({
    where: {
      id: sourceId,
    },
    data: {
      status: SourceStatus.ARCHIVED,
    },
    include: {
      category: true,
      posts: true,
    },
  });

  return mapSource(source);
}

export async function createPost(input: CreatePostInput, authorUserId: string) {
  const existing = await prisma.post.findFirst({
    where: {
      slug: input.slug,
    },
  });

  if (existing) {
    throw new Error("Post slug already exists");
  }

  const post = await prisma.post.create({
    data: {
      title: input.title,
      slug: input.slug,
      excerpt: normalizeNullableString(input.excerpt),
      content: input.content,
      coverImageUrl: normalizeNullableString(input.coverImageUrl),
      categoryId: normalizeNullableString(input.categoryId),
      sourceId: normalizeNullableString(input.sourceId),
      repostOfPostId: normalizeNullableString(input.repostOfPostId),
      quotedPostId: normalizeNullableString(input.quotedPostId),
      visibility: input.visibility,
      status: input.status,
      authorUserId,
      updatedByUserId: authorUserId,
      publishedAt: input.status === PostStatus.PUBLISHED ? new Date() : null,
    },
    include: {
      category: true,
      source: true,
      author: true,
      updatedBy: true,
      comments: true,
    },
  });

  return mapPost(post);
}

export async function listPosts() {
  const posts = await prisma.post.findMany({
    include: {
      category: true,
      source: true,
      author: true,
      updatedBy: true,
      comments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return posts.map(mapPost);
}

export async function updatePost(
  postId: string,
  input: UpdatePostInput,
  updatedByUserId: string
) {
  const post = await prisma.post.update({
    where: {
      id: postId,
    },
    data: {
      title: input.title,
      slug: input.slug,
      excerpt: normalizeNullableString(input.excerpt),
      content: input.content,
      coverImageUrl: normalizeNullableString(input.coverImageUrl),
      categoryId: normalizeNullableString(input.categoryId),
      sourceId: normalizeNullableString(input.sourceId),
      repostOfPostId: normalizeNullableString(input.repostOfPostId),
      quotedPostId: normalizeNullableString(input.quotedPostId),
      visibility: input.visibility,
      status: input.status,
      updatedByUserId,
      publishedAt:
        input.status === PostStatus.PUBLISHED ? new Date() : undefined,
    },
    include: {
      category: true,
      source: true,
      author: true,
      updatedBy: true,
      comments: true,
    },
  });

  return mapPost(post);
}

export async function deletePost(postId: string, updatedByUserId: string) {
  const post = await prisma.post.update({
    where: {
      id: postId,
    },
    data: {
      status: PostStatus.DELETED,
      updatedByUserId,
    },
    include: {
      category: true,
      source: true,
      author: true,
      updatedBy: true,
      comments: true,
    },
  });

  return mapPost(post);
}

export async function createComment(input: CreateCommentInput, authorUserId: string) {
  const comment = await prisma.comment.create({
    data: {
      postId: input.postId,
      parentId: normalizeNullableString(input.parentId),
      content: input.content,
      status: CommentStatus.ACTIVE,
      authorUserId,
    },
    include: {
      author: true,
      replies: true,
    },
  });

  return mapComment(comment);
}

export async function listComments(postId?: string) {
  const comments = await prisma.comment.findMany({
    where: {
      postId,
    },
    include: {
      author: true,
      replies: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const mapped = comments.map((comment) => ({
    ...mapComment(comment),
    replies: [],
  }));

  return buildCommentTree(mapped);
}

export async function updateComment(commentId: string, input: UpdateCommentInput) {
  const comment = await prisma.comment.update({
    where: {
      id: commentId,
    },
    data: {
      content: input.content,
    },
    include: {
      author: true,
      replies: true,
    },
  });

  return mapComment(comment);
}

export async function deleteComment(commentId: string) {
  const comment = await prisma.comment.update({
    where: {
      id: commentId,
    },
    data: {
      status: CommentStatus.DELETED,
    },
    include: {
      author: true,
      replies: true,
    },
  });

  return mapComment(comment);
}
