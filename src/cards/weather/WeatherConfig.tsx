import { useEffect, useState } from 'react';
import type { CardConfigProps } from '../registry';
import { searchCities, type CitySuggestion, type WeatherPlace } from './api';
import { Icon } from '../../components/Icon';
import sheet from '../../components/Sheet.module.css';

export function WeatherConfig({ onSubmit, initial }: CardConfigProps<WeatherPlace>) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CitySuggestion[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      searchCities(q)
        .then((r) => {
          setResults(r);
          setMessage(r.length ? null : 'Aucune ville trouvée. Vérifie l’orthographe.');
        })
        .catch(() => setMessage('La recherche ne répond pas. Vérifie ta connexion.'));
    }, 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const useMyPosition = () => {
    if (!navigator.geolocation) {
      setMessage('Ton navigateur ne donne pas accès à ta position. Cherche ta ville à la place.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => onSubmit({ name: 'Ma position', latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setMessage('Position refusée. Cherche ta ville à la place.'),
    );
  };

  return (
    <div className={sheet.stack}>
      <h3 className={sheet.fieldTitle}>Ta ville</h3>
      {initial && <p className={sheet.message}>Actuellement : {initial.name}. Cherche une autre ville pour la remplacer.</p>}
      <label className={sheet.search}>
        <Icon name="search" size={18} />
        <span className="visually-hidden">Rechercher une ville</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Villeurbanne, Lyon…"
          autoFocus
        />
      </label>
      <button type="button" className={sheet.secondary} onClick={useMyPosition}>
        <Icon name="pin" size={18} /> Utiliser ma position
      </button>
      {message && <p className={sheet.message}>{message}</p>}
      <ul className={sheet.options}>
        {results.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className={sheet.option}
              onClick={() => onSubmit({ name: r.name, latitude: r.latitude, longitude: r.longitude })}
            >
              <strong>{r.name}</strong>
              <span>{r.detail}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
