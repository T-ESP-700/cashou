# Cashou Backoffice

Interface d'administration moderne pour gérer l'application Cashou.

## 🚀 Technologies

- **React 18** - Library UI
- **TypeScript** - Type safety
- **Vite** - Build tool ultra-rapide
- **Tailwind CSS** - Styling moderne
- **React Router** - Navigation SPA
- **Lucide Icons** - Icônes modernes

## 📦 Installation

```bash
bun install
```

## 🛠️ Développement

```bash
# Lancer le serveur de développement
bun run dev
```

Le serveur Vite démarre sur http://localhost:5173 avec hot reload.

### Build production

```bash
bun run build
bun run preview
```

## 📂 Structure

```
backoffice/
├── src/
│   ├── components/     # Composants réutilisables
│   ├── pages/          # Pages de l'application
│   ├── lib/            # Utilitaires et configuration
│   ├── hooks/          # Custom hooks
│   ├── store/          # State management
│   ├── App.tsx         # Configuration routing
│   ├── main.tsx        # Point d'entrée
│   └── index.css       # Styles Tailwind
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
