import { useCallback, useEffect, useState } from 'react';
import { localHourKey } from '../../lib/date';
import { useRefreshOnReturn } from '../../hooks/useRefreshOnReturn';
import { fetchForecast, type Forecast, type WeatherPlace } from './api';

export function useWeather(place: WeatherPlace) {
  const [data, setData] = useState<Forecast | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    fetchForecast(place, localHourKey())
      .then((f) => {
        setData(f);
        setError(false);
      })
      .catch(() => setError(true));
  }, [place.latitude, place.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  // Rafraîchit au retour sur l'appli et toutes les 15 minutes
  useRefreshOnReturn(load, 15 * 60 * 1000);

  return { data, error };
}
