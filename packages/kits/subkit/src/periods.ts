import type { BillingInterval } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Periods and due dates follow the Swiss calendar, like the printed dates. */
export const TIME_ZONE = 'Europe/Zurich';

const zurichFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

type WallClock = {
  year: number;
  /** 0-based like `Date.UTC`. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

/** Date and time of `date` on a clock in Zurich. */
function zurichWallClock(date: Date): WallClock {
  const parts: Record<string, number> = {};

  for (const part of zurichFormat.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }

  return {
    year: parts.year!,
    month: parts.month! - 1,
    day: parts.day!,
    hour: parts.hour!,
    minute: parts.minute!,
    second: parts.second!,
    millisecond: date.getUTCMilliseconds(),
  };
}

/** Offset of Zurich from UTC at `time` in ms (+1 h / +2 h in summer). */
function zurichOffset(time: number) {
  const clock = zurichWallClock(new Date(time));

  return (
    Date.UTC(
      clock.year,
      clock.month,
      clock.day,
      clock.hour,
      clock.minute,
      clock.second,
      clock.millisecond,
    ) - time
  );
}

/** The instant a clock in Zurich shows `clock` (days may overflow). */
function fromZurichWallClock(clock: WallClock): Date {
  const local = Date.UTC(
    clock.year,
    clock.month,
    clock.day,
    clock.hour,
    clock.minute,
    clock.second,
    clock.millisecond,
  );
  const guess = local - zurichOffset(local);

  return new Date(local - zurichOffset(guess));
}

/**
 * `anchor` + `count` intervals on the Zurich calendar (same time of day),
 * clamped to the end of the month (Jan 31 + 1 month = Feb 28/29,
 * + 2 months = Mar 31).
 */
export function addIntervals(
  anchor: Date,
  interval: BillingInterval,
  count: number,
): Date {
  const months = interval === 'year' ? 12 * count : count;
  const clock = zurichWallClock(anchor);
  const month = clock.month + months;

  const targetYear = clock.year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();

  return fromZurichWallClock({
    ...clock,
    year: targetYear,
    month: targetMonth,
    day: Math.min(clock.day, lastDay),
  });
}

/**
 * Last moment (23:59:59.999 in Zurich) of the calendar day `days` days after
 * `date` – a payment term: the invoice is overdue only after its due date.
 */
export function endOfZurichDay(date: Date, days = 0): Date {
  const clock = zurichWallClock(date);
  const nextDay = fromZurichWallClock({
    ...clock,
    day: clock.day + days + 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  return new Date(nextDay.getTime() - 1);
}

/** First period boundary (anchor + n intervals, n ≥ 1) strictly after `after`. */
export function nextPeriodEnd(
  anchor: Date,
  interval: BillingInterval,
  after: Date,
): Date {
  // jump close to the target, then step
  const approxMonths = Math.max(
    0,
    Math.floor((after.getTime() - anchor.getTime()) / (31 * DAY_MS)),
  );
  let count = Math.max(
    1,
    interval === 'year' ? Math.floor(approxMonths / 12) : approxMonths,
  );

  let end = addIntervals(anchor, interval, count);

  while (end.getTime() <= after.getTime()) {
    count += 1;
    end = addIntervals(anchor, interval, count);
  }

  return end;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/** Share of the period [start, end) that is left at `now` (0…1). */
export function remainingFraction(start: Date, end: Date, now: Date): number {
  const total = end.getTime() - start.getTime();

  if (total <= 0) return 0;

  const left = end.getTime() - now.getTime();

  return Math.min(1, Math.max(0, left / total));
}

/** Price normalized to one year, used to tell upgrades from downgrades. */
export function yearlyValue(amount: number, interval: BillingInterval) {
  return interval === 'year' ? amount : amount * 12;
}
