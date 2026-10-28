import { useEffect, useRef, useState } from 'react';
import type { CardViewProps } from '../registry';
import { Icon } from '../../components/Icon';
import { useRefreshOnReturn } from '../../hooks/useRefreshOnReturn';
import { SOURCES_URL } from '../transit/api';
import {
    clock,
    durationLabel,
    leaveLabel,
    planJourney,
    searchPlaces,
    type Itinerary,
    type JourneyConfig,
    type JourneyPlace,
    type PlaceSuggestion,
} from './api';
import styles from './Journey.module.css';

type Field = 'from' | 'to';
const LABELS: Record<Field, string> = { from: 'Départ', to: 'Arrivée' };

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

/** Ce qu'il faut faire, étape par étape */
function Steps({ it }: { it: Itinerary }) {
    return (
        <ol className={styles.steps}>
            {it.legs.map((leg, i) => (
                <li key={i}>
                    {leg.walk ? (
                        <>
                            <span className={styles.stepIcon}>
                                <Icon name="walk" size={16} />
                            </span>
                            <span>
                                Marche {leg.minutes} min{leg.to && <> jusqu’à <strong>{leg.to}</strong></>}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className={styles.badge} style={{ background: leg.color, color: leg.textColor }}>
                                {leg.code}
                            </span>
                            <span>
                                À <strong>{clock(leg.start)}</strong> depuis {leg.from}
                                {leg.headsign && <>, direction {leg.headsign}</>}. Descends à <strong>{leg.to}</strong> ({clock(leg.end)}).
                            </span>
                        </>
                    )}
                </li>
            ))}
        </ol>
    );
}

