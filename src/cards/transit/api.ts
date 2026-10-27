/** Transports en commun via notre fonction serveur /api/transit (qui interroge Transitous). */

/** Lien d'attribution demandé par Transitous */
export const SOURCES_URL = 'https://transitous.org/sources/';

export interface TransitLine {
    id: string;
    code: string;
    color: string;
    textColor: string;
}

export interface TransitConfig {
    stopId: string;
    stopName: string;
    /** Ville ou quartier de l'arrêt, pour l'affichage */
    area: string;
    /** Lignes à afficher. Vide = toutes les lignes de l'arrêt. */
    lines: TransitLine[];
}

export interface StopSuggestion {
    id: string;
    name: string;
    area: string;
}

export interface Departure {
    lineId: string;
    code: string;
    color: string;
    textColor: string;
    direction: string;
    time: Date;
    realtime: boolean;
}

async function call(params: Record<string, string>): Promise<any> {
    const res = await fetch(`/api/transit?${new URLSearchParams(params).toString()}`);
    if (!res.ok) throw new Error(`transit ${res.status}`);
    return res.json();
}

function hex(value: string | undefined, fallback: string): string {
    const v = (value ?? '').replace(/^#/, '');
    return /^[0-9a-f]{6}$/i.test(v) ? `#${v}` : fallback;
}

export async function searchStops(query: string, near?: { lat: number; lon: number }): Promise<StopSuggestion[]> {
    const params: Record<string, string> = { op: 'stops', q: query };
    if (near) {
        params.lat = String(near.lat);
        params.lon = String(near.lon);
    }
    const matches = (await call(params)) as any[];
    return (matches ?? [])
        .filter((m) => m.type === 'STOP' && m.id)
        .map((m) => {
            const areas: { name: string; default?: boolean }[] = m.areas ?? [];
            const area = areas.find((a) => a.default)?.name ?? areas[0]?.name ?? '';
            return { id: m.id, name: m.name, area };
        });
}

export async function fetchDepartures(stopId: string, n = 30): Promise<Departure[]> {
    const j = await call({ op: 'departures', stop: stopId, n: String(n) });
    return (j.stopTimes ?? [])
        .filter((st: any) => !st.cancelled && !st.tripCancelled)
        .map((st: any) => {
            const code = st.displayName || st.routeShortName || st.tripShortName || '?';
            return {
                lineId: st.routeId ?? `${st.agencyId ?? st.agencyName ?? ''}|${code}`,
                code,
                color: hex(st.routeColor, '#14213D'),
                textColor: hex(st.routeTextColor, '#FFFFFF'),
                direction: st.headsign || st.tripTo?.name || '',
                time: new Date(st.place?.departure ?? st.place?.scheduledDeparture ?? ''),
                realtime: Boolean(st.realTime),
            };
        });
}

/** Lignes qui passent à l'arrêt, déduites des prochains départs */
export function linesFromDepartures(departures: Departure[]): TransitLine[] {
    const lines = new Map<string, TransitLine>();
    for (const d of departures) {
        if (!lines.has(d.lineId)) lines.set(d.lineId, { id: d.lineId, code: d.code, color: d.color, textColor: d.textColor });
    }
    return [...lines.values()].sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true }));
}

export interface DepartureGroup {
    key: string;
    code: string;
    color: string;
    textColor: string;
    direction: string;
    times: Date[];
    realtime: boolean;
}

/** Regroupe les passages par ligne et direction, dans l'ordre du prochain passage */
export function groupDepartures(departures: Departure[], lineIds: string[], now = new Date()): DepartureGroup[] {
    const groups = new Map<string, DepartureGroup>();
    for (const d of departures) {
        if (lineIds.length && !lineIds.includes(d.lineId)) continue;
        if (Number.isNaN(d.time.getTime()) || d.time.getTime() < now.getTime() - 30_000) continue;
        const key = `${d.lineId}|${d.direction}`;
        const group = groups.get(key);
        if (group) {
            if (group.times.length < 3) group.times.push(d.time);
        } else {
            groups.set(key, { key, code: d.code, color: d.color, textColor: d.textColor, direction: d.direction, times: [d.time], realtime: d.realtime });
        }
    }
    return [...groups.values()];
}

/** "Maintenant", "4 min" ou "18:42" */
export function waitLabel(time: Date, now = new Date()): string {
    const minutes = Math.floor((time.getTime() - now.getTime()) / 60_000);
    if (minutes < 1) return 'Maintenant';
    if (minutes < 60) return `${minutes} min`;
    return time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}