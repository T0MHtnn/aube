import { useEffect, useState } from 'react';
import type { CardConfigProps } from '../registry';
import {
    fetchDepartures,
    linesFromDepartures,
    searchStops,
    SOURCES_URL,
    stopsOf,
    type StopEntry,
    type StopSuggestion,
    type TransitConfig as Config,
    type TransitLine,
} from './api';
import { Icon } from '../../components/Icon';
import sheet from '../../components/Sheet.module.css';
import styles from './Transit.module.css';

type Step =
    | { kind: 'stop' }
    | { kind: 'lines'; stop: StopSuggestion; lines: TransitLine[] }
    | { kind: 'summary' };

export function TransitConfig({ onSubmit, initial }: CardConfigProps<Config>) {
    // En modification, on repart des arrêts déjà enregistrés sur la carte
    const [entries, setEntries] = useState<StopEntry[]>(() => (initial ? stopsOf(initial) : []));
    const [step, setStep] = useState<Step>(() => (initial && stopsOf(initial).length ? { kind: 'summary' } : { kind: 'stop' }));
    const [query, setQuery] = useState('');
    const [near, setNear] = useState<{ lat: number; lon: number } | null>(null);
    const [stops, setStops] = useState<StopSuggestion[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Recherche d'arrêt, 350 ms après la dernière frappe
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2 || step.kind !== 'stop') {
            setStops([]);
            return;
        }
        const t = window.setTimeout(() => {
            searchStops(q, near ?? undefined)
                .then((r) => {
                    setStops(r);
                    setMessage(r.length ? null : 'Aucun arrêt trouvé. Essaie une autre orthographe ou ajoute la ville.');
                })
                .catch(() => setMessage('La recherche ne répond pas. Vérifie ta connexion.'));
        }, 350);
        return () => window.clearTimeout(t);
    }, [query, near, step.kind]);

    const useMyPosition = () => {
        if (!navigator.geolocation) {
            setMessage('Ton navigateur ne donne pas accès à ta position.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setNear({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                setMessage(null);
            },
            () => setMessage('Position refusée. Ajoute le nom de la ville dans ta recherche.'),
        );
    };

    const chooseStop = async (stop: StopSuggestion, current: TransitLine[] = []) => {
        setBusy(true);
        setMessage(null);
        try {
            // Les lignes de l'arrêt sont déduites de ses prochains départs,
            // plus celles déjà choisies qui ne passent pas en ce moment
            const found = linesFromDepartures(await fetchDepartures(stop.id, 80));
            const lines = [...found, ...current.filter((c) => !found.some((f) => f.id === c.id))];
            setSelected(current.map((l) => l.id));
            setStep({ kind: 'lines', stop, lines });
        } catch {
            setMessage('Impossible de charger les lignes de cet arrêt. Réessaie.');
        } finally {
            setBusy(false);
        }
    };

    const toggle = (id: string) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const addAnotherStop = () => {
        setQuery('');
        setMessage(null);
        setStep({ kind: 'stop' });
    };

    if (step.kind === 'stop') {
        return (
            <div className={sheet.stack}>
                <h3 className={sheet.fieldTitle}>{entries.length ? 'Ajouter un arrêt' : 'Ton arrêt'}</h3>
                <p className={sheet.message}>Le nom de ton arrêt ou de ta gare, partout en France.</p>
                <label className={sheet.search}>
                    <Icon name="search" size={18} />
                    <span className="visually-hidden">Rechercher un arrêt</span>
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Gratte-Ciel, Part-Dieu, Châtelet…"
                        autoFocus
                    />
                </label>
                <button type="button" className={sheet.secondary} onClick={useMyPosition} aria-pressed={Boolean(near)}>
                    <Icon name="pin" size={18} /> {near ? 'Arrêts proches de toi en premier' : 'Privilégier les arrêts près de moi'}
                </button>
                {message && <p className={sheet.message}>{message}</p>}
                <ul className={sheet.options}>
                    {stops.map((s) => (
                        <li key={s.id}>
                            <button type="button" className={sheet.option} disabled={busy} onClick={() => chooseStop(s)}>
                                <strong>{s.name}</strong>
                                {s.area && <span>{s.area}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
                {entries.length > 0 && (
                    <button type="button" className={sheet.secondary} onClick={() => setStep({ kind: 'summary' })}>
                        Revenir à mes arrêts
                    </button>
                )}
                <a className={styles.sources} href={SOURCES_URL} target="_blank" rel="noreferrer">
                    Données Transitous et OpenStreetMap
                </a>
            </div>
        );
    }

    if (step.kind === 'lines') {
        return (
            <div className={sheet.stack}>
                <h3 className={sheet.fieldTitle}>Lignes à afficher</h3>
                <p className={sheet.message}>
                    {step.stop.name}
                    {step.stop.area && `, ${step.stop.area}`}.{' '}
                    <button type="button" className={styles.inlineLink} onClick={addAnotherStop}>
                        Changer d’arrêt
                    </button>
                </p>
                {step.lines.length > 0 ? (
                    <p className={sheet.message}>
                        Touche autant de lignes que tu veux. Sans sélection, toutes les lignes de l’arrêt sont affichées.
                    </p>
                ) : (
                    <p className={sheet.message}>
                        Aucun passage prévu dans les prochaines heures, donc pas de lignes à choisir pour l’instant. Toutes les
                        lignes seront affichées.
                    </p>
                )}
                <div className={styles.chips}>
                    {step.lines.map((l) => {
                        const on = selected.includes(l.id);
                        return (
                            <button
                                key={l.id}
                                type="button"
                                aria-pressed={on}
                                className={styles.chip}
                                style={on ? { background: l.color, color: l.textColor, borderColor: l.color } : undefined}
                                onClick={() => toggle(l.id)}
                            >
                                {l.code}
                            </button>
                        );
                    })}
                </div>
                <button
                    type="button"
                    className={sheet.submit}
                    onClick={() => {
                        const entry: StopEntry = {
                            stopId: step.stop.id,
                            stopName: step.stop.name,
                            area: step.stop.area,
                            lines: step.lines.filter((l) => selected.includes(l.id)),
                        };
                        // Arrêt déjà présent : on remplace ses lignes à la même place, sinon on l'ajoute à la fin
                        setEntries((prev) =>
                            prev.some((e) => e.stopId === entry.stopId)
                                ? prev.map((e) => (e.stopId === entry.stopId ? entry : e))
                                : [...prev, entry],
                        );
                        setStep({ kind: 'summary' });
                    }}
                >
                    Valider cet arrêt
                </button>
            </div>
        );
    }

    return (
        <div className={sheet.stack}>
            <h3 className={sheet.fieldTitle}>Arrêts de la carte</h3>
            <p className={sheet.message}>Ajoute d’autres arrêts, même d’autres villes : tout s’affichera sur la même carte.</p>
            <ul className={styles.summary}>
                {entries.map((e) => (
                    <li key={e.stopId}>
                        <div className={styles.summaryText}>
                            <strong>{e.stopName}</strong>
                            <span>{e.area}</span>
                            <div className={styles.summaryLines}>
                                {e.lines.length === 0 ? (
                                    <span>Toutes les lignes</span>
                                ) : (
                                    e.lines.map((l) => (
                                        <span key={l.id} className={styles.badge} style={{ background: l.color, color: l.textColor }}>
                                            {l.code}
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            className={styles.remove}
                            aria-label={`Modifier les lignes de ${e.stopName}`}
                            disabled={busy}
                            onClick={() => chooseStop({ id: e.stopId, name: e.stopName, area: e.area }, e.lines)}
                        >
                            <Icon name="edit" size={16} />
                        </button>
                        <button
                            type="button"
                            className={styles.remove}
                            aria-label={`Retirer ${e.stopName}`}
                            onClick={() => setEntries((prev) => prev.filter((x) => x.stopId !== e.stopId))}
                        >
                            <Icon name="close" size={16} strokeWidth={2.4} />
                        </button>
                    </li>
                ))}
            </ul>
            <button type="button" className={sheet.secondary} onClick={addAnotherStop}>
                <Icon name="plus" size={16} strokeWidth={2.4} /> Ajouter un autre arrêt
            </button>
            <button
                type="button"
                className={sheet.submit}
                disabled={entries.length === 0}
                onClick={() => onSubmit({ stops: entries })}
            >
                {initial ? 'Enregistrer' : 'Continuer'}
            </button>
        </div>
    );
}