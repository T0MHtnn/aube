import type { CardViewProps } from '../registry';
import { buildSections, SOURCES_URL, stopsOf, waitLabel, type DepartureGroup, type TransitConfig } from './api';
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
    const stops = stopsOf(config);
    const { byStop, error, now } = useDepartures(stops.map((s) => s.stopId));

    if (error && !byStop) {
        return <p className={styles.message}>Horaires indisponibles pour le moment. Ils se mettront à jour tout seuls.</p>;
    }
    if (!byStop) return <p className={styles.message}>Chargement des horaires…</p>;

    const sections = buildSections(stops, byStop, now);
    const anyRealtime = sections.some((s) => s.groups.some((g) => g.realtime));
    const title = stops.length === 1 ? stops[0].stopName : 'Transports';
    const compact = size === 'small';

    return (
        <div className={styles.full}>
            <div className={styles.head}>
                <span className={styles.stop}>{title}</span>
                {!compact && (
                    <span className={styles.freshness}>
                        <span className={anyRealtime ? styles.live : styles.planned} aria-hidden="true" />
                        {anyRealtime ? 'Temps réel' : 'Horaires prévus'}
                    </span>
                )}
            </div>

            {sections.length === 0 ? (
                <p className={styles.message}>Aucun passage prévu prochainement.</p>
            ) : (
                // La liste défile à l'intérieur de la carte quand elle est trop longue
                <div className={styles.scroll} tabIndex={0} aria-label="Prochains passages">
                    {sections.map((section) => (
                        <section key={section.key} className={styles.section}>
                            {(sections.length > 1 || !compact) && <h3 className={styles.sectionTitle}>{section.title}</h3>}
                            <ul className={compact ? styles.compactRows : styles.rows}>
                                {section.groups.map((g) =>
                                    compact ? (
                                        <li key={g.key}>
                                            <span className={styles.compactMain}>
                                                <Badge group={g} />
                                                <strong>{waitLabel(g.times[0], now)}</strong>
                                            </span>
                                            <span className={styles.compactDirection}>{g.direction}</span>
                                        </li>
                                    ) : (
                                        <li key={g.key}>
                                            <Badge group={g} />
                                            <span className={styles.rowDirection}>{g.direction}</span>
                                            <span className={styles.times}>
                                                <strong>{waitLabel(g.times[0], now)}</strong>
                                                {g.times[1] && <span>{waitLabel(g.times[1], now)}</span>}
                                            </span>
                                        </li>
                                    ),
                                )}
                            </ul>
                        </section>
                    ))}
                    {size === 'large' && (
                        <a className={styles.sources} href={SOURCES_URL} target="_blank" rel="noreferrer">
                            Données Transitous et OpenStreetMap
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}