# Cashou Backoffice

Interface d'administration moderne pour gérer l'application Cashou.

## 🚀 Technologies

- **React 18** - Library UI
- **TypeScript** - Type safety
- **Vite** - Build tool ultra-rapide
- **Tailwind CSS** - Styling moderne
- **React Router** - Navigation SPA
- **Lucide Icons** - Icônes modernes
- **Node.js** - Runtime JavaScript

## 📦 Installation

```bash
# Installer les dépendances
npm install
```

## 🛠️ Développement

### Mode développement avec hot reload

```bash
# Option 1: Lancer uniquement le frontend (recommandé pour le dev)
npm run dev:frontend

# Option 2: Lancer le serveur backend (sert le frontend buildé)
npm run dev
```

Le mode `dev:frontend` lance Vite sur http://localhost:5173 avec hot reload instantané.

### Build production

```bash
# Build le frontend pour la production
npm run build

# Lance le serveur avec le build
npm run start
```

## 📂 Structure

```
backoffice/
├── src/
│   ├── components/
│   │   └── Layout.tsx          # Layout principal avec sidebar
│   ├── pages/
│   │   ├── Dashboard.tsx       # Page d'accueil
│   │   ├── Users.tsx           # Gestion des utilisateurs
│   │   ├── Levels.tsx          # Gestion des niveaux
│   │   ├── Quiz.tsx            # Gestion des quiz
│   │   ├── Events.tsx          # Gestion des événements
│   │   ├── Assets.tsx          # Gestion des assets
│   │   ├── Markets.tsx         # Gestion des marchés
│   │   └── GameInstances.tsx   # Monitoring des parties
│   ├── App.tsx                 # Configuration routing
│   ├── main.tsx                # Point d'entrée
│   └── index.css               # Styles Tailwind
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## 🎨 Fonctionnalités

### Dashboard
- Vue d'ensemble des statistiques clés
- Activité récente
- Niveaux populaires

### Users
- Liste des utilisateurs avec recherche
- Filtrage par niveau
- Gestion des comptes

### Levels
- Affichage en grille des niveaux
- Configuration des paramètres
- Points requis et balance de départ

### Quiz
- Gestion des quiz daily et MCQ
- Statistiques de completion
- Taux de réussite

### Events
- Événements de marché
- Impact sur les assets
- Création et modification

### Assets
- Liste des actifs tradables
- Prix et variations
- Volume de trading

### Markets
- Catégories de marchés
- Sous-marchés associés
- Sources de données

### Game Instances
- Monitoring des parties en cours
- État (actif/pause)
- Performance des joueurs

## 🎯 Navigation

La navigation se fait via la sidebar gauche avec 8 sections principales :
- 📊 Dashboard
- 👥 Users
- 🏆 Levels
- 🧠 Quiz
- 📅 Events
- 📈 Assets
- 🏢 Markets
- 🎮 Game Instances

## 🔧 Configuration

### Vite
Le serveur de dev Vite est configuré pour proxifier les appels API vers le backend :
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
}
```

### Tailwind
Configuration personnalisée avec palette de couleurs primary pour correspondre au branding Cashou.

## 🚦 Scripts disponibles

```bash
npm run dev              # Serveur backend (sert le build)
npm run dev:frontend     # Vite dev server avec HMR
npm run build            # Build production
npm run preview          # Preview du build
npm run start            # Lance le serveur production
```

## 💡 Développement

### Ajouter une nouvelle page

1. Créer le fichier dans `src/pages/`
2. Ajouter la route dans `App.tsx`
3. Ajouter l'item dans la sidebar de `Layout.tsx`

### Ajouter un composant

Créer le fichier dans `src/components/` et l'importer où nécessaire.

### Styling

Utiliser les classes Tailwind et les classes utilitaires définies dans `index.css` :
- `.card` - Carte avec shadow
- `.btn` - Bouton de base
- `.btn-primary` - Bouton principal
- `.btn-secondary` - Bouton secondaire
- `.input` - Input avec focus ring
- `.label` - Label de formulaire

## 🔗 API Integration

Les appels API doivent être faits vers `/api/*` qui sera proxifié vers le backend en développement.

Exemple:
```typescript
const response = await fetch('/api/users');
const users = await response.json();
```

## 📝 Notes

- Les données actuelles sont mockées
- Intégrer les vrais appels API vers le backend
- Ajouter l'authentification pour sécuriser l'accès
- Implémenter la gestion des permissions

