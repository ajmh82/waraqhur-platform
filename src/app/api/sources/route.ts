import { NextResponse } from "next/server";
import { createSourceSchema } from "@/services/content-schemas";
import {
  createSource,
  listSources,
} from "@/services/content-service";

export async function GET() {
  try {
    const sources = await listSources();

    return NextResponse.json({
      success: true,
      data: {
        sources,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LIST_SOURCES_FAILED",
          message:
            error instanceof Error ? error.message : "Failed to load sources",
        },
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = createSourceSchema.parse(json);
    const source = await createSource(input);

    return NextResponse.json(
      {
        success: true,
        data: {
          source,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CREATE_SOURCE_FAILED",
          message:
            error instanceof Error ? error.message : "Failed to create source",
        },
      },
      { status: 400 }
    );
  }
}
