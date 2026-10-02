export const money = (v: string | number) => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
export const budget = (min: string, max: string) => (Number(min) === Number(max) ? money(min) : `${money(min)} – ${money(max)}`);

export function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const steps: [number, string][] = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
  for (const [sec, name] of steps) {
    if (s >= sec) { const n = Math.floor(s / sec); return `${n} ${name}${n > 1 ? 's' : ''} ago`; }
  }
  return 'just now';
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// "dd-mm-yyyy" -> ISO string, or null when invalid
export function parseDMY(s: string) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return Number.isNaN(d.getTime()) || d.getUTCDate() !== +m[1] ? null : d.toISOString();
}

export const days = (n: number) => (n % 7 === 0 ? `${n / 7} week${n / 7 > 1 ? 's' : ''}` : `${n} day${n > 1 ? 's' : ''}`);
