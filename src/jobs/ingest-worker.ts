import crypto from "node:crypto";
import Parser from "rss-parser";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const parser = new Parser({
  timeout: 15000,
});

type SourceRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.source.findFirst>>
>;

type SourceHealth = "HEALTHY" | "DEGRADED" | "BROKEN" | "STATIC";

interface SourceRuntimeConfig {
  lastCheckedAt?: string | null;
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
  consecutiveFailures?: number;
  statusHealth?: SourceHealth;
}

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

function readSourceConfig(value: unknown): SourceRuntimeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const raw = value as Record<string, unknown>;

  return {
    lastCheckedAt:
      typeof raw.lastCheckedAt === "string" ? raw.lastCheckedAt : null,
    lastSuccessAt:
      typeof raw.lastSuccessAt === "string" ? raw.lastSuccessAt : null,
    lastErrorAt:
      typeof raw.lastErrorAt === "string" ? raw.lastErrorAt : null,
    lastErrorMessage:
      typeof raw.lastErrorMessage === "string" ? raw.lastErrorMessage : null,
    consecutiveFailures:
      typeof raw.consecutiveFailures === "number"
        ? raw.consecutiveFailures
        : 0,
    statusHealth:
      raw.statusHealth === "HEALTHY" ||
      raw.statusHealth === "DEGRADED" ||
      raw.statusHealth === "BROKEN" ||
      raw.statusHealth === "STATIC"
        ? raw.statusHealth
        : undefined,
  };
}

async function updateSourceHealth(
  source: SourceRecord,
  input: {
    ok: boolean;
    errorMessage?: string | null;
  }
) {
  const previous = readSourceConfig(source.config);
  const consecutiveFailures = input.ok
    ? 0
    : Number(previous.consecutiveFailures || 0) + 1;

  const nextConfig: Prisma.InputJsonValue = {
    ...previous,
    lastCheckedAt: new Date().toISOString(),
    lastSuccessAt: input.ok
      ? new Date().toISOString()
      : previous.lastSuccessAt || null,
    lastErrorAt: input.ok
      ? previous.lastErrorAt || null
      : new Date().toISOString(),
    lastErrorMessage: input.ok ? null : input.errorMessage || "Unknown error",
    consecutiveFailures,
    statusHealth: input.ok
      ? "HEALTHY"
      : consecutiveFailures >= 3
        ? "BROKEN"
        : "DEGRADED",
  };

  await prisma.source.update({
    where: { id: source.id },
    data: {
      config: nextConfig,
    },
  });
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

  if (existing) {
    return false;
  }

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

async function ingestRssSource(source: SourceRecord) {
  console.log(`🔄 ingesting RSS: ${source.name}`);

  const feed = await parser.parseURL(source.url ?? "");
  const items = Array.isArray(feed.items) ? feed.items.slice(0, 15) : [];

  let created = 0;
  let skipped = 0;

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
      skipped++;
      continue;
    }

    const externalId = guid || link || sha1(`${source.id}:${title}:${content}`);

    const publishedAtRaw =
      normalizeText(typedItem.isoDate) ||
      normalizeText(typedItem.pubDate);

    const publishedAt = publishedAtRaw ? new Date(publishedAtRaw) : new Date();

    const createdPost = await createOrSkipPost({
      source,
      title,
      content,
      externalId,
      originalUrl: link || null,
      publishedAt,
      provider: "rss",
    });

    if (createdPost) created++;
    else skipped++;
  }

  console.log(`✅ ${source.name} → ${created} new / ${skipped} skipped`);
  await updateSourceHealth(source, { ok: true });
}

function extractNitterItems(html: string, sourceUrl: string) {
  const items: Array<{
    title: string;
    content: string;
    externalId: string;
    originalUrl: string | null;
    publishedAt?: Date;
  }> = [];

  const hrefMatches = [...html.matchAll(/href="\/[^"]*\/status\/(\d+)"/g)];
  const uniqueIds = Array.from(new Set(hrefMatches.map((m) => m[1]))).slice(0, 15);

  for (const statusId of uniqueIds) {
    const title = `Nitter item ${statusId}`;
    const content = `Post from ${sourceUrl} (${statusId})`;
    const originalUrl = `${sourceUrl.replace(/\/+$/, "")}/status/${statusId}`;

    items.push({
      title,
      content,
      externalId: statusId,
      originalUrl,
      publishedAt: new Date(),
    });
  }

  return items;
}

async function ingestNitterSource(source: SourceRecord) {
  console.log(`🔄 ingesting NITTER: ${source.name}`);

  const response = await fetch(source.url ?? "", {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; WaraqhurBot/1.0)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  const html = await response.text();

  if (!html || html.trim().length === 0) {
    throw new Error("Empty response from Nitter source");
  }

  const items = extractNitterItems(html, source.url ?? "");

  let created = 0;
  let skipped = 0;

  for (const item of items) {
    const createdPost = await createOrSkipPost({
      source,
      title: item.title,
      content: item.content,
      externalId: item.externalId,
      originalUrl: item.originalUrl,
      publishedAt: item.publishedAt,
      provider: "nitter",
    });

    if (createdPost) created++;
    else skipped++;
  }

  console.log(`✅ ${source.name} → ${created} new / ${skipped} skipped`);
  await updateSourceHealth(source, { ok: true });
}

async function ingestSource(source: SourceRecord) {
  try {
    if (source.type === "RSS") {
      await ingestRssSource(source);
      return;
    }

    if (source.type === "NITTER") {
      await ingestNitterSource(source);
      return;
    }

    console.log(`⏭️ skipped unsupported source type: ${source.name} (${source.type})`);

    if (source.type === "MANUAL") {
      const currentConfig = readSourceConfig(source.config);

      await prisma.source.update({
        where: { id: source.id },
        data: {
          config: {
            ...currentConfig,
            lastCheckedAt: new Date().toISOString(),
            statusHealth: "STATIC",
            lastErrorMessage: null,
            consecutiveFailures: 0,
          },
        },
      });
      return;
    }

    await updateSourceHealth(source, {
      ok: false,
      errorMessage: `Unsupported source type: ${source.type}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ ${source.name}`, error);
    await updateSourceHealth(source, {
      ok: false,
      errorMessage: message,
    });
  }
}

async function runCycle() {
  console.log("🚀 ingest worker started");

  const sources = await prisma.source.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  for (const source of sources) {
    await ingestSource(source);
  }

  console.log("⏱ done cycle");
}

async function loop() {
  while (true) {
    await runCycle();
    await new Promise((resolve) => setTimeout(resolve, 60_000));
  }
}

loop().catch((error) => {
  console.error("💥 worker crashed", error);
  process.exit(1);
});
