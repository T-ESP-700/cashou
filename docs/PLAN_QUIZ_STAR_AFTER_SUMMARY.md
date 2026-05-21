# Mise à jour de l’étoile « quiz » après le quiz de fin de partie

## Distinction importante

- **Quiz de fin de partie (quiz du niveau)** : quiz associé à un niveau (`Quiz.levelId` renseigné). L’utilisateur y accède depuis l’écran **résumé** via « Faire le quiz du niveau ». C’est ce quiz qui doit donner l’étoile « quiz » pour le niveau.
- **Quiz du jour (daily quiz)** : quiz du jour, en général non lié à un niveau (`Quiz.levelId` null). Ne doit **pas** mettre à jour les étoiles d’un niveau.

L’écran [apps/mobile/app/(tabs)/daily-quiz.tsx](apps/mobile/app/(tabs)/daily-quiz.tsx) sert pour **les deux** (selon les paramètres de navigation). Dans les deux cas, la fin de quiz appelle `userQuiz.createOrUpdateParticipation`. La logique côté backend doit donc distinguer : **uniquement** quand le quiz complété est un **quiz de fin de partie** (quiz avec `levelId`), on met à jour la complétion du niveau.

---

## Contexte technique

- **Résumé** ([apps/mobile/app/(tabs)/summary.tsx](apps/mobile/app/(tabs)/summary.tsx)) : après une partie, l’utilisateur voit les étoiles et le bouton « Faire le quiz du niveau », qui ouvre l’écran quiz avec le `quizId` du **niveau**.
- Cet écran quiz utilise **`userQuiz.createOrUpdateParticipation`** à la fin (pas `completeQuiz`).
- **Backend** : seul **`completeQuiz`** appelle `levelCompletionService.recordFromQuizComplete()`. **`createOrUpdateParticipation`** ne le fait pas, donc l’étoile quiz n’est jamais ajoutée quand on fait le quiz de fin de partie depuis le résumé.

---

## 1. Backend : mise à jour de la complétion uniquement pour le quiz de fin de partie

**Fichier :** [apps/backend/src/trpc/services/user-quiz.service.ts](apps/backend/src/trpc/services/user-quiz.service.ts)

- Dans **`createOrUpdateParticipation`**, après création/mise à jour de la participation et `updateStreaksIfTodaysQuiz`, si **`isCorrect === true`** :
  - Récupérer le quiz : `prisma.quiz.findUnique({ where: { id: quizId }, select: { levelId: true } })`.
  - **Seulement si** `quiz?.levelId != null` (donc **quiz de fin de partie**, pas quiz du jour) : appeler **`this.levelCompletionService.recordFromQuizComplete(userId, quiz.levelId)`**.
- Ainsi, l’étoile quiz du niveau est mise à jour uniquement quand on réussit un **quiz de fin de partie** ; le quiz du jour ne déclenche pas cette mise à jour.

---

## 2. Mobile : rafraîchir les étoiles sur le résumé au retour

**Fichier :** [apps/mobile/app/(tabs)/summary.tsx](apps/mobile/app/(tabs)/summary.tsx)

- Utiliser **`useFocusEffect`** pour détecter le retour sur l’écran (ex. après avoir fait le quiz de fin de partie).
- Dans le callback : appeler **`auth.getHomeData`**. Si `lastCompletedGame?.levelId === gameInstance?.level?.id`, mettre à jour l’état affiché (étoiles et critères) avec les valeurs de `lastCompletedGame` (stars, mandatoryGoalsMet, bonusGoalsMet, quizPassed), déjà renvoyées par getHomeData à jour.

---

## Récap

| Élément | Quiz du jour | Quiz de fin de partie |
|--------|---------------|------------------------|
| Accès | Onglet / home | Résumé → « Faire le quiz du niveau » |
| `Quiz.levelId` | Souvent `null` | Renseigné (niveau concerné) |
| Après succès | Streak uniquement | Streak + **recordFromQuizComplete** (étoile quiz du niveau) |

Aucun changement de schéma DB ; uniquement extension de `createOrUpdateParticipation` et rafraîchissement du résumé au focus.
