import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type SortMode = "latest" | "smart";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sort = body?.sort;

    if (sort !== "latest" && sort !== "smart") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_SORT",
            message: "Sort must be latest or smart",
          },
        },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("timeline_sort", sort as SortMode, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });

    return NextResponse.json({
      success: true,
      data: { sort },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PREFERENCE_SAVE_FAILED",
          message: "Failed to save preference",
        },
      },
      { status: 400 }
    );
  }
}
