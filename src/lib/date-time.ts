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
