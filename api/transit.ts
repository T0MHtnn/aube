/**
 * Fonction serveur Vercel : relais vers l'API Transitous (transports en commun, données ouvertes).
 * Elle ajoute l'en-tête User-Agent demandé par Transitous (nom de l'appli, version, contact),
 * que le navigateur ne peut pas envoyer lui-même, et met les réponses en cache.
 *
 * Règles d'usage : https://transitous.org/api/
 * Variable d'environnement Vercel conseillée : TRANSITOUS_CONTACT (ton email)
 */
declare const process: { env: Record<string, string | undefined> };

const BASE = 'https://api.transitous.org';
const STOP_ID = /^[^\s\u0000-\u001f]{1,200}$/;
const LAT_LON = /^-?\d{1,2}(\.\d{1,7})?,-?\d{1,3}(\.\d{1,7})?$/;

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8' },
    });
}

function coordinate(value: string | null, max: number): string | null {
    if (!value) return null;
    const n = Number(value);
    return Number.isFinite(n) && Math.abs(n) <= max ? n.toFixed(5) : null;
}

export async function GET(request: Request): Promise<Response> {
    const p = new URL(request.url).searchParams;
    let path: string;
    let maxAge: number;

    switch (p.get('op')) {
        case 'stops':
        case 'places': {
            // stops : arrêts seulement ; places : arrêts, adresses et lieux (pour les trajets)
            const q = (p.get('q') ?? '').trim().slice(0, 80);
            if (q.length < 2) return json({ error: 'bad_request' }, 400);
            const params = new URLSearchParams({ text: q, language: 'fr', numResults: '8' });
            if (p.get('op') === 'stops') params.set('type', 'STOP');
            const lat = coordinate(p.get('lat'), 90);
            const lon = coordinate(p.get('lon'), 180);
            if (lat && lon) {
                params.set('place', `${lat},${lon}`);
                params.set('placeBias', '3');
            }
            path = `/api/v1/geocode?${params.toString()}`;
            maxAge = 86400;
            break;
        }
        case 'departures': {
            const stop = p.get('stop') ?? '';
            if (!STOP_ID.test(stop)) return json({ error: 'bad_request' }, 400);
            const n = Math.min(Math.max(Number(p.get('n')) || 30, 10), 80);
            path = `/api/v6/stoptimes?${new URLSearchParams({ stopId: stop, n: String(n) }).toString()}`;
            maxAge = 20;
            break;
        }
        case 'plan': {
            const from = p.get('from') ?? '';
            const to = p.get('to') ?? '';
            if (!LAT_LON.test(from) || !LAT_LON.test(to)) return json({ error: 'bad_request' }, 400);
            const params = new URLSearchParams({
                fromPlace: from,
                toPlace: to,
                detailedLegs: 'false',
                detailedTransfers: 'false',
                joinInterlinedLegs: 'true',
            });
            path = `/api/v6/plan?${params.toString()}`;
            maxAge = 30;
            break;
        }
        default:
            return json({ error: 'unknown_op' }, 400);
    }

    const contact = process.env.TRANSITOUS_CONTACT || 'https://aube-app.vercel.app';
    try {
        const res = await fetch(BASE + path, {
            headers: { 'User-Agent': `Aube/1.0 (${contact})`, Accept: 'application/json' },
        });
        const body = await res.text();
        return new Response(body, {
            status: res.status,
            headers: {
                'content-type': 'application/json; charset=utf-8',
                // Mis en cache par Vercel pour limiter la charge sur Transitous
                'cache-control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}`,
            },
        });
    } catch {
        return json({ error: 'transitous_unreachable' }, 502);
    }
}