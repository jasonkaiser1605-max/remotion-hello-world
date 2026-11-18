import type { Weekday } from './types';

// All plan dates are local calendar dates in YYYY-MM-DD form. We do the math in UTC
// so daylight-saving changes never shift a day.

export function parseDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(ymd: string, days: number): string {
  const d = parseDate(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);
}

/** Monday = 0 … Sunday = 6 */
export function weekdayOf(ymd: string): Weekday {
  const js = parseDate(ymd).getUTCDay(); // Sunday = 0
  return ((js + 6) % 7) as Weekday;
}

export function mondayOnOrAfter(ymd: string): string {
  const wd = weekdayOf(ymd);
  return wd === 0 ? ymd : addDays(ymd, 7 - wd);
}

export function mondayOnOrBefore(ymd: string): string {
  return addDays(ymd, -weekdayOf(ymd));
}

/** Today's local date as YYYY-MM-DD (device time zone). */
export function todayLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local YYYY-MM-DD of an ISO timestamp / Date. */
export function localDateOf(t: string | Date): string {
  return todayLocal(typeof t === 'string' ? new Date(t) : t);
}

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAY_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function prettyDate(ymd: string): string {
  const d = parseDate(ymd);
  return `${WEEKDAY_SHORT[weekdayOf(ymd)]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function prettyMonthDay(ymd: string): string {
  const d = parseDate(ymd);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatPace(secPer100: number): string {
  const m = Math.floor(secPer100 / 60);
  const s = Math.round(secPer100 % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Swims in metres; rides and runs in miles (imperial) or km (metric). */
export function formatDistance(metres: number, sport: string, imperial: boolean): string {
  if (sport === 'swim') return `${Math.round(metres)} m`;
  return imperial ? `${(metres / 1609.344).toFixed(1)} mi` : `${(metres / 1000).toFixed(1)} km`;
}
