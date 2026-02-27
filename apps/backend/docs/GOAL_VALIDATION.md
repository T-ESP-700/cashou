# Validation des Goals - Documentation

## Résumé

Implémentation de la validation des objectifs à la fin d'un niveau.  
La logique calcule `wallet + valeur des assets` et vérifie si les conditions des goals sont remplies.

> **Note**: La fin de niveau (`endGame`) est déclenchée **manuellement** via l'API pour le moment.  
> Une intégration automatique (timer basé sur `duration`) pourra être ajoutée ultérieurement.

---

## Fichiers modifiés

### 1. Schema Prisma
**Fichier**: `packages/@cashou/db-app/prisma/schema.prisma`

```prisma
model Goal {
  // ...
  successMessage String?  @map("success_message") // Message en cas de réussite
  failureMessage String?  @map("failure_message") // Message en cas d'échec
  goalType    String?  @map("goal_type")   // Type de validation
  goalValue   Float?   @map("goal_value")  // Valeur cible
}
```

---

### 2. Seed Niveau 1
**Fichier**: `apps/backend/scripts/seed-level1.ts`

Le goal "Reste en positif" est maintenant configuré avec :
- `goalType: 'wallet_gte_start'` → wallet + assets >= startBalance
- `goalValue: 0` → pas de marge supplémentaire requise
- `successMessage` / `failureMessage` → textes affichés dans la modale de fin de partie

---

### 3. Service de fin de partie (NOUVEAU)
**Fichier**: `apps/backend/src/trpc/services/end-game.service.ts`

```typescript
async endGame(gameInstanceId: number): Promise<EndGameResult>
```

**Logique** :
1. Récupère la partie avec wallet, transactions, et goals du niveau
2. Calcule la valeur des assets (sans les vendre)
3. Calcule `totalValue = wallet + assets`
4. Valide chaque goal selon son `goalType`
5. Retourne le résultat

**Types de goals supportés** :
| goalType | Condition |
|----------|-----------|
| `wallet_gte_start` | total >= startBalance + value |
| `wallet_gt_start` | total > startBalance + value |
| `wallet_min` | total >= value |
| `profit_min` | profit% >= value |

---

### 4. Router API
**Fichier**: `apps/backend/src/trpc/routers/game-instance.router.ts`

Nouvel endpoint :
```typescript
gameInstance.endGame({ id: number })
```

---

### 5. Script de test
**Fichier**: `apps/backend/scripts/test-goal-validation.ts`

Script qui :
1. Crée une partie de test
2. Achète du Livret A
3. Appelle `endGame` et vérifie la validation
4. Nettoie les données de test

**Exécution** :
```bash
CASHOU_DB_URL="postgresql://..." bun run scripts/test-goal-validation.ts
```

---

## Comment utiliser

### Via API tRPC (mobile/frontend)
```typescript
const result = await trpc.gameInstance.endGame.mutate({ id: gameInstanceId });
// result.success = true/false
// result.goals = [{ title, isMandatory, validated }]
// result.modal = { type, title, primaryMessage, secondaryMessage }
```

### Via HTTP
```
POST /api/trpc/gameInstance.endGame
Body: { "id": 1 }
```

---

## Pour le niveau 2

Pour ajouter un goal différent au niveau 2, créer un goal avec :
```typescript
{
  title: "Fais 10% de profit",
  goalType: "profit_min",
  goalValue: 10
}
```
La logique dans `end-game.service.ts` fonctionnera sans modification.
