const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function formatToday(date = new Date()): string {
  const text = dayFormatter.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h >= 18 || h < 4) return 'Bonsoir';
  if (h >= 13) return 'Bon après-midi';
  return 'Bonjour';
}

/** Heure locale au format renvoyé par Open-Meteo : "2026-10-26T08:00" */
export function localHourKey(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:00`;
}

/** Date locale au format "2026-10-26" */
export function localDateKey(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });

/** "Aujourd'hui", "Demain" ou le jour de la semaine */
export function relativeDayLabel(dateKey: string, now = new Date()): string {
  if (dateKey === localDateKey(now)) return 'Aujourd’hui';
  if (dateKey === localDateKey(addDays(now, 1))) return 'Demain';
  const [y, m, d] = dateKey.split('-').map(Number);
  const text = weekdayFormatter.format(new Date(y, m - 1, d));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
