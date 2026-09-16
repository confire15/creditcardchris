import { personalEssentials } from "@/data/emergency-items";
import { personalizedReminders } from "@/data/gobag-guidance";
import { getActiveItems, isDate, type KitState } from "./kit";
export function reviewItems(state: KitState) {
  return [
    ...getActiveItems(state),
    ...personalEssentials,
    ...personalizedReminders(state.needs),
  ];
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dueReviews(state: KitState, today = localDate()) {
  return reviewItems(state).filter(
    (i) => isDate(state.reviewDates[i.id]) && state.reviewDates[i.id] <= today,
  );
}
const escapeICS = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
export function reviewCalendar(
  state: KitState,
  kitName = "GoBag",
  kitId = "gobag",
) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const events = reviewItems(state).flatMap((i) => {
    const date = state.reviewDates[i.id];
    if (!isDate(date)) return [];
    const end = new Date(`${date}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    return [
      "BEGIN:VEVENT",
      `UID:${kitId}-${i.id}-${date}@gobag.creditcardchris.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${date.replaceAll("-", "")}`,
      `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replaceAll("-", "")}`,
      `SUMMARY:${escapeICS(`Review ${kitName}: ${i.name}`)}`,
      "DESCRIPTION:Check stored supplies and product instructions. Review personal needs and local guidance.",
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      "DESCRIPTION:Review your GoBag supply",
      "END:VALARM",
      "END:VEVENT",
    ];
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GoBag//Kit reviews//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
export function downloadCalendar(
  state: KitState,
  kitName = "GoBag",
  kitId = "gobag",
) {
  const url = URL.createObjectURL(
    new Blob([reviewCalendar(state, kitName, kitId)], {
      type: "text/calendar;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "gobag-review-reminders.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
