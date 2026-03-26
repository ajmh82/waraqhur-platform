import crypto from "node:crypto";
import Parser from "rss-parser";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const parser = new Parser({ timeout: 15000 });

type SourceRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.source.findUnique>>
>;

interface RssItemLike {
  title?: unknown;
  link?: unknown;
  guid?: unknown;
  contentSnippet?: unknown;
  content?: unknown;
  isoDate?: unknown;
  pubDate?: unknown;
}

function sha1(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildSlug(title: string, fallback: string) {
  const cleaned = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 90);

  return cleaned || fallback;
}

async function createOrSkipPost(params: {
  source: SourceRecord;
  title: string;
  content: string;
  externalId: string;
  originalUrl?: string | null;
  publishedAt?: Date;
  provider: "rss" | "nitter";
}) {
  const { source, title, content, externalId, originalUrl, publishedAt, provider } = params;

  const metadataFilters: Prisma.PostWhereInput[] = [
    { metadata: { path: ["ingestion", "externalId"], equals: externalId } },
  ];

  if (originalUrl) {
    metadataFilters.push({
      metadata: { path: ["ingestion", "originalUrl"], equals: originalUrl },
    });
  }

  const existing = await prisma.post.findFirst({
    where: {
      sourceId: source.id,
      OR: metadataFilters,
    },
  });

  if (existing) return false;

  const fallbackSlug = sha1(`${source.id}:${title}:${externalId}`).slice(0, 16);
  const postSlug = buildSlug(title, fallbackSlug);

  await prisma.post.create({
    data: {
      title,
      slug: postSlug,
      excerpt: content.slice(0, 280) || title,
      content,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      sourceId: source.id,
      categoryId: source.categoryId,
      authorUserId: null,
      updatedByUserId: null,
      publishedAt: publishedAt || new Date(),
      metadata: {
        ingestion: {
          provider,
          externalId,
          fetchedAt: new Date().toISOString(),
          originalUrl: originalUrl || null,
        },
      },
    },
  });

  return true;
}

export async function ingestSourceById(sourceId: string) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });

  if (!source) {
    throw new Error("SOURCE_NOT_FOUND");
  }

  if (source.type === "MANUAL") {
    return {
      sourceId: source.id,
      sourceName: source.name,
      createdCount: 0,
      skippedCount: 0,
      totalItems: 0,
      message: "MANUAL source does not require ingestion",
    };
  }

  if (source.type === "RSS") {
    const feed = await parser.parseURL(source.url ?? "");
    const items = Array.isArray(feed.items) ? feed.items.slice(0, 15) : [];

    let createdCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      const typedItem = item as RssItemLike;
      const title = normalizeText(typedItem.title);
      const link = normalizeText(typedItem.link);
      const guid = normalizeText(typedItem.guid);
      const content =
        normalizeText(typedItem.contentSnippet) ||
        normalizeText(typedItem.content) ||
        title;

      if (!title) {
        skippedCount++;
        continue;
      }

      const externalId = guid || link || sha1(`${source.id}:${title}:${content}`);

      const publishedAtRaw =
        normalizeText(typedItem.isoDate) ||
        normalizeText(typedItem.pubDate);

      const publishedAt = publishedAtRaw ? new Date(publishedAtRaw) : new Date();

      const created = await createOrSkipPost({
        source,
        title,
        content,
        externalId,
        originalUrl: link || null,
        publishedAt,
        provider: "rss",
      });

      if (created) createdCount++;
      else skippedCount++;
    }

    return {
      sourceId: source.id,
      sourceName: source.name,
      createdCount,
      skippedCount,
      totalItems: items.length,
    };
  }

  if (source.type === "NITTER") {
    throw new Error("NITTER_INGEST_SHOULD_USE_WORKER");
  }

  throw new Error("SOURCE_TYPE_NOT_SUPPORTED");
}
