# Résumé des changements – Étoiles par niveau et correctifs de setup

Ce document résume les changements effectués pour (1) le stockage de la complétion de niveau avec 1 à 3 étoiles et (2) les correctifs de setup/build, et ce que cela implique pour le fonctionnement du jeu.

---

## 0. Mise à jour fin de partie (modales + messages d’objectifs)

### Ce qui a été ajouté

- **Goal**
  - Nouveaux champs : `successMessage` et `failureMessage` (DB: `success_message`, `failure_message`).
- **EndGameService**
  - La réponse `endGame` inclut désormais :
    - `goals[].isMandatory` (distinction objectif principal/bonus),
    - `modal` avec 3 états : `PRIMARY_AND_SECONDARY_SUCCESS`, `PRIMARY_SUCCESS_ONLY`, `PRIMARY_FAILURE`.
  - Les textes de la modale sont alimentés par `Goal.successMessage` / `Goal.failureMessage` (avec fallback par défaut).

### Migration

- `20260212100000_add_goal_success_failure_messages` : ajoute `goals.success_message` et `goals.failure_message`.

---

## 1. Complétion de niveau et étoiles (fonctionnalité principale)

### Ce qui a été ajouté

**Modèle de données**

- **LevelGoal**  
  Nouveau champ : `isMandatory` (booléen, défaut `true`).  
  Distingue les objectifs obligatoires des objectifs bonus pour un niveau.

- **UserLevelCompletion** (nouvelle table)  
  Une ligne par (utilisateur, niveau). Stocke le **meilleur** résultat à ce jour :
  - `stars` (1 à 3)
  - `mandatoryGoalsMet`, `bonusGoalsMet`, `quizPassed` (booléens)
  - `completedAt`

**Backend**

- **LevelCompletionService**  
  - Calcule les étoiles (1 à 3) à partir des trois critères (objectifs obligatoires, objectifs bonus, quiz).  
  - **3 étoiles** = les trois ; **2 étoiles** = deux sur trois ; **1 étoile** = au moins un.  
  - `recordFromGameEnd` : appelé après une fin de partie réussie (`endGame`) ; utilise les résultats des objectifs et `LevelGoal.isMandatory` pour remplir obligatoire/bonus ; vérifie le quiz ; met à jour la meilleure complétion (upsert).  
  - `recordFromQuizComplete` : appelé quand l’utilisateur réussit un quiz ; met `quizPassed = true` et conserve ou déduit obligatoire/bonus à partir de la complétion existante ; met à jour la meilleure complétion.

- **EndGameService**  
  Après avoir marqué la partie comme terminée, si tous les objectifs obligatoires sont validés, appelle `LevelCompletionService.recordFromGameEnd` pour mettre à jour la complétion du niveau (et les étoiles).

- **UserQuizService**  
  Dans `completeQuiz`, quand `isCorrect === true`, appelle `LevelCompletionService.recordFromQuizComplete` pour le niveau du quiz.

- **LevelService**  
  - `getUserLevels` : retourne les étoiles (et optionnellement les indicateurs) depuis **UserLevelCompletion** au lieu de compter les tentatives de quiz.  
  - `getSummary` : retourne maintenant `levelGoals` (avec `goal` et `isMandatory`) pour que l’app puisse afficher « Objectif principal » vs « Bonus ».  
  - Duplication de niveau : copie `isMandatory` lors de la duplication des objectifs d’un niveau.

- **Router auth**  
  `getHomeData` : enrichit `lastCompletedGame` avec `stars`, `mandatoryGoalsMet`, `bonusGoalsMet`, `quizPassed` depuis UserLevelCompletion.

**Backoffice**

- LevelGoals : la liste affiche « Obligatoire » / « Bonus », un bouton pour basculer, et « Lier (obligatoire) » / « Lier (bonus) » lors de l’attache d’un objectif.  
  - API : `levelGoal.update` permet de modifier obligatoire/bonus.

**Mobile**

- Accueil et carte de niveau : `lastCompletedGame` et les données de la carte incluent `stars`.  
- **LevelCard** : prop optionnelle `stars` ; affiche 1 à 3 étoiles (dorées / contour) quand le statut est `completed` ou `quiz_pending` et `stars > 0`.  
- **LevelInfoModal** : les objectifs peuvent avoir `isMandatory` ; chaque objectif est libellé « Objectif principal » ou « Bonus ».  
- Écran jeu/current : les données du niveau incluent `levelGoals` ; les objectifs passés à la modale sont construits à partir de `levelGoals` avec `isMandatory`.

**Migration**

- `20260130120000_add_level_completion_and_goal_mandatory` : ajoute `level_goals.is_mandatory` et la table `user_level_completions`.

