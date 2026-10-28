import type { ComponentType } from 'react';
import type { CardSize } from '../lib/types';
import type { IconName } from '../lib/icons';
import { WeatherCard } from './weather/WeatherCard';
import { WeatherConfig } from './weather/WeatherConfig';
import { NextMealCard } from './mealsup/NextMealCard';
import { FridgeLogin, MealsupLogin } from './mealsup/MealsupLogin';
import { ExpiringCard } from './mealsup/ExpiringCard';
import { TransitCard } from './transit/TransitCard';
import { TransitConfig } from './transit/TransitConfig';
import { JourneyCard } from './journey/JourneyCard';
import { NotesCard } from './notes/NotesCard';

export interface CardViewProps<C> {
  config: C;
  size: CardSize;
  /** Enregistre de nouveaux réglages depuis la carte elle-même (notes, dernier trajet…). Absent dans les aperçus. */
  onChange?: (config: C) => Promise<void>;
}

export interface CardConfigProps<C> {
  onSubmit: (config: C) => void;
  /** Réglages actuels de la carte, quand on la modifie (absent à l'ajout) */
  initial?: C;
}

export interface CardDefinition<C = any> {
  type: string;
  name: string;
  description: string;
  icon: IconName;
  /** Nom du service affiché en badge dans le catalogue (ex. MealsUp) */
  source?: string;
  status: 'available' | 'soon';
  sizes: CardSize[];
  defaultSize: CardSize;
  View?: ComponentType<CardViewProps<C>>;
  /** Formulaire demandé au moment de l'ajout. Absent = pas de réglage. */
  ConfigForm?: ComponentType<CardConfigProps<C>>;
  /** false = la carte ne propose pas « Modifier » (ex. cartes MealsUp, dont le compte se gère dans Mon compte) */
  editable?: boolean;
}

/**
 * Catalogue des cartes. Pour ajouter un nouveau type :
 * 1. créer son dossier dans src/cards/ (vue + formulaire de réglage)
 * 2. l'enregistrer ici avec status: 'available'
 */
export const CARD_TYPES: CardDefinition[] = [
  {
    type: 'notes',
    name: 'Notes',
    description: 'Texte libre et listes à cocher',
    icon: 'edit',
    status: 'available',
    sizes: ['small', 'wide', 'large'],
    defaultSize: 'wide',
    View: NotesCard,
  },
  {
    type: 'weather',
    name: 'Météo',
    description: 'Température et pluie heure par heure',
    icon: 'cloud',
    status: 'available',
    sizes: ['small', 'wide', 'large'],
    defaultSize: 'small',
    View: WeatherCard,
    ConfigForm: WeatherConfig,
  },
  {
    type: 'transit',
    name: 'Transports',
    description: 'Prochains passages à ton arrêt, partout en France',
    icon: 'transit',
    status: 'available',
    sizes: ['small', 'wide', 'large'],
    defaultSize: 'wide',
    View: TransitCard,
    ConfigForm: TransitConfig,
  },
  {
    type: 'journey',
    name: 'Trajet',
    description: 'Cherche un itinéraire directement dans la carte, comme sur Maps',
    icon: 'route',
    status: 'available',
    sizes: ['large'],
    defaultSize: 'large',
    View: JourneyCard,
  },
  { type: 'agenda', name: 'Agenda', description: 'Tes rendez-vous du jour', icon: 'calendar', status: 'soon', sizes: ['wide', 'large'], defaultSize: 'wide' },
  { type: 'priorities', name: 'Priorités', description: 'Tes 3 tâches importantes', icon: 'check', status: 'soon', sizes: ['wide', 'large'], defaultSize: 'wide' },
  {
    type: 'mealsup-next',
    name: 'Prochain repas',
    description: 'Le repas prévu et ce qu’il manque',
    icon: 'meal',
    source: 'MealsUp',
    status: 'available',
    sizes: ['small', 'wide', 'large'],
    defaultSize: 'wide',
    View: NextMealCard,
    ConfigForm: MealsupLogin,
    editable: false,
  },
  {
    type: 'mealsup-fridge',
    name: 'À consommer vite',
    description: 'Ce qui périme dans ton frigo d’ici 2 jours',
    icon: 'fridge',
    source: 'MealsUp',
    status: 'available',
    sizes: ['small', 'wide', 'large'],
    defaultSize: 'wide',
    View: ExpiringCard,
    ConfigForm: FridgeLogin,
    editable: false,
  },
  { type: 'bikes', name: 'Vélos', description: 'Vélos et places dispo près de toi', icon: 'bike', status: 'soon', sizes: ['small', 'wide'], defaultSize: 'small' },
  { type: 'air', name: 'Qualité de l’air', description: 'Indice du jour et pollens', icon: 'air', status: 'soon', sizes: ['small', 'wide'], defaultSize: 'small' },
  { type: 'birthdays', name: 'Anniversaires', description: 'Ceux à ne pas oublier', icon: 'gift', status: 'soon', sizes: ['small', 'wide'], defaultSize: 'wide' },
];

export function getCardDefinition(type: string): CardDefinition | undefined {
  return CARD_TYPES.find((c) => c.type === type);
}
