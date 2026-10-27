export interface WeatherPlace {
  name: string;
  latitude: number;
  longitude: number;
}

export interface CitySuggestion extends WeatherPlace {
  id: number;
  detail: string;
}

export interface HourSlot {
  time: string; // "2026-10-26T17:00"
  temperature: number;
  rainChance: number;
  code: number;
  wind: number; // km/h
  gusts: number; // km/h
}

export interface Forecast {
  temperature: number;
  code: number;
  wind: number;
  gusts: number;
  max: number;
  min: number;
  hours: HourSlot[]; // à partir de l'heure actuelle
}

export async function searchCities(query: string): Promise<CitySuggestion[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '6');
  url.searchParams.set('language', 'fr');
  url.searchParams.set('format', 'json');
  const res = await fetch(url);
  if (!res.ok) throw new Error('search failed');
  const json = (await res.json()) as {
    results?: { id: number; name: string; latitude: number; longitude: number; admin1?: string; country?: string }[];
  };
  return (json.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    detail: [r.admin1, r.country].filter(Boolean).join(', '),
  }));
}

export async function fetchForecast(place: WeatherPlace, fromHour: string): Promise<Forecast> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(place.latitude));
  url.searchParams.set('longitude', String(place.longitude));
  url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m');
  url.searchParams.set(
    'hourly',
    'temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m',
  );
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '2');
  const res = await fetch(url);
  if (!res.ok) throw new Error('forecast failed');
  const j = await res.json();

  const times: string[] = j.hourly.time;
  const start = Math.max(0, times.findIndex((t) => t >= fromHour));
  const hours: HourSlot[] = times.slice(start, start + 24).map((t, i) => ({
    time: t,
    temperature: Math.round(j.hourly.temperature_2m[start + i]),
    rainChance: j.hourly.precipitation_probability[start + i] ?? 0,
    code: j.hourly.weather_code[start + i],
    wind: Math.round(j.hourly.wind_speed_10m[start + i] ?? 0),
    gusts: Math.round(j.hourly.wind_gusts_10m[start + i] ?? 0),
  }));

  return {
    temperature: Math.round(j.current.temperature_2m),
    code: j.current.weather_code,
    wind: Math.round(j.current.wind_speed_10m ?? 0),
    gusts: Math.round(j.current.wind_gusts_10m ?? 0),
    max: Math.round(j.daily.temperature_2m_max[0]),
    min: Math.round(j.daily.temperature_2m_min[0]),
    hours,
  };
}

/** Libellé français d'un code météo WMO */
export function weatherLabel(code: number): string {
  if (code === 0) return 'Ensoleillé';
  if (code === 1) return 'Plutôt dégagé';
  if (code === 2) return 'Partiellement nuageux';
  if (code === 3) return 'Couvert';
  if (code === 45 || code === 48) return 'Brouillard';
  if (code === 56 || code === 57) return 'Bruine verglaçante';
  if (code >= 51 && code <= 55) return 'Bruine';
  if (code === 66 || code === 67) return 'Pluie verglaçante';
  if (code === 65) return 'Fortes pluies';
  if (code >= 61 && code <= 63) return 'Pluie';
  if (code >= 71 && code <= 77) return 'Neige';
  if (code === 82) return 'Fortes averses';
  if (code === 80 || code === 81) return 'Averses';
  if (code === 85 || code === 86) return 'Averses de neige';
  if (code >= 95) return 'Orage';
  return 'Variable';
}

export function hourLabel(time: string): string {
  return `${Number(time.slice(11, 13))} h`;
}

/** "Vent 15 km/h", avec les rafales quand elles sont nettement plus fortes */
export function windText(wind: number, gusts: number): string {
  return gusts >= wind + 15 ? `Vent ${wind} km/h, rafales ${gusts}` : `Vent ${wind} km/h`;
}

export interface WeatherAlert {
  text: string;
  /** true pour les phénomènes qui méritent d'être mis en avant */
  severe: boolean;
}

/** Du plus important au moins important : seul le premier trouvé est affiché */
const RULES: { match: (h: HourSlot) => boolean; label: (h: HourSlot) => string; severe: boolean }[] = [
  { match: (h) => h.code >= 95, label: () => 'Orage', severe: true },
  { match: (h) => (h.code >= 71 && h.code <= 77) || h.code === 85 || h.code === 86, label: () => 'Neige', severe: true },
  { match: (h) => [56, 57, 66, 67].includes(h.code), label: () => 'Verglas', severe: true },
  { match: (h) => h.gusts >= 80, label: (h) => `Rafales violentes ${h.gusts} km/h`, severe: true },
  { match: (h) => h.code === 65 || h.code === 82, label: () => 'Fortes pluies', severe: true },
  { match: (h) => h.gusts >= 60, label: (h) => `Fortes rafales ${h.gusts} km/h`, severe: true },
  {
    match: (h) => h.rainChance >= 50 || (h.code >= 51 && h.code <= 67) || (h.code >= 80 && h.code <= 82),
    label: () => 'Pluie',
    severe: false,
  },
  { match: (h) => h.code === 45 || h.code === 48, label: () => 'Brouillard', severe: false },
  { match: (h) => h.temperature <= 0, label: () => 'Gel', severe: false },
  { match: (h) => h.temperature >= 33, label: () => 'Forte chaleur', severe: false },
];

/** Intempérie la plus importante des 12 prochaines heures */
export function weatherAlert(hours: HourSlot[]): WeatherAlert {
  const next = hours.slice(0, 12);
  for (const rule of RULES) {
    const hit = next.find(rule.match);
    if (hit) {
      const when = hit === next[0] ? 'en ce moment' : `vers ${hourLabel(hit.time)}`;
      return { text: `${rule.label(hit)} ${when}`, severe: rule.severe };
    }
  }
  return { text: 'Pas d’intempérie prévue', severe: false };
}