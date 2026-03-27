import { NextResponse } from "next/server";

type LocaleMode = "ar" | "en";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const locale = body?.locale;

    if (locale !== "ar" && locale !== "en") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_LOCALE",
            message: "Locale must be ar or en",
          },
        },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      data: { locale: locale as LocaleMode },
    });

    response.cookies.set("locale", locale as LocaleMode, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LOCALE_SAVE_FAILED",
          message: "Failed to save locale",
        },
      },
      { status: 400 }
    );
  }
}
