export const OPERATIONAL_TIME_ZONE = 'America/Mexico_City';

const dateParts = (date: Date, timeZone = OPERATIONAL_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value ?? 0);

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second')
  };
};

const timeZoneOffsetMilliseconds = (date: Date, timeZone = OPERATIONAL_TIME_ZONE) => {
  const parts = dateParts(date, timeZone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const dateWithoutMilliseconds = Math.trunc(date.getTime() / 1000) * 1000;
  return representedAsUtc - dateWithoutMilliseconds;
};

const operationalWallTimeToUtc = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number
) => {
  const wallTimeAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  let candidate = new Date(wallTimeAsUtc);
  candidate = new Date(wallTimeAsUtc - timeZoneOffsetMilliseconds(candidate));
  candidate = new Date(wallTimeAsUtc - timeZoneOffsetMilliseconds(candidate));
  return candidate;
};

export const getOperationalDateInputValue = (date = new Date()) => {
  const { year, month, day } = dateParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const toOperationalUtcBoundary = (date: string, endOfDay = false) => {
  if (!date) return undefined;
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return undefined;

  return operationalWallTimeToUtc(
    year,
    month,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  ).toISOString();
};

export const formatOperationalDateTime = (
  value: string | Date,
  locale = 'es-MX'
) => new Intl.DateTimeFormat(locale, {
  timeZone: OPERATIONAL_TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(value instanceof Date ? value : new Date(value));
