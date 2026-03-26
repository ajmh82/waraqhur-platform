const MAKKAH_TIME_ZONE = "Asia/Riyadh";

type DateInput = string | number | Date;

export function formatDateTimeInMakkah(
  value: DateInput,
  locale: string = "ar-BH"
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: MAKKAH_TIME_ZONE,
  }).format(new Date(value));
}

export function formatDateInMakkah(
  value: DateInput,
  locale: string = "en-GB"
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: MAKKAH_TIME_ZONE,
  }).format(new Date(value));
}

export function formatRelativeTime(value: DateInput): string {
  const now = Date.now();
  const then = new Date(value).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} د`;
  if (diffHr < 24) return `منذ ${diffHr} س`;
  if (diffDay < 7) return `منذ ${diffDay} ي`;

  return formatDateTimeInMakkah(value, "ar-BH");
}
