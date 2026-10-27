# Aube

Ton tableau de bord du matin : une seule page, des cartes que tu choisis (météo, transports, agenda, prochain repas MealsUp…), en mode jour et nuit. Installable sur l'écran d'accueil de l'iPhone.

Stack : Vite, React, TypeScript, CSS Modules, Supabase, hébergement Vercel.

## Ce qui est prêt dans cette version

- Connexion par email et mot de passe (compte Aube, séparé de MealsUp)
- Tableau vide au premier lancement, carte Notes toujours présente (enregistrée automatiquement)
- Bouton « + » : catalogue, réglage de la carte, choix de la taille (petit, large, grand) avec aperçu
- Mode édition : déplacer, redimensionner, supprimer les cartes
- Mode jour / nuit (suit l'iPhone par défaut, bouton lune / soleil pour forcer)
- Carte Météo (Open-Meteo, sans clé)
- Carte Prochain repas (MealsUp) : connexion au compte MealsUp à l'ajout de la carte, comptes Aube et MealsUp séparés
- Les autres cartes sont listées « Bientôt » dans le catalogue

## Structure

```
api/                    (à venir) fonctions serveur Vercel : calendrier iCloud, transports
public/                 icônes de l'appli
src/
  cards/
    registry.ts         catalogue des cartes (c'est ici qu'on en ajoute)
    weather/            la carte Météo : vue, réglage, appels API
    mealsup/            la carte Prochain repas : connexion MealsUp, lecture des repas et du frigo
  components/           cadre des cartes, Notes, panneau d'ajout…
  hooks/                auth, cartes, notes, thème, rafraîchissement
  lib/                  client Supabase, dates, icônes, types
  pages/                connexion et tableau de bord
  styles/global.css     couleurs jour / nuit
supabase/schema.sql     tables et règles de sécurité
```

## Ajouter un type de carte

1. Créer un dossier dans `src/cards/` avec une vue (`View`) et, si besoin, un formulaire de réglage (`ConfigForm`). Inspire-toi de `weather/`.
2. Dans `src/cards/registry.ts`, renseigner `View`, `ConfigForm` et passer `status` à `'available'`.

Les réglages saisis à l'ajout sont stockés dans la colonne `config` (JSON) de la table `cards`.
