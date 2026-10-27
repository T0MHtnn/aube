export type CardSize = 'small' | 'wide' | 'large';

export interface CardRow {
  id: string;
  type: string;
  size: CardSize;
  position: number;
  config: Record<string, unknown>;
}

export const SIZE_LABELS: Record<CardSize, { name: string; hint: string }> = {
  small: { name: 'Petit', hint: 'Carré, 1 case' },
  wide: { name: 'Large', hint: 'En longueur, 2 cases' },
  large: { name: 'Grand', hint: 'Grand carré, 4 cases' },
};
