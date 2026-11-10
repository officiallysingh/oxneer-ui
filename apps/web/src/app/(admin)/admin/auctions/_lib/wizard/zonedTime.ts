/** Date-time inputs ("2026-11-14T11:00") in the wizard are wall-clock times
 *  in the auction's time zone, not the browser's. These helpers convert them
 *  to and from offset date-times the API accepts ("2026-11-14T11:00:00+05:30"). */

const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');

/** Wall-clock parts of `date` in `timeZone`. */
function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  };
}

/** Minutes `timeZone` is ahead of UTC at `date`. */
function offsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  return `${sign}${pad(Math.trunc(minutes / 60))}:${pad(minutes % 60)}`;
}

/** "2026-11-14T11:00" in `timeZone` → "2026-11-14T11:00:00+05:30", or null. */
export function zonedInputToOffsetIso(value: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as number[];
  const wallAsUtc = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  try {
    // The offset depends on the instant; a second pass settles DST edges.
    let offset = offsetMinutes(new Date(wallAsUtc), timeZone);
    offset = offsetMinutes(new Date(wallAsUtc - offset * 60000), timeZone);
    return `${value.slice(0, 16)}:00${formatOffset(offset)}`;
  } catch {
    return null;
  }
}

/** The instant a wizard input means in `timeZone`, or null. */
export function zonedInputToDate(value: string, timeZone: string): Date | null {
  const iso = zonedInputToOffsetIso(value, timeZone);
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** An instant → the "YYYY-MM-DDTHH:mm" input showing it in `timeZone`. */
export function dateToZonedInput(date: Date, timeZone: string): string {
  try {
    const p = zonedParts(date, timeZone);
    return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
  } catch {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
