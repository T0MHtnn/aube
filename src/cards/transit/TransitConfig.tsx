import { useEffect, useState } from 'react';
import type { CardConfigProps } from '../registry';
import {
    fetchDepartures,
    linesFromDepartures,
    searchStops,
    SOURCES_URL,
    type StopSuggestion,
    type TransitConfig as Config,
    type TransitLine,
} from './api';
import { Icon } from '../../components/Icon';
import sheet from '../../components/Sheet.module.css';
import styles from './Transit.module.css';

type Step = { kind: 'stop' } | { kind: 'lines'; stop: StopSuggestion; lines: TransitLine[] };

export function TransitConfig({ onSubmit }: CardConfigProps<Config>) {
    const [step, setStep] = useState<Step>({ kind: 'stop' });
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

    const chooseStop = async (stop: StopSuggestion) => {
        setBusy(true);
        setMessage(null);
        try {
            // Les lignes de l'arrêt sont déduites de ses prochains départs
            const lines = linesFromDepartures(await fetchDepartures(stop.id, 80));
            setSelected([]);
            setStep({ kind: 'lines', stop, lines });
        } catch {
            setMessage('Impossible de charger les lignes de cet arrêt. Réessaie.');
        } finally {
            setBusy(false);
        }
    };

    const toggle = (id: string) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    if (step.kind === 'stop') {
        return (
            <div className={sheet.stack}>
                <h3 className={sheet.fieldTitle}>Ton arrêt</h3>
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
                <a className={styles.sources} href={SOURCES_URL} target="_blank" rel="noreferrer">
                    Données Transitous et OpenStreetMap
                </a>
            </div>
        );
    }

    return (
        <div className={sheet.stack}>
            <h3 className={sheet.fieldTitle}>Lignes à afficher</h3>
            <p className={sheet.message}>
                {step.stop.name}
                {step.stop.area && `, ${step.stop.area}`}.{' '}
                <button type="button" className={styles.inlineLink} onClick={() => setStep({ kind: 'stop' })}>
                    Changer d’arrêt
                </button>
            </p>
            {step.lines.length > 0 ? (
                <p className={sheet.message}>Touche les lignes qui t’intéressent. Sans sélection, toutes les lignes sont affichées.</p>
            ) : (
                <p className={sheet.message}>
                    Aucun passage prévu dans les prochaines heures, donc pas de lignes à choisir pour l’instant. Toutes les lignes
                    seront affichées.
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
                onClick={() =>
                    onSubmit({
                        stopId: step.stop.id,
                        stopName: step.stop.name,
                        area: step.stop.area,
                        lines: step.lines.filter((l) => selected.includes(l.id)),
                    })
                }
            >
                Continuer
            </button>
        </div>
    );
}