import { useCallback, useEffect, useState } from 'react';
import type { CardViewProps } from '../registry';
import { Icon } from '../../components/Icon';
import { useRefreshOnReturn } from '../../hooks/useRefreshOnReturn';
import { SOURCES_URL } from '../transit/api';
import { clock, durationLabel, leaveLabel, planJourney, type Itinerary, type JourneyConfig, type JourneyPlace } from './api';
import styles from './Journey.module.css';

function usePlan(from: JourneyPlace, to: JourneyPlace) {
    const [itineraries, setItineraries] = useState<Itinerary[] | null>(null);
    const [error, setError] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const key = `${from.lat},${from.lon}>${to.lat},${to.lon}`;

    const load = useCallback(() => {
        planJourney(from, to)
            .then((list) => {
                setItineraries(list);
                setError(false);
                setNow(new Date());
            })
            .catch(() => setError(true));
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setItineraries(null);
        load();
    }, [load]);

    useRefreshOnReturn(load, 60_000);

    useEffect(() => {
        const t = window.setInterval(() => setNow(new Date()), 15_000);
        return () => window.clearInterval(t);
    }, []);

    return { itineraries, error, now };
}

/** Enchaînement des étapes : marche, puis lignes avec leur couleur */
function Chain({ it }: { it: Itinerary }) {
    return (
        <span className={styles.chain}>
            {it.legs.map((leg, i) => (
                <span key={i} className={styles.step}>
                    {i > 0 && <span className={styles.sep} aria-hidden="true">›</span>}
                    {leg.walk ? (
                        <span className={styles.walk} aria-label={`${leg.minutes} min à pied`}>
                            <Icon name="walk" size={14} />
                            {leg.minutes}
                        </span>
                    ) : (
                        <span className={styles.badge} style={{ background: leg.color, color: leg.textColor }}>
                            {leg.code}
                        </span>
                    )}
                </span>
            ))}
        </span>
    );
}

export function JourneyCard({ config, size }: CardViewProps<JourneyConfig>) {
    // Inverser le trajet (le soir, pour rentrer) sans toucher aux réglages
    const [reversed, setReversed] = useState(false);
    const from = reversed ? config.to : config.from;
    const to = reversed ? config.from : config.to;
    const { itineraries, error, now } = usePlan(from, to);

    const upcoming = (itineraries ?? [])
        .filter((it) => it.start.getTime() >= now.getTime() - 60_000)
        .sort((a, b) => a.start.getTime() - b.start.getTime());
    const shown = upcoming.slice(0, size === 'large' ? 6 : size === 'wide' ? 2 : 1);

    const head = (
        <div className={styles.head}>
            <span className={styles.route}>
                {from.name} <span aria-hidden="true">→</span>
                <span className="visually-hidden">vers</span> {to.name}
            </span>
            <button type="button" className={styles.swap} aria-label="Inverser le trajet" aria-pressed={reversed} onClick={() => setReversed((v) => !v)}>
                <Icon name="swap" size={16} />
            </button>
        </div>
    );

    let body;
    if (error && !itineraries) body = <p className={styles.message}>Itinéraires indisponibles pour le moment.</p>;
    else if (!itineraries) body = <p className={styles.message}>Recherche des itinéraires…</p>;
    else if (shown.length === 0) body = <p className={styles.message}>Aucun trajet trouvé pour le moment.</p>;
    else if (size === 'small') {
        const it = shown[0];
        body = (
            <div className={styles.small}>
                <span className={styles.leaveSmall}>Pars {leaveLabel(it.start, now)}</span>
                <span className={styles.meta}>
                    Arrivée {clock(it.end)} · {durationLabel(it.minutes)}
                </span>
                <Chain it={it} />
            </div>
        );
    } else {
        body = (
            <ul className={styles.list}>
                {shown.map((it) => (
                    <li key={it.key}>
                        <Chain it={it} />
                        <span className={styles.meta}>
                            <strong>Pars {leaveLabel(it.start, now)}</strong> · arrivée {clock(it.end)} · {durationLabel(it.minutes)}
                            {it.realtime && <span className={styles.live} aria-label="temps réel" />}
                        </span>
                    </li>
                ))}
                {size === 'large' && (
                    <li className={styles.sourcesItem}>
                        <a className={styles.sources} href={SOURCES_URL} target="_blank" rel="noreferrer">
                            Données Transitous et OpenStreetMap
                        </a>
                    </li>
                )}
            </ul>
        );
    }

    return (
        <div className={styles.card}>
            {head}
            {body}
        </div>
    );
}