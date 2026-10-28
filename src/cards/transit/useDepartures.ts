import { useCallback, useEffect, useState } from 'react';
import { useRefreshOnReturn } from '../../hooks/useRefreshOnReturn';
import { fetchDepartures, type Departure } from './api';

/** Prochains départs de plusieurs arrêts, chargés en parallèle */
export function useDepartures(stopIds: string[]) {
    const [byStop, setByStop] = useState<Record<string, Departure[]> | null>(null);
    const [error, setError] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const key = stopIds.join('\n');

    const load = useCallback(() => {
        const ids = key ? key.split('\n') : [];
        Promise.allSettled(ids.map((id) => fetchDepartures(id))).then((results) => {
            const next: Record<string, Departure[]> = {};
            results.forEach((r, i) => {
                if (r.status === 'fulfilled') next[ids[i]] = r.value;
            });
            const allFailed = ids.length > 0 && results.every((r) => r.status === 'rejected');
            setError(allFailed);
            if (!allFailed) {
                setByStop(next);
                setNow(new Date());
            }
        });
    }, [key]);

    useEffect(() => {
        load();
    }, [load]);

    // Nouveaux horaires toutes les 60 s et au retour sur l'appli
    useRefreshOnReturn(load, 60_000);

    // Les « dans X min » avancent entre deux chargements
    useEffect(() => {
        const t = window.setInterval(() => setNow(new Date()), 15_000);
        return () => window.clearInterval(t);
    }, []);

    return { byStop, error, now };
}