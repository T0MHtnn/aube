/** Itinéraires en transports en commun via /api/transit (Transitous), comme un mini Maps. */

export interface JourneyPlace {
    name: string;
    lat: number;
    lon: number;
}

export interface JourneyConfig {
    from: JourneyPlace;
    to: JourneyPlace;
}

export interface PlaceSuggestion extends JourneyPlace {
    id: string;
    detail: string;
}

export interface Leg {
    walk: boolean;
    minutes: number;
    code: string;
    color: string;
    textColor: string;
    headsign: string;
    from: string;
    start: Date;
}

export interface Itinerary {
    key: string;
    start: Date;
    end: Date;
    minutes: number;
    transfers: number;
    realtime: boolean;
    legs: Leg[];
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

/** Adresses, arrêts et lieux */
export async function searchPlaces(query: string, near?: { lat: number; lon: number }): Promise<PlaceSuggestion[]> {
    const params: Record<string, string> = { op: 'places', q: query };
    if (near) {
        params.lat = String(near.lat);
        params.lon = String(near.lon);
    }
    const matches = (await call(params)) as any[];
    return (matches ?? [])
        .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lon))
        .map((m, i) => {
            const areas: { name: string; default?: boolean }[] = m.areas ?? [];
            const city = areas.find((a) => a.default)?.name ?? areas[0]?.name ?? '';
            const name = m.type === 'ADDRESS' && m.houseNumber ? `${m.houseNumber} ${m.street ?? m.name}` : m.name;
            const kind = m.type === 'STOP' ? 'Arrêt' : m.type === 'ADDRESS' ? 'Adresse' : 'Lieu';
            return { id: m.id ?? `${m.lat},${m.lon},${i}`, name, lat: m.lat, lon: m.lon, detail: [kind, city].filter(Boolean).join(' · ') };
        });
}

const coord = (p: JourneyPlace) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;

export async function planJourney(from: JourneyPlace, to: JourneyPlace): Promise<Itinerary[]> {
    const j = await call({ op: 'plan', from: coord(from), to: coord(to) });
    const list: any[] = j.itineraries?.length ? j.itineraries : (j.direct ?? []);
    return list.map((it, index) => {
        const legs: Leg[] = (it.legs ?? [])
            .filter((l: any) => !l.cancelled)
            .map((l: any) => {
                const walk = !l.routeShortName && !l.displayName && !l.tripShortName;
                return {
                    walk,
                    minutes: Math.max(1, Math.round((l.duration ?? 0) / 60)),
                    code: l.displayName || l.routeShortName || l.tripShortName || '',
                    color: hex(l.routeColor, '#14213D'),
                    textColor: hex(l.routeTextColor, '#FFFFFF'),
                    headsign: l.headsign || l.tripTo?.name || '',
                    from: l.from?.name ?? '',
                    start: new Date(l.startTime),
                };
            });
        return {
            key: `${it.startTime}-${index}`,
            start: new Date(it.startTime),
            end: new Date(it.endTime),
            minutes: Math.round((it.duration ?? 0) / 60),
            transfers: it.transfers ?? 0,
            realtime: (it.legs ?? []).some((l: any) => l.realTime),
            legs,
        };
    });
}

export function clock(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** "45 min" ou "1 h 05" */
export function durationLabel(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

/** "maintenant", "dans 6 min" ou "à 18:42" */
export function leaveLabel(start: Date, now = new Date()): string {
    const minutes = Math.floor((start.getTime() - now.getTime()) / 60_000);
    if (minutes < 1) return 'maintenant';
    if (minutes < 60) return `dans ${minutes} min`;
    return `à ${clock(start)}`;
}