import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PostStatus, PostVisibility } from "@prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { userHasPermission } from "@/services/authorization-service";
import { fetchNitterTimeline } from "@/services/ingestion/nitter-ingestion-service";

function buildPostSlug(sourceSlug: string, text: string, index: number) {
  const base = text
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");

  const safeBase = base.length > 0 ? base : `item-${index + 1}`;
  return `${sourceSlug}-${safeBase}`;
}

export async function POST() {
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
    const canManageSources = await userHasPermission(
      current.user.id,
      "sources.manage"
    );

    if (!canManageSources) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to ingest sources",
          },
        },
        { status: 403 }
      );
    }

    const sources = await prisma.source.findMany({
      where: {
        type: "NITTER",
        status: "ACTIVE",
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    let totalCreatedCount = 0;
    let totalSkippedCount = 0;
    const results: Array<{
      sourceId: string;
      sourceName: string;
      createdCount: number;
      skippedCount: number;
      totalItems: number;
      error: string | null;
    }> = [];

    for (const source of sources) {
      if (!source.url) {
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          createdCount: 0,
          skippedCount: 0,
          totalItems: 0,
          error: "Source URL is missing",
        });
        continue;
      }

      try {
        const preview = await fetchNitterTimeline(source.url);

        let createdCount = 0;
        let skippedCount = 0;

        for (const [index, item] of preview.items.entries()) {
          const title = item.text.slice(0, 180).trim();

          if (!title) {
            skippedCount += 1;
            continue;
          }

          const slug = buildPostSlug(source.slug, item.text, index);

          const existing = await prisma.post.findFirst({
            where: {
              OR: [
                { slug },
                {
                  sourceId: source.id,
                  title,
                },
              ],
            },
          });

          if (existing) {
            skippedCount += 1;
            continue;
          }

          await prisma.post.create({
            data: {
              title,
              slug,
              excerpt: item.text.slice(0, 280),
              content: item.text,
              categoryId: source.categoryId,
              sourceId: source.id,
              visibility: PostVisibility.PUBLIC,
              status: PostStatus.PUBLISHED,
              authorUserId: current.user.id,
              updatedByUserId: current.user.id,
              publishedAt: new Date(),
              metadata: {
                ingestion: {
                  provider: "nitter",
                  fetchedAt: preview.fetchedAt,
                  originalUrl: item.url,
                },
              },
            },
          });

          createdCount += 1;
        }

        await prisma.source.update({
          where: {
            id: source.id,
          },
          data: {
            config: {
              ...(typeof source.config === "object" && source.config ? source.config : {}),
              lastIngestedAt: new Date().toISOString(),
            },
          },
        });

        totalCreatedCount += createdCount;
        totalSkippedCount += skippedCount;

        results.push({
          sourceId: source.id,
          sourceName: source.name,
          createdCount,
          skippedCount,
          totalItems: preview.items.length,
          error: null,
        });
      } catch (error) {
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          createdCount: 0,
          skippedCount: 0,
          totalItems: 0,
          error: error instanceof Error ? error.message : "Ingestion failed",
        });
      }
    }

    await prisma.source.update({
      where: {
        id: source.id,
      },
      data: {
        config: {
          ...(typeof source.config === "object" && source.config ? source.config : {}),
          lastIngestedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalSources: sources.length,
        totalCreatedCount,
        totalSkippedCount,
        results,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BULK_SOURCE_INGEST_FAILED",
          message:
            error instanceof Error ? error.message : "Bulk ingestion failed",
        },
      },
      { status: 400 }
    );
  }
}
