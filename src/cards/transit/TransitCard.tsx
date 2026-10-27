import type { CardViewProps } from '../registry';
import { groupDepartures, SOURCES_URL, waitLabel, type DepartureGroup, type TransitConfig } from './api';
import { useDepartures } from './useDepartures';
import styles from './Transit.module.css';

function Badge({ group }: { group: DepartureGroup }) {
    return (
        <span className={styles.badge} style={{ background: group.color, color: group.textColor }}>
            {group.code}
        </span>
    );
}

export function TransitCard({ config, size }: CardViewProps<TransitConfig>) {
    const { departures, error, now } = useDepartures(config.stopId);

    if (error && !departures) {
        return <p className={styles.message}>Horaires indisponibles pour le moment. Ils se mettront à jour tout seuls.</p>;
    }
    if (!departures) return <p className={styles.message}>Chargement des horaires…</p>;

    const groups = groupDepartures(departures, config.lines.map((l) => l.id), now);
    const anyRealtime = groups.some((g) => g.realtime);

    if (groups.length === 0) {
        return (
            <div className={styles.full}>
                <span className={styles.stop}>{config.stopName}</span>
                <p className={styles.message}>Aucun passage prévu prochainement.</p>
            </div>
        );
    }

    if (size === 'small') {
        const g = groups[0];
        return (
            <div className={styles.small}>
                <span className={styles.stop}>{config.stopName}</span>
                <div className={styles.smallMain}>
                    <Badge group={g} />
                    <strong className={styles.bigWait}>{waitLabel(g.times[0], now)}</strong>
                </div>
                <span className={styles.direction}>
                    {g.direction}
                    {g.times[1] && <> · puis {waitLabel(g.times[1], now)}</>}
                </span>
            </div>
        );
    }

    const rows = groups.slice(0, size === 'large' ? 7 : 3);

    return (
        <div className={styles.full}>
            <div className={styles.head}>
                <span className={styles.stop}>{config.stopName}</span>
                <span className={styles.freshness}>
                    <span className={anyRealtime ? styles.live : styles.planned} aria-hidden="true" />
                    {anyRealtime ? 'Temps réel' : 'Horaires prévus'}
                </span>
            </div>
            <ul className={styles.rows}>
                {rows.map((g) => (
                    <li key={g.key}>
                        <Badge group={g} />
                        <span className={styles.rowDirection}>{g.direction}</span>
                        <span className={styles.times}>
                            <strong>{waitLabel(g.times[0], now)}</strong>
                            {g.times[1] && <span>{waitLabel(g.times[1], now)}</span>}
                        </span>
                    </li>
                ))}
            </ul>
            {size === 'large' && (
                <a className={styles.sources} href={SOURCES_URL} target="_blank" rel="noreferrer">
                    Données Transitous et OpenStreetMap
                </a>
            )}
        </div>
    );
}