# Système de scoring (étoiles par niveau)

Ce document décrit le fonctionnement du score par niveau : 1 à 3 étoiles, critères, enregistrement et APIs.

---

## Vue d’ensemble

- Chaque niveau peut rapporter **1, 2 ou 3 étoiles** au joueur.
- Le score est basé sur **trois critères** : objectifs obligatoires, objectifs bonus, quiz.
- Une seule ligne par (utilisateur, niveau) est conservée : **UserLevelCompletion** (meilleur résultat).
- Les étoiles sont affichées sur l’écran de résumé, la carte niveau (home), la liste des niveaux et le profil.

---

## Les trois critères

| Critère | Signification | Condition pour être validé |
|--------|----------------|-----------------------------|
| **Objectifs obligatoires** | Tous les objectifs du niveau marqués « obligatoires » (`LevelGoal.isMandatory = true`) | **Tous** doivent être validés à la fin de la partie (succès endGame). |
| **Objectifs bonus** | Tous les objectifs du niveau marqués « bonus » (`LevelGoal.isMandatory = false`) | **Tous** doivent être validés à la fin de la partie. Un niveau peut avoir plusieurs objectifs bonus ; l’étoile bonus n’est accordée que si **tous** sont atteints. |
| **Quiz** | Au moins un quiz associé au niveau (`Quiz.levelId`) | L’utilisateur doit avoir **réussi** au moins un quiz de ce niveau (participation avec `isCorrect = true` et `completedAt` renseigné). |

- Si un niveau n’a aucun objectif obligatoire, le critère « objectifs obligatoires » est considéré comme validé (pour ne pas bloquer).
- Si un niveau n’a aucun objectif bonus, le critère « objectifs bonus » est considéré comme validé.
- Le quiz est optionnel : pas de quiz pour le niveau → le critère quiz n’entre pas en jeu pour le calcul (la formule donne quand même entre 1 et 3 étoiles selon les deux autres critères).

---

## Calcul des étoiles

Le nombre d’étoiles est le **nombre de critères validés** (1, 2 ou 3), avec un minimum de 1 et un maximum de 3 :

- **3 étoiles** : les trois critères validés (obligatoires + bonus + quiz).
- **2 étoiles** : deux critères validés.
- **1 étoile** : au moins un critère validé.

Implémentation : `LevelCompletionService.computeStars(criteria)` dans [apps/backend/src/trpc/services/level-completion.service.ts](apps/backend/src/trpc/services/level-completion.service.ts).

---

## Quand la complétion est enregistrée ou mise à jour

1. **Fin de partie (`endGame`)**
   - Si **tous les objectifs obligatoires** sont validés, le backend appelle `LevelCompletionService.recordFromGameEnd`.
   - À partir des résultats de chaque objectif et de `LevelGoal.isMandatory`, le service calcule `mandatoryGoalsMet` et `bonusGoalsMet` (tous les bonus doivent être validés pour `bonusGoalsMet = true`).
   - Il récupère `quizPassed` (quiz du niveau déjà réussi ou non), puis met à jour **UserLevelCompletion** en ne conservant que le **meilleur** score (nombre d’étoiles) : si le nouveau score est inférieur à l’existant, rien n’est modifié.

2. **Réussite d’un quiz de fin de niveau**
   - Quand l’utilisateur réussit un quiz **lié à un niveau** (`Quiz.levelId` renseigné), le backend appelle `LevelCompletionService.recordFromQuizComplete` (depuis `UserQuizService.createOrUpdateParticipation` ou `completeQuiz`).
   - Le critère « quiz » passe à vrai ; les critères obligatoires / bonus sont laissés tels qu’enregistrés (souvent après un `endGame` précédent). La complétion est à nouveau mise à jour en « meilleur résultat ».

Seul le **meilleur** résultat par (utilisateur, niveau) est conservé : si le joueur refait un niveau et obtient moins d’étoiles, l’enregistrement ne change pas.

---

## Données exposées (APIs)

| API | Données de scoring |
|-----|--------------------|
| **gameInstance.endGame** | En cas de complétion enregistrée : `stars`, `mandatoryGoalsMet`, `bonusGoalsMet`, `quizPassed` dans la réponse. Retourne aussi `modal` (`type`, `title`, `primaryMessage`, `secondaryMessage`) et pour chaque goal `isMandatory`. |
| **auth.getHomeData** | `lastCompletedGame.stars`, `lastCompletedGame.mandatoryGoalsMet`, `lastCompletedGame.bonusGoalsMet`, `lastCompletedGame.quizPassed` (issus de UserLevelCompletion pour la dernière partie terminée). |
| **level.getUserLevels** | Pour chaque niveau : `stars`, `unlocked`, et optionnellement `mandatoryGoalsMet`, `bonusGoalsMet`, `quizPassed`. |

---

## Côté front (mobile)

- **Résumé (summary)** : Affiche les 1–3 étoiles et les trois lignes de critères (Objectifs obligatoires, Bonus, Quiz) à partir de la réponse `endGame` ou du rafraîchissement via `getHomeData` au retour du quiz.
- **Carte niveau (LevelCard)** : Affiche 1–3 étoiles lorsque `stars` est fourni (ex. depuis `lastCompletedGame` ou `getUserLevels`).
- **Liste des niveaux** : Écran dédié alimenté par `level.getUserLevels` ; chaque niveau affiche ses étoiles et son statut verrouillé/débloqué.
- **Profil** : Bloc score (total d’étoiles, nombre de niveaux complétés) et lien vers la liste des niveaux, via `getUserLevels`.

---

## Fichiers principaux (backend)

| Rôle | Fichier |
|------|--------|
| Calcul étoiles et enregistrement complétion | [apps/backend/src/trpc/services/level-completion.service.ts](apps/backend/src/trpc/services/level-completion.service.ts) |
| Fin de partie et appel à recordFromGameEnd | [apps/backend/src/trpc/services/end-game.service.ts](apps/backend/src/trpc/services/end-game.service.ts) |
| Mise à jour après quiz (createOrUpdateParticipation, completeQuiz) | [apps/backend/src/trpc/services/user-quiz.service.ts](apps/backend/src/trpc/services/user-quiz.service.ts) |
| Liste niveaux avec étoiles | [apps/backend/src/trpc/services/level.service.ts](apps/backend/src/trpc/services/level.service.ts) (getUserLevels) |
| Données accueil avec lastCompletedGame.stars | [apps/backend/src/trpc/routers/auth.ts](apps/backend/src/trpc/routers/auth.ts) (getHomeData) |

---

## Voir aussi

- [TEST_LEVEL_STARS_BACKEND.md](TEST_LEVEL_STARS_BACKEND.md) : comment tester les étoiles côté backend (script, appels API).
- [CHANGELOG_LEVEL_STARS_AND_SETUP.md](CHANGELOG_LEVEL_STARS_AND_SETUP.md) : historique des changements (modèle, migrations, backoffice, mobile).
- [GOAL_VALIDATION.md](../apps/backend/docs/GOAL_VALIDATION.md) : validation des objectifs en fin de partie.
