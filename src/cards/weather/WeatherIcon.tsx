import styles from './Weather.module.css';

/** Pictogramme météo selon le code WMO d'Open-Meteo, en version jour ou nuit */
export type IconKind =
    | 'clear'
    | 'partly'
    | 'cloudy'
    | 'fog'
    | 'drizzle'
    | 'rain'
    | 'heavy-rain'
    | 'showers'
    | 'sleet'
    | 'snow'
    | 'heavy-snow'
    | 'thunder';

export function iconKind(code: number): IconKind {
    if (code === 0) return 'clear';
    if (code === 1 || code === 2) return 'partly';
    if (code === 3) return 'cloudy';
    if (code === 45 || code === 48) return 'fog';
    if ([56, 57, 66, 67].includes(code)) return 'sleet';
    if ([51, 53, 55, 61].includes(code)) return 'drizzle';
    if (code === 63) return 'rain';
    if (code === 65 || code === 82) return 'heavy-rain';
    if (code === 80 || code === 81) return 'showers';
    if (code === 75 || code === 86) return 'heavy-snow';
    if ((code >= 71 && code <= 77) || code === 85) return 'snow';
    if (code >= 95) return 'thunder';
    return 'cloudy';
}

const CLOUD = 'M9.5 25a5.5 5.5 0 1 1 1.3-10.85A7 7 0 0 1 24.3 15.5 4.75 4.75 0 0 1 23.5 25h-14z';
const MOON = 'M24 20.5A9.5 9.5 0 1 1 13.5 6a7.5 7.5 0 0 0 10.5 14.5z';
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];
const UP = 'translate(0 -4)';

function Sun({ cx, cy, r, from, to }: { cx: number; cy: number; r: number; from: number; to: number }) {
    return (
        <g className={styles.sun}>
            <circle cx={cx} cy={cy} r={r} />
            {RAYS.map((deg) => {
                const a = (deg * Math.PI) / 180;
                return (
                    <line
                        key={deg}
                        x1={cx + from * Math.cos(a)}
                        y1={cy + from * Math.sin(a)}
                        x2={cx + to * Math.cos(a)}
                        y2={cy + to * Math.sin(a)}
                    />
                );
            })}
        </g>
    );
}

const Moon = ({ transform }: { transform: string }) => <path className={styles.moon} transform={transform} d={MOON} />;
const Cloud = ({ transform = '' }: { transform?: string }) => <path className={styles.cloud} transform={transform} d={CLOUD} />;

function Drops({ xs, from = 23, to = 27 }: { xs: number[]; from?: number; to?: number }) {
    return (
        <g className={styles.drop}>
            {xs.map((x) => (
                <line key={x} x1={x} y1={from} x2={x - 1.5} y2={to} />
            ))}
        </g>
    );
}

function Flakes({ points }: { points: [number, number][] }) {
    return (
        <g className={styles.snow}>
            {points.map(([x, y]) =>
                [
                    [0, 1.8],
                    [1.6, 0.9],
                    [1.6, -0.9],
                ].map(([dx, dy]) => <line key={`${x}-${y}-${dx}-${dy}`} x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} />),
            )}
        </g>
    );
}

/** Petit astre derrière un nuage : soleil le jour, lune la nuit */
function SmallSky({ isDay, showers }: { isDay: boolean; showers?: boolean }) {
    if (isDay) return showers ? <Sun cx={10} cy={9} r={3.5} from={5.5} to={7.3} /> : <Sun cx={11} cy={11} r={4.2} from={6.5} to={8.5} />;
    return <Moon transform={showers ? 'translate(0.5 -1) scale(0.55)' : 'translate(1 0) scale(0.65)'} />;
}

interface Props {
    code: number;
    isDay: boolean;
    size?: number;
    /** Texte lu par les lecteurs d'écran ; sans texte, l'icône est décorative */
    label?: string;
}

export function WeatherIcon({ code, isDay, size = 40, label }: Props) {
    const kind = iconKind(code);
    let content;
    switch (kind) {
        case 'clear':
            content = isDay ? <Sun cx={16} cy={16} r={6} from={9} to={12} /> : <Moon transform="translate(1.5 3)" />;
            break;
        case 'partly':
            content = (
                <>
                    <SmallSky isDay={isDay} />
                    <Cloud transform="translate(3 3) scale(0.9)" />
                </>
            );
            break;
        case 'cloudy':
            content = <Cloud transform="translate(0 -2)" />;
            break;
        case 'fog':
            content = (
                <>
                    <Cloud transform={UP} />
                    <g className={styles.fog}>
                        <line x1={7} y1={25} x2={25} y2={25} />
                        <line x1={10} y1={29} x2={22} y2={29} />
                    </g>
                </>
            );
            break;
        case 'drizzle':
            content = (
                <>
                    <Cloud transform={UP} />
                    <Drops xs={[13, 20]} to={26} />
                </>
            );
            break;
        case 'rain':
            content = (
                <>
                    <Cloud transform={UP} />
                    <Drops xs={[10, 16, 22]} />
                </>
            );
            break;
        case 'heavy-rain':
            content = (
                <>
                    <Cloud transform={UP} />
                    <Drops xs={[8, 12, 16, 20, 24]} to={29} />
                </>
            );
            break;
        case 'showers':
            content = (
                <>
                    <SmallSky isDay={isDay} showers />
                    <Cloud transform="translate(2 -2) scale(0.9)" />
                    <Drops xs={[13, 19]} />
                </>
            );
            break;
        case 'sleet':
            content = (
                <>
                    <Cloud transform={UP} />
                    <Drops xs={[10, 22]} />
                    <Flakes points={[[16, 26]]} />
                </>
            );
            break;
        case 'snow':
            content = (
                <>
                    <Cloud transform={UP} />
                    <Flakes points={[[11, 25], [21, 25], [16, 28.5]]} />
                </>
            );
            break;
        case 'heavy-snow':
            content = (
                <>
                    <Cloud transform={UP} />
                    <Flakes points={[[9, 24.5], [16, 24.5], [23, 24.5], [12.5, 29], [19.5, 29]]} />
                </>
            );
            break;
        case 'thunder':
            content = (
                <>
                    <Cloud transform={UP} />
                    <path className={styles.bolt} d="M17 19.5l-4.5 6.5h3.5l-1.5 5 6-7.5h-3.5l1.8-4z" />
                </>
            );
            break;
    }

    return (
        <svg
            className={styles.icon}
            width={size}
            height={size}
            viewBox="0 0 32 32"
            {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
        >
            {content}
        </svg>
    );
}