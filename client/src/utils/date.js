/** Возвращает ISO-дату сегодняшнего дня (YYYY-MM-DD). */
export function todayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
