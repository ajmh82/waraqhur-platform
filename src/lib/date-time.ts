const DEFAULT_TIME_ZONE = "Asia/Bahrain";

function normalizeLocale(locale?: string) {
  return locale === "en" || locale === "en-US" ? "en-US" : "ar-BH";
}

function getNow() {
  return new Date();
}

export function formatRelativeTime(
  value: string | Date,
  locale: string = "ar-BH"
) {
  const targetDate = value instanceof Date ? value : new Date(value);
  const now = getNow();

  const diffMs = targetDate.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const normalizedLocale = normalizeLocale(locale);

  const rtf = new Intl.RelativeTimeFormat(normalizedLocale, {
    numeric: "auto",
  });

  if (absSeconds < 60) {
    return rtf.format(diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, "day");
  }

  const diffWeeks = Math.round(diffDays / 7);
  if (Math.abs(diffWeeks) < 5) {
    return rtf.format(diffWeeks, "week");
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, "month");
  }

  const diffYears = Math.round(diffDays / 365);
  return rtf.format(diffYears, "year");
}

export function formatDateTimeInMakkah(
  value: string | Date,
  locale: string = "ar-BH"
) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DEFAULT_TIME_ZONE,
  }).format(date);
}

export function formatDateOnly(
  value: string | Date,
  locale: string = "ar-BH"
) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    dateStyle: "medium",
    timeZone: DEFAULT_TIME_ZONE,
  }).format(date);
}

export function formatTimeOnly(
  value: string | Date,
  locale: string = "ar-BH"
) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    timeStyle: "short",
    timeZone: DEFAULT_TIME_ZONE,
  }).format(date);
}

export function formatDateInMakkah(
  value: string | Date,
  locale: string = "ar-BH"
) {
  return formatDateOnly(value, locale);
}
