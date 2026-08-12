export const parseUtcDate = (dateStr?: string | Date | null): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  let str = String(dateStr).trim();
  if (!str.endsWith('Z') && !str.includes('+') && !str.includes('-0') && !str.includes('-1')) {
    str += 'Z';
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const formatUtcDate = (dateStr?: string | Date | null, formatter?: Intl.DateTimeFormat): string => {
  if (!dateStr) return '—';
  try {
    const d = parseUtcDate(dateStr);
    return formatter ? formatter.format(d) : d.toLocaleString();
  } catch {
    return '—';
  }
};
