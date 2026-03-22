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
    .replace(/[^a-z0-9\\s-]/g, " ")
    .trim()
    .replace(/\\s+/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");

  const safeBase = base.length > 0 ? base : `item-${index + 1}`;
  return `${sourceSlug}-${safeBase}`;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ sourceId: string }> }
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

    const { sourceId } = await context.params;

    const source = await prisma.source.findUnique({
      where: {
        id: sourceId,
      },
      include: {
        category: true,
      },
    });

    if (!source) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SOURCE_NOT_FOUND",
            message: "Source not found",
          },
        },
        { status: 404 }
      );
    }

    if (source.type !== "NITTER") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SOURCE_TYPE_NOT_SUPPORTED",
            message: "Ingestion is currently supported for NITTER only",
          },
        },
        { status: 400 }
      );
    }

    if (!source.url) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SOURCE_URL_MISSING",
            message: "Source URL is missing",
          },
        },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      data: {
        source: {
          id: source.id,
          name: source.name,
          slug: source.slug,
        },
        fetchedAt: preview.fetchedAt,
        totalItems: preview.items.length,
        createdCount,
        skippedCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SOURCE_INGEST_FAILED",
          message:
            error instanceof Error ? error.message : "Failed to ingest source",
        },
      },
      { status: 400 }
    );
  }
}