export function JourneyCard({ config, onChange }: CardViewProps<JourneyConfig>) {
    // La dernière recherche est gardée dans la carte et relancée à l'ouverture
    const [places, setPlaces] = useState<Record<Field, JourneyPlace | null>>({
        from: config.from ?? null,
        to: config.to ?? null,
    });
    const [texts, setTexts] = useState<Record<Field, string>>({
        from: config.from?.name ?? '',
        to: config.to?.name ?? '',
    });
    const [active, setActive] = useState<Field | null>(null);
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [results, setResults] = useState<Itinerary[] | null>(null);
    const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
    const [open, setOpen] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [now, setNow] = useState(() => new Date());
    const searched = useRef<{ from: JourneyPlace; to: JourneyPlace } | null>(null);

    // Suggestions pendant la saisie
    useEffect(() => {
        if (!active) return;
        const q = texts[active].trim();
        if (q.length < 2 || q === places[active]?.name) {
            setSuggestions([]);
            return;
        }
        const t = window.setTimeout(() => {
            searchPlaces(q)
                .then(setSuggestions)
                .catch(() => setSuggestions([]));
        }, 300);
        return () => window.clearTimeout(t);
    }, [active, texts, places]);

    const run = async (from: JourneyPlace, to: JourneyPlace, quiet = false) => {
        searched.current = { from, to };
        if (!quiet) {
            setState('loading');
            setOpen(null);
        }
        try {
            const list = await planJourney(from, to);
            setResults(list.sort((a, b) => a.start.getTime() - b.start.getTime()));
            setState('idle');
            setNow(new Date());
        } catch {
            if (!quiet) setState('error');
        }
    };

    // Relance automatique de la dernière recherche à l'ouverture
    useEffect(() => {
        if (config.from && config.to) run(config.from, config.to, false);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Horaires rafraîchis toutes les minutes tant que la carte est ouverte
    useRefreshOnReturn(() => {
        if (searched.current) run(searched.current.from, searched.current.to, true);
    }, 60_000);

    useEffect(() => {
        const t = window.setInterval(() => setNow(new Date()), 15_000);
        return () => window.clearInterval(t);
    }, []);

    const pick = (field: Field, place: JourneyPlace) => {
        setPlaces((p) => ({ ...p, [field]: place }));
        setTexts((t) => ({ ...t, [field]: place.name }));
        setSuggestions([]);
        setActive(null);
        setMessage(null);
    };

    const usePosition = (field: Field) => {
        if (!navigator.geolocation) {
            setMessage('Ton navigateur ne donne pas accès à ta position.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => pick(field, { name: 'Ma position', lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => setMessage('Position refusée. Tape une adresse à la place.'),
        );
    };

    const swap = () => {
        setPlaces((p) => ({ from: p.to, to: p.from }));
        setTexts((t) => ({ from: t.to, to: t.from }));
        if (results && places.from && places.to) search(places.to, places.from);
    };

    const search = (from = places.from, to = places.to) => {
        if (!from || !to) {
            setMessage('Choisis un départ et une arrivée dans les suggestions.');
            return;
        }
        setActive(null);
        setMessage(null);
        run(from, to);
        onChange?.({ from, to }).catch(() => undefined);
    };

    const upcoming = (results ?? []).filter((it) => it.start.getTime() >= now.getTime() - 60_000);

    const field = (f: Field) => (
        <label className={styles.field}>
            <span className={styles.fieldDot} data-field={f} aria-hidden="true" />
            <span className="visually-hidden">{LABELS[f]}</span>
            <input
                type="text"
                value={texts[f]}
                placeholder={LABELS[f]}
                autoComplete="off"
                enterKeyHint="search"
                onFocus={() => setActive(f)}
                onBlur={() => setActive((a) => (a === f ? null : a))}
                onChange={(e) => {
                    const value = e.target.value;
                    setTexts((t) => ({ ...t, [f]: value }));
                    setPlaces((p) => ({ ...p, [f]: null }));
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') search();
                }}
            />
        </label>
    );

    let panel;
    if (active) {
        // Les suggestions gardent le focus du champ (onPointerDown) pour qu'un toucher suffise
        panel = (
            <ul className={styles.suggestions}>
                <li>
                    <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => usePosition(active)}>
                        <Icon name="pin" size={16} />
                        <span>
                            <strong>Ma position</strong>
                        </span>
                    </button>
                </li>
                {suggestions.map((s) => (
                    <li key={s.id}>
                        <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => pick(active, s)}>
                            <Icon name="search" size={16} />
                            <span>
                                <strong>{s.name}</strong>
                                <small>{s.detail}</small>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        );
    } else if (state === 'loading') {
        panel = <p className={styles.message}>Recherche des itinéraires…</p>;
    } else if (state === 'error') {
        panel = <p className={styles.message}>Itinéraires indisponibles pour le moment. Réessaie.</p>;
    } else if (results && upcoming.length === 0) {
        panel = <p className={styles.message}>Aucun trajet trouvé pour le moment.</p>;
    } else if (results) {
        panel = (
            <ul className={styles.list}>
                {upcoming.slice(0, 8).map((it) => {
                    const expanded = open === it.key;
                    return (
                        <li key={it.key}>
                            <button type="button" className={styles.option} aria-expanded={expanded} onClick={() => setOpen(expanded ? null : it.key)}>
                                <Chain it={it} />
                                <span className={styles.meta}>
                                    <strong>Pars {leaveLabel(it.start, now)}</strong> · arrivée {clock(it.end)} · {durationLabel(it.minutes)}
                                    {it.realtime && <span className={styles.live} aria-label="temps réel" />}
                                </span>
                            </button>
                            {expanded && <Steps it={it} />}
                        </li>
                    );
                })}
                <li>
                    <a className={styles.sources} href={SOURCES_URL} target="_blank" rel="noreferrer">
                        Données Transitous et OpenStreetMap
                    </a>
                </li>
            </ul>
        );
    } else {
        panel = <p className={styles.message}>Indique un départ et une arrivée, puis lance la recherche.</p>;
    }

    return (
        <div className={styles.card}>
            <div className={styles.head}>
                <span className={styles.route}>Trajet</span>
            </div>

            <div className={styles.form}>
                <div className={styles.fields}>
                    {field('from')}
                    {field('to')}
                </div>
                <button type="button" className={styles.swap} aria-label="Inverser départ et arrivée" onClick={swap}>
                    <Icon name="swap" size={16} />
                </button>
            </div>
            <button type="button" className={styles.searchButton} onClick={() => search()}>
                <Icon name="search" size={16} /> Rechercher
            </button>
            {message && <p className={styles.message}>{message}</p>}

            <div className={styles.panel}>{panel}</div>
        </div>
    );
}