import { useCallback, useEffect, useState } from 'react';
import { useRefreshOnReturn } from '../../hooks/useRefreshOnReturn';
import { fetchDepartures, type Departure } from './api';

export function useDepartures(stopId: string) {
    const [departures, setDepartures] = useState<Departure[] | null>(null);
    const [error, setError] = useState(false);
    const [now, setNow] = useState(() => new Date());

    const load = useCallback(() => {
        fetchDepartures(stopId)
            .then((d) => {
                setDepartures(d);
                setError(false);
                setNow(new Date());
            })
            .catch(() => setError(true));
    }, [stopId]);

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

    return { departures, error, now };
}