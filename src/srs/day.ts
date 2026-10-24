/** El día de estudio corta a las 04:00 locales: estudiar a la 1 a. m. cuenta para el día anterior. */
export const DAY_START_HOUR = 4;

export function studyDay(at: Date | number): string {
  const d = new Date(at);
  d.setHours(d.getHours() - DAY_START_HOUR);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Próximo corte de día (04:00) estrictamente posterior a `now`. */
export function endOfStudyDay(now: Date | number): Date {
  const d = new Date(now);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DAY_START_HOUR, 0, 0, 0);
  if (end <= d) end.setDate(end.getDate() + 1);
  return end;
}

export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d - 1, 12);
  return studyDay(+date + DAY_START_HOUR * 3600_000);
}
