import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug must be at least 2 characters")
  .max(120, "Slug must be at most 120 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens only");

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: slugSchema,
  description: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: slugSchema.optional(),
  description: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const createSourceSchema = z.object({
  categoryId: z.string().trim().min(1, "Category id is required"),
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: slugSchema,
  type: z.enum(["RSS", "WEBSITE", "TWITTER", "NITTER", "TELEGRAM", "YOUTUBE", "MANUAL"]),
  url: z.string().trim().url().nullable().optional(),
  handle: z.string().trim().max(120).nullable().optional(),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const updateSourceSchema = z.object({
  categoryId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  slug: slugSchema.optional(),
  type: z.enum(["RSS", "WEBSITE", "TWITTER", "NITTER", "TELEGRAM", "YOUTUBE", "MANUAL"]).optional(),
  url: z.string().trim().url().nullable().optional(),
  handle: z.string().trim().max(120).nullable().optional(),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const createPostSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(200),
  slug: slugSchema,
  excerpt: z.string().trim().max(500).nullable().optional(),
  content: z.string().trim().min(1, "Content is required"),
  coverImageUrl: z.string().trim().url().nullable().optional(),
  categoryId: z.string().trim().min(1).nullable().optional(),
  sourceId: z.string().trim().min(1).nullable().optional(),
  visibility: z.enum(["PRIVATE", "PUBLIC", "UNLISTED"]).default("PRIVATE"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "DELETED"]).default("DRAFT"),
});

export const updatePostSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  slug: slugSchema.optional(),
  excerpt: z.string().trim().max(500).nullable().optional(),
  content: z.string().trim().min(1).optional(),
  coverImageUrl: z.string().trim().url().nullable().optional(),
  categoryId: z.string().trim().min(1).nullable().optional(),
  sourceId: z.string().trim().min(1).nullable().optional(),
  visibility: z.enum(["PRIVATE", "PUBLIC", "UNLISTED"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "DELETED"]).optional(),
});

export const createCommentSchema = z.object({
  postId: z.string().trim().min(1, "Post id is required"),
  parentId: z.string().trim().min(1).nullable().optional(),
  content: z.string().trim().min(1, "Comment content is required").max(2000),
});

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
