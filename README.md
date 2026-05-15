# BodyTrack AI

MVP web app fitness/nutrition avec React, TypeScript, Tailwind CSS et `localStorage`.

## Installation

Dans ce dossier :

```bash
npm install
npm run dev
```

Puis ouvrir l’URL affichée par Vite, souvent :

```bash
http://localhost:5173
```

## Configuration Supabase Auth

1. Créer un projet sur Supabase.
2. Dans Supabase, récupérer l’URL du projet et la clé publique `anon`.
3. Copier `.env.example` vers `.env`.
4. Remplir :

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. Redémarrer le serveur Vite après modification du `.env`.

L’app utilise Supabase uniquement pour l’authentification pour l’instant.
Les données nutrition, repas, poids et mensurations restent stockées dans `localStorage`.

## Déploiement Vercel

BodyTrack AI est une app React/Vite statique. Elle peut être publiée sur Vercel sans serveur Node personnalisé.

### 1. Préparer le projet

Vérifier localement :

```bash
npm install
npm run build
```

Le dossier de sortie généré par Vite est :

```bash
dist
```

### 2. Importer sur Vercel

1. Créer un compte ou se connecter sur Vercel.
2. Cliquer sur `Add New Project`.
3. Importer le repo Git contenant BodyTrack AI.
4. Vercel détecte normalement Vite automatiquement.
5. Vérifier les réglages :

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Le fichier `vercel.json` redirige toutes les routes vers `index.html`, ce qui évite les erreurs 404 si l’app ajoute des routes côté client plus tard.

### 3. Variables d’environnement Vercel

Dans Vercel, aller dans :

```txt
Project Settings > Environment Variables
```

Ajouter exactement :

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Ces variables doivent être disponibles au minimum pour `Production`. Tu peux aussi les ajouter pour `Preview` et `Development` si tu utilises les déploiements de prévisualisation.

Après avoir ajouté ou modifié ces variables, relancer un déploiement Vercel.

### 4. Configurer Supabase Redirect URL

Dans Supabase, aller dans :

```txt
Authentication > URL Configuration
```

Configurer :

```txt
Site URL: https://ton-domaine-vercel.vercel.app
```

Ajouter dans `Redirect URLs` :

```txt
http://localhost:5173
http://localhost:5173/**
https://ton-domaine-vercel.vercel.app
https://ton-domaine-vercel.vercel.app/**
```

Si tu ajoutes un domaine personnalisé, ajoute aussi :

```txt
https://ton-domaine.com
https://ton-domaine.com/**
```

Important : l’app utilise actuellement email + mot de passe. Si la confirmation email est activée dans Supabase, l’utilisateur devra valider son email avant de se connecter selon tes réglages Supabase.

## Structure des fichiers

```txt
.
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src
    ├── App.tsx
    ├── main.tsx
    ├── styles.css
    ├── types.ts
    ├── data
    │   └── foods.ts
    └── utils
        ├── nutrition.ts
        └── storage.ts
```

## Rôle des fichiers

- `src/App.tsx` : toute l’interface MVP, les pages, les formulaires et les rapports.
- `src/types.ts` : les types TypeScript principaux.
- `src/data/foods.ts` : base alimentaire avec les valeurs pour 100 g.
- `src/utils/nutrition.ts` : calculs calories, macros, moyennes et messages de motivation.
- `src/utils/storage.ts` : lecture et sauvegarde dans `localStorage`.
- `src/styles.css` : Tailwind et styles réutilisables pour les champs.

## Ce que tu peux tester

1. Créer ou modifier ton profil.
2. Voir les calories et macros calculées automatiquement.
3. Ajouter un repas depuis la base d’aliments.
4. Voir les macros du jour dans le tableau de bord.
5. Enregistrer ton poids et tes mensurations.
6. Consulter un rapport semaine, un rapport mois et un planning annuel simple.

## Design actuel

- Mode clair / sombre avec préférence sauvegardée dans le navigateur.
- Système multilangue avec Français, English, Nederlands et Español.
- Connexion utilisateur avec Supabase Auth.
- Dashboard premium avec progression circulaire des calories.
- Cartes macro animées pour calories, protéines, glucides et lipides.
- Graphique simple des calories et protéines sur 7 jours.
- Interface responsive avec navigation horizontale sur mobile.

## Données

Les données fitness sont enregistrées dans le navigateur avec `localStorage`.
Le compte utilisateur est géré par Supabase Auth.
