# Tester les étoiles par niveau (backend uniquement)

Deux façons de valider les nouvelles fonctionnalités (UserLevelCompletion, 1–3 étoiles) sans utiliser le mobile ni le backoffice.

---

## 1. Script de test (recommandé)

Un script exécute une partie de bout en bout, appelle `endGame`, puis optionnellement simule un quiz réussi, et affiche la complétion et les étoiles.

**Prérequis**

- Base app (cashou_db) avec au moins le niveau 1 seedé : `bun run db:seed:level1`
- Variables d’environnement (`.env` à la racine avec `CASHOU_DB_URL`)

**Exécution**

Depuis la racine du repo :

```bash
cd apps/backend && bunx dotenv -e ../../.env -- bun run scripts/test-level-stars.ts
```

Ou depuis `apps/backend` si `.env` est déjà chargé :

```bash
bun run scripts/test-level-stars.ts
```

**Ce que fait le script**

1. Récupère le niveau 1 et le Livret A.
2. Crée ou réutilise un utilisateur de test (`test-stars@cashou.fr`).
3. Crée une partie (game instance) avec un wallet et un holding pour que la valeur totale (wallet + actifs) soit ≥ startBalance → les objectifs sont validés à la fin de partie.
4. Appelle `EndGameService.endGame` → enregistrement dans `UserLevelCompletion` (étoiles selon objectifs obligatoires / bonus et quiz).
5. Affiche le résultat de `endGame` et la ligne `UserLevelCompletion` (stars, mandatoryGoalsMet, bonusGoalsMet, quizPassed).
6. Si un quiz existe pour le niveau 1 : crée une participation `UserQuiz` réussie et appelle `recordFromQuizComplete` → réaffiche `UserLevelCompletion` (étoiles mises à jour).
7. Appelle `LevelService.getUserLevels(userId)` et affiche les niveaux avec leurs étoiles (comme l’API).
8. Nettoie les données de test (partie, wallet, holdings, UserLevelCompletion) et conserve l’utilisateur de test pour les prochains runs.

En cas de succès, tu dois voir des étoiles 1–3 et les indicateurs (mandatoryGoalsMet, bonusGoalsMet, quizPassed) cohérents avec la partie et le quiz.

---

## 2. Bruno (ou autre client HTTP)

Tu peux aussi déclencher les mêmes flux via l’API tRPC.

**Prérequis**

- Backend lancé : `bun run dev:backend` (ou depuis `apps/backend` : `bun run dev`).
- Authentification : les appels protégés (`getHomeData`, etc.) nécessitent un cookie de session ou un token (connexion via `auth.login` puis utilisation de la session).

**Endpoints utiles**

| Action | Méthode / endpoint | Remarque |
|--------|--------------------|----------|
| Fin de partie (enregistre complétion + étoiles) | `POST` `.../api/trpc/gameInstance.endGame` | Body JSON : `{ "id": <gameInstanceId> }`. Nécessite une partie existante et terminée (objectifs validés). |
| Compléter un quiz (met à jour étoiles si succès) | `POST` `.../api/trpc/userQuiz.completeQuiz` | Body JSON : `{ "id": <userQuizId>, "isCorrect": true }`. |
| Liste des niveaux avec étoiles | `GET` `.../api/trpc/level.getUserLevels?input={"userId":"<userId>"}` | L’input doit être `{ "userId": "<cuid>" }` (string). Retourne pour chaque niveau : `stars`, `mandatoryGoalsMet`, `bonusGoalsMet`, `quizPassed`. |
| Données accueil (dernière partie + étoiles) | `GET` `.../api/trpc/auth.getHomeData` | Protégé ; retourne `lastCompletedGame.stars`, etc. |

**Exemple Bruno**

- Dossier existant : `bruno/cashou/User_Quiz/Complete Quiz.bru` (completeQuiz).
- Dossier existant : `bruno/cashou/Levels/all user levels.bru` (getUserLevels – vérifier que l’input est `userId` si le schéma attend `{ "userId": "..." }`).
- Créer une requête pour `gameInstance.endGame` avec body `{ "id": 1 }` (remplacer par un vrai `gameInstanceId` après avoir créé une partie).

Pour une vérification rapide côté back, le script (section 1) suffit ; Bruno sert à contrôler le comportement des API réelles (auth, endGame, completeQuiz, getUserLevels, getHomeData).
