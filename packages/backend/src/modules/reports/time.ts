const REPORT_TIMEZONE = "America/El_Salvador";

const datePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: REPORT_TIMEZONE,
  timeZoneName: "longOffset",
});

export type ReportPeriod = {
  from: Date;
  to: Date;
  fromDate: string;
  toDate: string;
  timezone: typeof REPORT_TIMEZONE;
};

function dateStringFromParts(date: Date) {
  const parts = Object.fromEntries(
    datePartsFormatter
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function offsetMinutes(date: Date) {
  const value = offsetFormatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = value?.match(/GMT([+-])(\d{2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "+" ? minutes : -minutes;
}

function localMidnight(date: string) {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day));
  return new Date(utcGuess.getTime() - offsetMinutes(utcGuess) * 60_000);
}

function addDays(date: string, days: number) {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function currentPeriodDates(now = new Date()) {
  const current = dateStringFromParts(now);
  return { from: `${current.slice(0, 8)}01`, to: current };
}

function periodDates(period: string, now = new Date()) {
  const today = dateStringFromParts(now);
  const [year = 0, month = 1, day = 1] = today.split("-").map(Number);
  if (period === "today") return { from: today, to: today };
  if (period === "month") return { from: `${today.slice(0, 8)}01`, to: today };
  if (period === "quarter") {
    const firstMonth = Math.floor((month - 1) / 3) * 3 + 1;
    return {
      from: `${year}-${String(firstMonth).padStart(2, "0")}-01`,
      to: today,
    };
  }
  if (period === "year") return { from: `${year}-01-01`, to: today };

  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const from = addDays(today, mondayOffset);
  return { from, to: today };
}

export function resolveReportPeriod(input: {
  period?: "today" | "week" | "month" | "quarter" | "year";
  from?: string;
  to?: string;
}) {
  const dates =
    input.from && input.to
      ? { from: input.from, to: input.to }
      : input.period
        ? periodDates(input.period)
        : currentPeriodDates();
  return {
    from: localMidnight(dates.from),
    to: localMidnight(addDays(dates.to, 1)),
    fromDate: dates.from,
    toDate: dates.to,
    timezone: REPORT_TIMEZONE,
  } satisfies ReportPeriod;
}

export function dateGroupKey(date: Date, groupBy: "day" | "week" | "month") {
  const local = dateStringFromParts(date);
  if (groupBy === "month") return local.slice(0, 7);
  if (groupBy === "day") return local;
  const [year = 0, month = 1, day = 1] = local.split("-").map(Number);
  const current = new Date(Date.UTC(year, month - 1, day));
  const weekday = current.getUTCDay();
  current.setUTCDate(current.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
  return current.toISOString().slice(0, 10);
}

export { REPORT_TIMEZONE };
