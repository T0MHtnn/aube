import { useEffect, useState } from 'react';
import type { CardConfigProps } from '../registry';
import { Icon } from '../../components/Icon';
import { SOURCES_URL } from '../transit/api';
import { searchPlaces, type JourneyConfig as Config, type JourneyPlace, type PlaceSuggestion } from './api';
import sheet from '../../components/Sheet.module.css';
import styles from './Journey.module.css';

/** Recherche d'une adresse, d'un arrêt ou d'un lieu */
function PlacePicker({ title, onPick, onCancel }: { title: string; onPick: (p: JourneyPlace) => void; onCancel?: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PlaceSuggestion[]>([]);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            return;
        }
        const t = window.setTimeout(() => {
            searchPlaces(q)
                .then((r) => {
                    setResults(r);
                    setMessage(r.length ? null : 'Aucun résultat. Ajoute la ville ou essaie une autre orthographe.');
                })
                .catch(() => setMessage('La recherche ne répond pas. Vérifie ta connexion.'));
        }, 350);
        return () => window.clearTimeout(t);
    }, [query]);

    const usePosition = () => {
        if (!navigator.geolocation) {
            setMessage('Ton navigateur ne donne pas accès à ta position.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => onPick({ name: 'Ma position', lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => setMessage('Position refusée. Cherche l’adresse à la place.'),
        );
    };

    return (
        <div className={sheet.stack}>
            <h3 className={sheet.fieldTitle}>{title}</h3>
            <label className={sheet.search}>
                <Icon name="search" size={18} />
                <span className="visually-hidden">{title}</span>
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Adresse, arrêt ou lieu" autoFocus />
            </label>
            <button type="button" className={sheet.secondary} onClick={usePosition}>
                <Icon name="pin" size={18} /> Utiliser ma position actuelle
            </button>
            {message && <p className={sheet.message}>{message}</p>}
            <ul className={sheet.options}>
                {results.map((r) => (
                    <li key={r.id}>
                        <button type="button" className={sheet.option} onClick={() => onPick({ name: r.name, lat: r.lat, lon: r.lon })}>
                            <strong>{r.name}</strong>
                            <span>{r.detail}</span>
                        </button>
                    </li>
                ))}
            </ul>
            {onCancel && (
                <button type="button" className={sheet.secondary} onClick={onCancel}>
                    Annuler
                </button>
            )}
        </div>
    );
}

type Step = 'from' | 'to' | 'summary';

export function JourneyConfig({ onSubmit, initial }: CardConfigProps<Config>) {
    const [from, setFrom] = useState<JourneyPlace | null>(initial?.from ?? null);
    const [to, setTo] = useState<JourneyPlace | null>(initial?.to ?? null);
    const [step, setStep] = useState<Step>(initial ? 'summary' : 'from');

    if (step === 'from') {
        return (
            <PlacePicker
                title="Départ"
                onCancel={from && to ? () => setStep('summary') : undefined}
                onPick={(p) => {
                    setFrom(p);
                    setStep(to ? 'summary' : 'to');
                }}
            />
        );
    }

    if (step === 'to') {
        return (
            <PlacePicker
                title="Arrivée"
                onCancel={from && to ? () => setStep('summary') : undefined}
                onPick={(p) => {
                    setTo(p);
                    setStep('summary');
                }}
            />
        );
    }

    const field = (label: string, place: JourneyPlace | null, set: (p: JourneyPlace) => void, change: Step) => (
        <div className={styles.placeField}>
            <span className={styles.placeLabel}>{label}</span>
            <label className={sheet.field}>
                <span className="visually-hidden">Nom affiché pour {label.toLowerCase()}</span>
                <input
                    type="text"
                    value={place?.name ?? ''}
                    onChange={(e) => place && set({ ...place, name: e.target.value })}
                    placeholder="Maison, Travail…"
                />
            </label>
            <button type="button" className={styles.inlineLink} onClick={() => setStep(change)}>
                Changer d’adresse
            </button>
        </div>
    );

    return (
        <div className={sheet.stack}>
            <h3 className={sheet.fieldTitle}>Ton trajet</h3>
            <p className={sheet.message}>Tu peux renommer les deux points (par exemple Maison et Travail). Sur la carte, un bouton permet d’inverser le trajet pour le retour.</p>
            {field('Départ', from, setFrom, 'from')}
            {field('Arrivée', to, setTo, 'to')}
            <button
                type="button"
                className={sheet.secondary}
                onClick={() => {
                    setFrom(to);
                    setTo(from);
                }}
            >
                <Icon name="swap" size={16} /> Inverser départ et arrivée
            </button>
            <a className={styles.sources} href={SOURCES_URL} target="_blank" rel="noreferrer">
                Données Transitous et OpenStreetMap
            </a>
            <button
                type="button"
                className={sheet.submit}
                disabled={!from || !to}
                onClick={() =>
                    from &&
                    to &&
                    onSubmit({
                        from: { ...from, name: from.name.trim() || 'Départ' },
                        to: { ...to, name: to.name.trim() || 'Arrivée' },
                    })
                }
            >
                {initial ? 'Enregistrer' : 'Continuer'}
            </button>
        </div>
    );
}