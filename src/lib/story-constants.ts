export const STORY_EXPIRES_HOURS = 24;
export const STORY_TEXT_MAX = 500;
export const STORY_CAPTION_MAX = 180;
export const STORY_IMAGE_DEFAULT_SECONDS = 5;
export const STORY_VIDEO_MAX_SECONDS = 60;
export const STORY_VIDEO_DEFAULT_SECONDS = 15;

export const STORY_ALLOWED_PRIVACY = [
  "AUTHENTICATED",
  "FOLLOWERS",
  "PRIVATE",
  "CLOSE_FRIENDS",
] as const;

export const STORY_ALLOWED_TYPES = ["IMAGE", "VIDEO", "TEXT"] as const;

export function storyExpiresAtFromNow() {
  return new Date(Date.now() + STORY_EXPIRES_HOURS * 60 * 60 * 1000);
}
