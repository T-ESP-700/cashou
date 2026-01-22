# Site Web Cashou

Site de présentation pour l'application mobile Cashou, construit avec Astro et Tailwind CSS.

## 🚀 Démarrage rapide

```bash
# Installer les dépendances
bun install

# Démarrer le serveur de développement
bun run dev

# Build pour la production
bun run build

# Prévisualiser le build de production
bun run preview
```

## 📁 Structure du projet

```
website/
├── src/
│   ├── assets/          # Images et assets (logo, etc.)
│   ├── components/      # Composants Astro réutilisables
│   │   ├── Header.astro
│   │   ├── Hero.astro
│   │   ├── Features.astro
│   │   ├── HowItWorks.astro
│   │   ├── Testimonials.astro
│   │   ├── Download.astro
│   │   └── Footer.astro
│   ├── layouts/         # Layouts de base
│   │   └── Layout.astro
│   ├── pages/           # Pages du site
│   │   └── index.astro
│   └── styles/           # Styles globaux
│       └── global.css
├── public/              # Fichiers statiques (favicon, etc.)
├── astro.config.mjs     # Configuration Astro
├── tailwind.config.js   # Configuration Tailwind
└── package.json
```

## 🎨 Design System

Le site utilise les couleurs de l'application Cashou :

- **Primary/Accent**: `#FFB472` (Orange corail)
- **Secondary**: `#F0E8E3` (Beige clair)
- **Background Light**: `#F4F4F9` (Gris très clair)
- **Background Dark**: `#1C1E33` (Bleu foncé)
- **Text Light**: `#1C1E33`
- **Text Dark**: `#FFFFFF`

### Polices

- **Heading**: Rowdies (Google Fonts)
- **Body**: Roboto (Google Fonts)

## 🛠️ Technologies

- **Astro** : Framework web moderne pour des sites statiques performants
- **Tailwind CSS** : Framework CSS utilitaire
- **TypeScript** : Support TypeScript natif

## 📝 Fonctionnalités

- ✅ Design responsive (mobile-first)
- ✅ Navigation fluide avec scroll smooth
- ✅ Animations et transitions
- ✅ Header fixe avec effet de scroll
- ✅ Menu mobile
- ✅ Optimisation des images avec Astro
- ✅ SEO optimisé

## 🚀 Déploiement

### Déploiement sur Vercel

Le site est configuré pour être déployé sur Vercel.

#### Première configuration (une seule fois)

1. Installer Vercel CLI globalement (si ce n'est pas déjà fait) :
```bash
bun add -g vercel
# ou
npm install -g vercel
```

2. Se connecter à Vercel depuis le dossier `apps/website` :
```bash
cd apps/website
vercel login
```

3. Lier le projet à Vercel (première fois seulement) :
```bash
cd apps/website
vercel
```
Suivez les instructions pour lier votre projet à un projet Vercel existant ou créer un nouveau projet.

#### Déploiement en production

Une fois configuré, vous pouvez déployer à tout moment avec :

```bash
# Depuis la racine du projet
bun run deploy:website

# Ou depuis le dossier website
cd apps/website
bun run deploy
```

Cette commande va :
1. Builder le site Astro
2. Déployer sur Vercel en production
3. Vous donner l'URL de déploiement

#### Autres plateformes

Le site peut également être déployé sur :
- **Netlify** : `netlify deploy`
- **GitHub Pages** : Configurer dans les GitHub Actions

## 📄 Licence

Ce projet fait partie du projet Cashou.