### Ce que cela implique pour le jeu

- **Étoiles par niveau**  
  Chaque niveau peut désormais afficher 1, 2 ou 3 étoiles pour un joueur, selon :
  - les objectifs obligatoires (tous validés à la fin d’une partie réussie),
  - les objectifs bonus (tous validés à la fin d’une partie réussie),
  - le quiz (au moins un quiz du niveau réussi).

- **Replay**  
  Seul le **meilleur** résultat est stocké par (utilisateur, niveau). Si le joueur refait un niveau et obtient plus d’étoiles, l’enregistrement est mis à jour ; sinon il reste inchangé.

- **Configuration**  
  Dans le backoffice, chaque objectif lié à un niveau doit être marqué « obligatoire » ou « bonus » ; cela pilote le calcul des étoiles et l’affichage dans la modale d’info du niveau.

- **Quand la complétion est mise à jour**  
  - Quand le joueur termine une partie et que tous les objectifs obligatoires sont validés → complétion et étoiles sont mises à jour.  
  - Quand le joueur réussit un quiz → complétion et étoiles sont mises à jour (critère quiz et éventuellement le total d’étoiles).

---

## 2. Correctifs de setup, build et environnement

### Tsconfig

- **Racine** (`tsconfig.json`) : suppression de `"extends": "expo/tsconfig.base"`.  
  Le backend (et tout ce qui étend la racine) ne dépend plus d’Expo ; l’erreur « expo/tsconfig.base not found » à l’ouverture du backend disparaît.

- **Mobile** (`apps/mobile/tsconfig.json`) : suppression de `extends: "expo/tsconfig.base"` et report des options de compilation type Expo directement dans le fichier.  
  L’app mobile se build sans avoir à résoudre le package `expo` pour la config de base.

### Environnement et Docker

- **`.env.example` à la racine**  
  Documente `CASHOU_DB_URL` et les variables Docker (`POSTGRES_USER`, etc.) pour que les devs puissent créer un `.env` et lancer Prisma (migrate, generate) et Docker Compose.

- **`.dockerignore` à la racine**  
  Exclut `node_modules`, `.git`, `.env`, `apps/mobile`, etc., du contexte de build Docker.  
  Évite l’erreur « cannot replace to directory with file » lors du build des images backend/backoffice (plus de copie des `node_modules` / symlinks de l’hôte).

### Seeds et scripts

- **Script setup**  
  Remplacement de `bunx tsx seed-admin.ts` par `bun run seed-admin.ts` dans l’étape de seed backoffice pour exécuter le seed avec Bun (sans tsx/esbuild), et éviter l’erreur « esbuild for another platform » sur certains Mac.

- **db-backoffice**  
  Ajout de la dépendance `bcryptjs` pour que `seed-admin.ts` (hashage du mot de passe) fonctionne lors de l’exécution du seed depuis ce package.

- **Prisma binaryTargets**  
  Ajout de `darwin-arm64` dans les deux schémas :
  - `packages/@cashou/db-app/prisma/schema.prisma`
  - `packages/@cashou/db-backoffice/prisma/schema.prisma`  
  Pour que Prisma génère le Query Engine pour Apple Silicon et que « Query Engine for runtime darwin-arm64 » soit trouvé lors de l’exécution des seeds ou de l’app en local sur M1/M2/M3.

### Ce que cela implique pour le jeu

- **Aucun impact sur les règles du jeu ou l’UX** au-delà de ce qui est décrit en section 1.  
- **Expérience dev** :  
  Les configs TypeScript backend et mobile fonctionnent sans Expo dans le chemin ; les builds Docker réussissent ; le setup peut être lancé avec Bun et se termine correctement sur Apple Silicon avec les seeds et migrations actuels.

---

## 3. Référence rapide

| Domaine           | Résumé du changement |
|-------------------|------------------------|
| **Étoiles**       | 1 à 3 étoiles par niveau selon objectifs obligatoires, bonus et quiz ; meilleur résultat conservé au replay. |
| **Données**       | `LevelGoal.isMandatory`, table `UserLevelCompletion`. |
| **Mise à jour**   | À la fin de partie réussie (si objectifs obligatoires OK) et à la réussite d’un quiz (`completeQuiz` avec `isCorrect`). |
| **Backoffice**    | Édition obligatoire/bonus par objectif de niveau ; affichage et bascule dans les relations de niveau. |
| **Mobile**        | La carte de niveau affiche les étoiles ; la modale d’info niveau affiche « Objectif principal » / « Bonus » par objectif. |
| **Setup**         | `.env.example`, `.dockerignore`, Bun pour seed-admin, bcryptjs, Prisma `darwin-arm64` ; tsconfig racine sans Expo. |
