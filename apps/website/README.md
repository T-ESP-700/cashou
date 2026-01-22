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

Le site peut être déployé sur n'importe quelle plateforme de hosting statique :

- **Vercel** : `vercel deploy`
- **Netlify** : `netlify deploy`
- **GitHub Pages** : Configurer dans les GitHub Actions

## 📄 Licence

Ce projet fait partie du projet Cashou.
