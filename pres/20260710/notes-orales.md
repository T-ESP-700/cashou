# Notes orales — Cashou
*Keynote finale · 10 Juillet 2026*

## Slide 1 — Cashou · Introduction

Bonjour à tous. On est l'équipe Cashou, et aujourd'hui on vous présente deux ans de travail. Deux ans sur un projet qui part d'un constat simple : l'éducation financière en France est défaillante, et les outils pour y remédier sont soit trop complexes, soit désengageants.

Ce projet de fin de master, on l'a construit de A à Z — de l'idée initiale jusqu'à une application mobile fonctionnelle, avec son API, son backoffice, son site vitrine et sa documentation. Aujourd'hui on vous montre ce qu'on a fait, comment on a travaillé, et pourquoi nos choix techniques et produit ont du sens.

On est sept, on va se présenter juste après, et on va vous emmener slide par slide dans tout ce qu'on a construit.

## Slide 2 — À quel besoin répond Cashou ?

Avant de parler du produit, parlons du problème. En France, la culture financière est à un niveau particulièrement bas. Selon le baromètre AMF 2025, 73% des Français estiment ne pas être suffisamment informés sur les placements financiers. 82% pensent que leur entourage ne l'est pas non plus. C'est massif.

En parallèle, 44% des Français qui investissent le font seuls, sans conseil, et 35% déclarent avoir l'intention d'investir dans les prochains mois. Donc on a une population qui veut passer à l'acte, mais qui n'a pas les bases pour le faire sereinement. C'est un paradoxe dangereux : et c'est exactement là qu'on intervient.

La cible principale c'est les 18-24 ans. Entre 2019 et 2023, le nombre d'investisseurs actifs de moins de 25 ans a triplé: de 13 000 à 53 000 (source AMF). C'est une génération qui veut investir jeune, qui est à l'aise avec les applications mobiles, mais qui n'a reçu aucune formation sur le sujet ni à l'école ni en famille.

Notre réponse, c'est une application qui apprend les bases de l'investissement en simulant de vraies situations de marché, sans risquer un seul euro. On apprend en jouant, pas en lisant un manuel.


## Slide 3 — L'équipe

## Slide 4 — Qu'est-ce que Cashou ?

## Slide 5 — Business Plan

Le modèle économique repose sur trois piliers.

Premièrement le freemium : les niveaux 1 à 5 sont gratuits, ce qui abaisse la barrière d'entrée et maximise la base d'utilisateurs. Deuxièmement l'abonnement mensuel à 9,99€ qui débloque les 20 niveaux complets et les fonctionnalités avancées. Troisièmement le B2B : on propose des licences à 5 000€ par an aux entreprises et aux établissements scolaires pour former leurs employés ou leurs étudiants.

Sur les projections : on table sur 20 000 utilisateurs dès la première année avec un taux de conversion de 3% vers le premium. Ça représente 600 abonnés payants. En ajoutant 2 contrats B2B, on arrive à 81 928€ de revenus pour 67 000€ de dépenses — soit un bénéfice de 14 928€ dès l'an 1. C'est un seuil de rentabilité rapide pour un projet de ce type.

L'an 3 on projette 39 200 utilisateurs et 10 contrats B2B pour 190 979€ de revenus et 134 979€ de profit. Ces chiffres sont conservateurs — on a maintenu le taux de conversion à 3% sans hausse, pour rester réalistes.

Les dépenses sont maîtrisées parce qu'on est une équipe de développeurs juniors. La première année on investit davantage en développement (35k€), puis on passe en mode maintenance (20k€). Le poste hébergement reste stable à 7 000€ par an.

## Slide 6 — Marketing et communication

On a mis en place une stratégie de communication dès la phrase de développement. Le site cashou.app est déployé sur Vercel, avec un formulaire de pré-inscription séparé pour iOS et Android. On collecte des emails qualifiés : celui des gens qui veulent être notifiés au lancement. C'est une liste de prospects chauds.

On a une page LinkedIn entreprise active dans l'idée de nous permet de construire une communauté avant même d'avoir lancé l'app.

On a également produit des supports print — affiches et flyers — pour une présence sur les campus. L'idée c'est de cibler les étudiants là où ils sont physiquement.

Côté analytics, on mesure tout sans Google Analytics, on est RGPD-compliant dès le départ. C'est un choix délibéré qui nous protège légalement et qui rassure les utilisateurs sur le traitement de leurs données.

## Slide 7 — Organisation du travail

Pour suivre l'avancement du développement des différentes fonctionnalités de l'app, nous avons adopté une organisation de type Kanba afin de visualiser l'état d'avancement du projet en temps réel. Cette méthode nous permettait de savoir rapidement quelles fonctionnalités restaient à réaliser, lesquelles étaient en cours de développement, lesquelles devaient être testées avant validation et celles qui étaient entièrement terminées. Cette organisation nous a permis de prioriser les développements, de mieux répartir le travail et de suivre efficacement l'avancement de chaque fonctionnalité jusqu'à sa finalisation.

Chaque fonctionnalité est tracée dans un ticket numéroté — format T-XXX. Chaque ticket a sa branche git dédiée, ses labels (feat, fix, chore, doc), et son cycle de review. Rien ne merge sur main sans être passé par une PR validée par un autre membre de l'équipe et sans que la CI soit verte.

La communication est principalement asynchrone au quotidien via messages, ce qui respecte les emplois du temps de chacun. On se retrouve en réunion de temps en temps pour une revue sur l'avancement et sur ce qui a été livré.

