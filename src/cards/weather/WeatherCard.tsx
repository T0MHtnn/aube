import type { CardViewProps } from '../registry';
import { hourLabel, weatherAlert, weatherLabel, windText, type WeatherPlace } from './api';
import { useWeather } from './useWeather';
import { WeatherIcon } from './WeatherIcon';
import styles from './Weather.module.css';

export function WeatherCard({ config, size }: CardViewProps<WeatherPlace>) {
  const { data, error } = useWeather(config);

  if (error && !data) {
    return <p className={styles.message}>Météo indisponible pour le moment. Elle se mettra à jour toute seule.</p>;
  }
  if (!data) return <p className={styles.message}>Chargement de la météo…</p>;

  const alert = weatherAlert(data.hours);
  const alertLine = <span className={alert.severe ? styles.alert : undefined}>{alert.text}</span>;

  if (size === 'small') {
    return (
      <div className={styles.small}>
        <div className={styles.placeRow}>
          <span className={styles.place}>{config.name}</span>
        </div>
        <div className={styles.tempRow}>
          <span className={styles.temp}>{data.temperature}°</span>
          <WeatherIcon code={data.code} isDay={data.isDay} size={38} label={weatherLabel(data.code)} />
        </div>
        <span className={styles.meta}>
          ↑{data.max}° ↓{data.min}° · {data.wind} km/h
          <br />
          {alertLine}
        </span>
      </div>
    );
  }

  // Large : un créneau toutes les 3 h. Grand : 8 créneaux, avec pluie et vent.
  const slots = data.hours.filter((_, i) => i % 3 === 0).slice(0, size === 'large' ? 8 : 4);

  return (
    <div className={styles.full}>
      <div className={styles.top}>
        <div className={styles.now}>
          <span className={styles.place}>{config.name}</span>
          <div className={styles.nowRow}>
            <span className={styles.temp}>{data.temperature}°</span>
            <WeatherIcon code={data.code} isDay={data.isDay} size={46} />
          </div>
        </div>
        <div className={styles.details}>
          <strong>{weatherLabel(data.code)}</strong>
          <span>
            ↑{data.max}° ↓{data.min}° · {windText(data.wind, data.gusts)}
          </span>
          {alertLine}
        </div>
      </div>
      <ol className={styles.hours}>
        {slots.map((h) => (
          <li key={h.time} className={h.rainChance >= 50 || h.gusts >= 60 ? styles.rainy : undefined}>
            <span>{hourLabel(h.time)}</span>
            {size === 'large' && <WeatherIcon code={h.code} isDay={h.isDay} size={24} label={weatherLabel(h.code)} />}
            <strong>{h.temperature}°</strong>
            {size === 'large' && (
              <>
                <span className={styles.chance}>Pluie {h.rainChance} %</span>
                <span className={styles.chance}>Vent {h.wind}</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}