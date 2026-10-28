/** Transports en commun via notre fonction serveur /api/transit (qui interroge Transitous). */

/** Lien d'attribution demandé par Transitous */
export const SOURCES_URL = 'https://transitous.org/sources/';

export interface TransitLine {
    id: string;
    code: string;
    color: string;
    textColor: string;
}

/** Un arrêt suivi par la carte, avec ses lignes choisies (vide = toutes) */
export interface StopEntry {
    stopId: string;
    stopName: string;
    area: string;
    lines: TransitLine[];
}

export interface TransitConfig {
    stops?: StopEntry[];
    /* Anciennes cartes (un seul arrêt), toujours lues */
    stopId?: string;
    stopName?: string;
    area?: string;
    lines?: TransitLine[];
}

/** Liste des arrêts d'une carte, y compris pour les cartes créées avant le multi-arrêts */
export function stopsOf(config: TransitConfig): StopEntry[] {
    if (config.stops?.length) return config.stops;
    if (config.stopId) {
        return [{ stopId: config.stopId, stopName: config.stopName ?? '', area: config.area ?? '', lines: config.lines ?? [] }];
    }
    return [];
}

export interface StopSuggestion {
    id: string;
    name: string;
    area: string;
}

export interface Departure {
    stopId: string;
    agency: string;
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

export async function fetchDepartures(stopId: string, n = 40): Promise<Departure[]> {
    const j = await call({ op: 'departures', stop: stopId, n: String(n) });
    return (j.stopTimes ?? [])
        .filter((st: any) => !st.cancelled && !st.tripCancelled)
        .map((st: any) => {
            const code = st.displayName || st.routeShortName || st.tripShortName || '?';
            const agency = st.agencyName || '';
            return {
                stopId,
                agency,
                lineId: st.routeId ?? `${st.agencyId ?? agency}|${code}`,
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
    lineId: string;
    code: string;
    color: string;
    textColor: string;
    direction: string;
    times: Date[];
    realtime: boolean;
}

export interface Section {
    key: string;
    /** Nom du réseau (TCL, TBM, SNCF…), suivi de l'arrêt si la carte suit plusieurs arrêts de ce réseau */
    title: string;
    groups: DepartureGroup[];
}

/**
 * Prépare l'affichage : une section par réseau (et par arrêt), et dans chaque section
 * une ligne par couple ligne + direction, les deux sens d'une même ligne côte à côte.
 */
export function buildSections(
    stops: StopEntry[],
    departuresByStop: Record<string, Departure[]>,
    now = new Date(),
): Section[] {
    const sections = new Map<string, Section & { agency: string; stopName: string }>();

    for (const entry of stops) {
        const allowed = entry.lines.map((l) => l.id);
        for (const d of departuresByStop[entry.stopId] ?? []) {
            if (allowed.length && !allowed.includes(d.lineId)) continue;
            if (Number.isNaN(d.time.getTime()) || d.time.getTime() < now.getTime() - 30_000) continue;

            const sectionKey = `${d.agency}|${entry.stopId}`;
            let section = sections.get(sectionKey);
            if (!section) {
                section = { key: sectionKey, title: '', groups: [], agency: d.agency, stopName: entry.stopName };
                sections.set(sectionKey, section);
            }
            const groupKey = `${d.lineId}|${d.direction}`;
            const group = section.groups.find((g) => g.key === groupKey);
            if (group) {
                if (group.times.length < 3) group.times.push(d.time);
                group.realtime = group.realtime || d.realtime;
            } else {
                section.groups.push({
                    key: groupKey,
                    lineId: d.lineId,
                    code: d.code,
                    color: d.color,
                    textColor: d.textColor,
                    direction: d.direction,
                    times: [d.time],
                    realtime: d.realtime,
                });
            }
        }
    }

    const list = [...sections.values()];
    const stopsPerAgency = new Map<string, number>();
    for (const s of list) stopsPerAgency.set(s.agency, (stopsPerAgency.get(s.agency) ?? 0) + 1);

    return list.map((s) => {
        const several = (stopsPerAgency.get(s.agency) ?? 0) > 1 || !s.agency;
        const title = s.agency ? (several ? `${s.agency} · ${s.stopName}` : s.agency) : s.stopName;
        // Par ligne (ordre naturel des numéros), puis par prochain passage : les deux sens se suivent
        const groups = [...s.groups].sort(
            (a, b) =>
                a.code.localeCompare(b.code, 'fr', { numeric: true }) ||
                a.lineId.localeCompare(b.lineId) ||
                a.times[0].getTime() - b.times[0].getTime(),
        );
        return { key: s.key, title, groups };
    });
}

/** "Maintenant", "4 min" ou "18:42" */
export function waitLabel(time: Date, now = new Date()): string {
    const minutes = Math.floor((time.getTime() - now.getTime()) / 60_000);
    if (minutes < 1) return 'Maintenant';
    if (minutes < 60) return `${minutes} min`;
    return time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}