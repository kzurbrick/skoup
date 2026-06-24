import type { FeedItem } from "@/types/feed";

function formatIcsDate(date: string, time?: string): string {
  const d = date.replace(/-/g, "");
  if (!time) return d;
  const [hours, minutes] = time.split(":").map((p) => p.padStart(2, "0"));
  return `${d}T${hours}${minutes}00`;
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateIcsFile(item: FeedItem): string {
  const uid = `${item.id}@remembr.app`;
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Remembr//Family Memory Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
  ];

  if (item.date) {
    if (item.startTime) {
      lines.push(`DTSTART:${formatIcsDate(item.date, item.startTime)}`);
      if (item.endTime) {
        lines.push(`DTEND:${formatIcsDate(item.date, item.endTime)}`);
      } else {
        const [h, m] = item.startTime.split(":").map(Number);
        const endH = String((h + 1) % 24).padStart(2, "0");
        const endM = String(m).padStart(2, "0");
        lines.push(`DTEND:${formatIcsDate(item.date, `${endH}:${endM}`)}`);
      }
    } else {
      lines.push(`DTSTART;VALUE=DATE:${item.date.replace(/-/g, "")}`);
    }
  }

  lines.push(`SUMMARY:${escapeIcs(item.title)}`);

  const description = [item.summary, item.actionRequired]
    .filter(Boolean)
    .join("\\n\\n");
  if (description) {
    lines.push(`DESCRIPTION:${escapeIcs(description)}`);
  }

  if (item.location) {
    lines.push(`LOCATION:${escapeIcs(item.location)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

export function downloadIcsFile(item: FeedItem): void {
  const content = generateIcsFile(item);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${item.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