Tous nos outils de gestion, Notion, GitHub, sont choisis pour être ouverts, versionnés, et accessibles à l'ensemble de l'équipe. Rien n'est dans la tête d'une seule personne et cela fludifie non seuleument le travail au quotidien mais nou s aurais permis egalement d'integrer rapidement et efficacement une nouvelle personne sur le projet si le cas c'etait presenté.

## Slide 8 — Documentation automatique

## Slide 9 — Stack technique

On a fait des choix techniques réfléchis. Le point commun de toute notre stack, c'est TypeScript. Backend, frontend mobile, backoffice: tout est en TypeScript strict. Ça nous donne un filet de sécurité à la compilation, et ça simplifie les échanges entre les parties du système.

Pour l'API, on a choisi Bun plutôt que Node.js. Bun c'est un runtime JavaScript nouvelle génération, démarrage plus rapide, performances supérieures, et il inclut nativement un test runner, un bundler et un gestionnaire de paquets. Pour un projet de notre taille, c'est un choix moderne et cohérent.

L'app mobile est en React Native avec Expo, ce qui nous permet de cibler iOS et Android depuis un seul codebase. Le backoffice est une SPA React Vite. Le site vitrine est en Astro, un framework orienté performance pour les sites à contenu statique. Et tout repose sur PostgreSQL avec Prisma ORM.

## Slide 10 — Base de données

La base de données c'est le cœur du projet. On a 35 tables réparties en 7 domaines métier : l'authentification, les niveaux, la mécanique de jeu, le marché financier simulé, le portefeuille utilisateur, le quiz et le dictionnaire, et le contenu éditorial.

Le schéma est géré avec Prisma ORM. Prisma nous apporte deux choses essentielles : les migrations versionnées (chaque évolution du schéma est tracée et reproductible) et la génération automatique des types TypeScript. Concrètement, quand on fait une requête sur la table Transaction, le résultat est déjà typé. On ne peut pas accéder à un champ qui n'existe pas sans que TypeScript nous arrête à la compilation.

On a fait le choix de PostgreSQL pour sa robustesse sur les données relationnelles et son support natif du JSON pour certaines structures flexibles. Pour un projet financier où l'intégrité des données est critique, c'est le bon choix.

Le schéma a évolué significativement sur deux ans: on est passé d'une vingtaine de tables à 35. Chaque évolution a été migrée proprement, sans jamais casser les données existantes.

## Slide 11 — API

L'API est le point de jonction entre tous les clients: l'app mobile et le backoffice. On a choisi tRPC plutôt qu'une API REST classique. tRPC c'est un framework qui permet d'appeler des fonctions côté serveur depuis le client comme si c'était du code local, avec les types partagés de bout en bout. Si on change la signature d'une fonction serveur, le client ne compile plus jusqu'à ce qu'il soit mis à jour. Zéro dérive possible entre le contrat API et son utilisation.

L'authentification est gérée par Better-Auth, une librairie moderne qui couvre les sessions, les providers OAuth, et s'intègre nativement avec Prisma. C'est un choix délibéré par rapport à une solution maison ou à des librairies vieillissantes comme Passport.js.

Pour tester et documenter l'API, on utilise Bruno, une alternative open-source à Postman. L'avantage de Bruno c'est que les collections sont des fichiers texte commités dans le repo git. Quand on ajoute une route, on ajoute son test Bruno dans la même PR. La documentation est donc toujours synchronisée avec le code.

## Slide 12 — Backoffice

Le backoffice c'est l'interface d'administration que l'équipe utilise pour gérer le contenu de l'application sans toucher au code. Niveaux, objectifs, événements de marché, actifs, questions de quiz, tout est modifiable depuis une interface graphique.

C'est un choix architectural important. Si on avait mis le contenu en dur dans le code, chaque modification aurait nécessité un déploiement. Avec le backoffice, l'équipe pédagogique peut ajuster une question ou ajouter un événement de marché en quelques clics.

Le backoffice est une SPA React Vite avec React Router pour la navigation et son propre schéma Prisma pour les besoins administratifs spécifiques. Les accès sont restreints aux membres de l'équipe: l'authentification admin est distincte de l'authentification utilisateur de l'app.

## Slide 13 — App : Game Design

## Slide 14 — App : Front

L'app mobile est construite en React Native avec Expo. Un seul codebase pour iOS et Android, c'est un choix pragmatique qui nous a permis de maintenir la parité de fonctionnalités entre les deux plateformes sans doubler la charge de développement.

Pour la gestion des données, on utilise React Query. Ça nous donne un cache client intelligent avec invalidation ciblée: quand une transaction est effectuée, seules les données concernées sont refetchées. Ça évite les appels API redondants et rend l'app fluide même sur connexion lente.

On a développé un système de thème unifié avec des composants réutilisables sur toutes les vues — boutons, cards, inputs, badges. Ça garantit une cohérence visuelle et simplifie les évolutions de design.

L'app couvre 11 écrans : l'accueil avec le quiz daily, l'historique des quiz, la liste des niveaux, les écrans in-game pour les assets, les transactions et les événements de marché, le quiz de fin de partie, le récapitulatif, le dictionnaire financier, et le profil utilisateur. C'est un parcours complet, du premier lancement jusqu'à la maîtrise des bases de l'investissement.

## Slide 15 — Qualité
## Slide 16 — Tests
## Slide 17 — Démo !
