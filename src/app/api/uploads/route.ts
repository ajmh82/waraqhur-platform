import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";

const IMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const VIDEO_MIME_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const AUDIO_MIME_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/webm;codecs=opus": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;
const MAX_AUDIO_SIZE = 12 * 1024 * 1024;

async function requireSessionUser() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required",
          },
        },
        { status: 401 }
      ),
    };
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    return {
      ok: true as const,
      current,
    };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_SESSION",
            message: "Invalid or expired session",
          },
        },
        { status: 401 }
      ),
    };
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FILE_REQUIRED",
            message: "A file is required",
          },
        },
        { status: 400 }
      );
    }

    const imageExtension = IMAGE_MIME_TYPES[fileEntry.type];
    const videoExtension = VIDEO_MIME_TYPES[fileEntry.type];
    const audioExtension = AUDIO_MIME_TYPES[fileEntry.type];

    if (!imageExtension && !videoExtension && !audioExtension) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNSUPPORTED_FILE_TYPE",
            message:
              "Only JPG, PNG, WEBP, GIF, MP4, WEBM, MOV, WEBM audio, MP3, M4A, and OGG are supported",
          },
        },
        { status: 400 }
      );
    }

    const mediaType = imageExtension
      ? "image"
      : videoExtension
        ? "video"
        : "audio";
    const maxAllowedSize =
      mediaType === "image"
        ? MAX_IMAGE_SIZE
        : mediaType === "video"
          ? MAX_VIDEO_SIZE
          : MAX_AUDIO_SIZE;

    if (fileEntry.size > maxAllowedSize) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FILE_TOO_LARGE",
            message:
              mediaType === "image"
                ? "Image size must not exceed 5MB"
                : mediaType === "video"
                  ? "Video size must not exceed 20MB"
                  : "Audio size must not exceed 12MB",
          },
        },
        { status: 400 }
      );
    }

    const extension = imageExtension ?? videoExtension ?? audioExtension;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    await mkdir(uploadsDir, { recursive: true });

    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`;
    const filePath = path.join(uploadsDir, fileName);
    const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());

    await writeFile(filePath, fileBuffer);

    return NextResponse.json({
      success: true,
      data: {
        url: `/uploads/${fileName}`,
        mediaType,
        size: fileEntry.size,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPLOAD_FAILED",
          message: error instanceof Error ? error.message : "Upload failed",
        },
      },
      { status: 400 }
    );
  }
}
