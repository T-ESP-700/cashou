# Audit de la validation des objectifs (goals) — Cashou

> **But de ce document** : expliquer comment le backend valide aujourd'hui les objectifs
> de chaque niveau, montrer où la validation **ne correspond pas** à ce que le joueur lit,
> et lister ce qu'il faut créer pour corriger ça. Lisible sans connaître le code.

---

## 1. Comment un objectif est validé, en une image

```
Définition du goal (seed)                Fin de partie (backend)
┌─────────────────────────┐              ┌────────────────────────────────────────┐
│ title / description     │  ───────►    │ ces textes sont AFFICHÉS, jamais lus     │
│ successMessage / failure│   (déco)     │ par le moteur de validation              │
│                         │              │                                          │
│ goalType  : 'wallet_min'│  ───────►    │ validateGoal(goalType, goalValue, ...)   │
│ goalValue : 5100        │  (la règle)  │   → renvoie true / false                 │
└─────────────────────────┘              └────────────────────────────────────────┘
```

**Point central à retenir :** seuls deux champs pilotent la validation, `goalType` et `goalValue`.
Tout le texte (titre, description, messages) est **purement décoratif** pour le moteur.

Le code de validation est unique et centralisé :
`apps/backend/src/trpc/services/end-game.service.ts` → méthode `validateGoal()`.
Le déclenchement automatique de fin de partie (`game-end-trigger.service.ts`) appelle
le même `endGame()`, donc **une seule source de vérité**.

---

## 2. Les `goalType` que le backend sait calculer aujourd'hui

| `goalType` | Ce qu'il vérifie | `goalValue` |
|---|---|---|
| `wallet_gte_start` | total final **≥** solde de départ (+ valeur) | offset (souvent `0`) |
| `wallet_gt_start` | total final **>** solde de départ (+ valeur) | offset |
| `wallet_min` | total final **≥** un montant absolu | le montant cible (€) |
| `profit_min` | gain **≥** valeur, exprimé **en %** | pourcentage |
| `min_submarkets_invested` | nombre d'**enveloppes distinctes** investies **≥** valeur | nombre d'enveloppes |

Deux comportements implicites **dangereux** :

- `goalType` **nul** → l'objectif est considéré **réussi par défaut**.
- `goalType` **inconnu / mal orthographié** → **réussi par défaut** (`default: return true`).

> ⚠️ Conséquence : un objectif *obligatoire* dont le type est mal écrit valide le niveau
> sans rien vérifier. La doc des niveaux utilise par exemple `wallet_gte_target`, **que le
> backend ne connaît pas** ; l'équipe a dû le contourner en seedant `wallet_min`.

---

## 3. Le « total » calculé ne sait pas *où* est l'argent

À la fin de partie, le backend calcule **un seul nombre** :

```
totalValue = cash restant + valeur de tous les actifs détenus (capital + intérêts/plus-values)
```

Ce total ignore **comment** le joueur est arrivé là. Conséquence directe sur un bonus
comme « Termine avec au moins 5 100 € **grâce au fonds euros** » :

| Ce que fait le joueur | total | Bonus validé ? |
|---|---|---|
| Met tout sur le **fonds euros**, gagne ~2 % | ~5 100 € | ✅ |
| Met tout sur un **livret** | ~5 100 € | ✅ *(pourtant pas « grâce au fonds euros »)* |
| **Garde tout en cash** + un gain ailleurs | ≥ 5 100 € | ✅ |
| Investit dans le fonds euros mais finit à 5 080 € | 5 080 € | ❌ |

**Le backend valide un résultat chiffré, jamais le moyen employé.**

---

## 4. La hiérarchie des placements (indispensable pour comprendre la diversification)

```
Market (la Bourse / le marché)
└─ Submarket = ENVELOPPE        ← min_submarkets_invested compte CECI
   │  (Livrets, Assurance vie, PEA, Obligations, ETF PEA, CTO, Alternatifs)
   ├─ Field = SECTEUR / FAMILLE ← aucun goalType ne compte CECI aujourd'hui
   └─ Asset = ACTIF / TITRE      ← aucun goalType ne compte CECI aujourd'hui
      (Livret A, Fonds Euros, Apple, LVMH, OAT 10 ans...)
```

⚠️ **Piège du seed** : « Fonds Euros » et « UC » sont dans la **même** enveloppe `AV`
(Assurance vie). Donc « combiner fonds euros et UC » = **1 seule** enveloppe, pas deux.

Réponse à la question d'origine — *« comment voir si la personne a investi sur 3 choses
différentes ? »* :

- **3 enveloppes différentes** (Livret + AV + PEA) → mesurable via `min_submarkets_invested`.
- **3 actifs différents** (Apple + LVMH + Sanofi, tous dans le PEA) → **non mesurable**
  aujourd'hui : aucun `goalType` ne compte les actifs distincts.

---

## 5. État actuel des 20 niveaux

**Tous** les niveaux du seed `20lvlseed.ts` utilisent la même paire, codée en dur :

- **Objectif principal** → `wallet_gte_start` avec `goalValue: 0` (« ne pas perdre de capital »)
- **Objectif bonus** → `wallet_min` avec `goalValue: target` (« atteindre X € »)

### Sont-ils calculables ? Oui, à 100 %.
Les 40 objectifs (20 principaux + 20 bonus) reposent sur deux types gérés. Rien ne plante.

### Correspondent-ils à ce que le joueur lit ?
Pas toujours. Légende : ✅ fidèle · ⚠️ proxy partiel · 🔴 trompeur

| Niv | Principal (titre) | Adéquation | Bonus (titre) | Adéquation |
|---|---|---|---|---|
| 1 | Place ton capital sur un livret | 🔴 *(validé sans rien placer)* | Tes premiers intérêts | ✅ |
| 2 | Protège et fais fructifier | ⚠️ | Profite du taux livrets | ✅ |
| 3 | Bats l'inflation simulée | ⚠️ | Mix optimal LEP + Livret A | ⚠️ |
| 4 | Protège ton capital | ✅ | Rendement supérieur au Livret A | ✅ |
| 5 | Ne te rate pas | ✅ | Mix gagnant fonds euros + UC | ⚠️ |
| 6 | Défends ton capital | ✅ | Performance optimisée | ✅ |
| 7 | Survis à ta première bourse | ✅ | Premier gain boursier | ✅ |
| 8 | Traverse la volatilité | ✅ | Dividendes réinvestis | ✅ |
| 9 | Préserve ton patrimoine | ✅ | Encaisse les coupons | ✅ |
| 10 | Tiens la route | ✅ | Performance indicielle | ✅ |
| 11 | Élargis sans exploser | ⚠️ | Boost américain | ⚠️ |
| 12 | Évite les pièges | ✅ | Bon stock-picking | ✅ |
| 13 | Résiste aux cycles | ✅ | Bon timing sectoriel | ✅ |
| 14 | Reste discipliné | ✅ | Stratégie cohérente | ✅ |
| 15 | Traverse le drawdown | ✅ | Performance long terme | ✅ |
| 16 | **Diversification qui tient** | 🔴 *(aucune diversification testée)* | Amortis les chocs | ✅ |
| 17 | **Allocation cohérente** | 🔴 *(aucune allocation testée)* | Performance calibrée | ✅ |
| 18 | Garde le cap | ✅ | Rééquilibrage discipliné | ⚠️ |
| 19 | Survis à la crise | ✅ | Profite du rebond | ✅ |
| 20 | Finir riche | ✅ | Vraie capitalisation long terme | ✅ |

**Bilan : 40/40 calculables, mais 3 cas trompeurs (🔴) et 8 cas approximatifs (⚠️).**
Les 3 cas trompeurs sont les plus graves car le titre promet une action (placer,
diversifier, allouer) que le backend ne vérifie pas — et pour le niv 1/16/17, un joueur
peut « réussir » sans rien faire de ce qui est annoncé.

---

## 6. Les `goalType` à créer

> Toutes les données nécessaires existent déjà (`Transaction.assetId`, `Holding.quantity`,
> `Asset.submarketId` / `Asset.fieldId`). **Aucune nouvelle table** n'est requise.

| # | `goalType` | Vérifie | `goalValue` | Pourquoi le créer | Coût |
|---|---|---|---|---|---|
| 1 | `min_assets_invested` | ≥ N **actifs** distincts | N | « 3 investissements différents » au sens *titres*. | 🟢 trivial |
| 2 | `min_fields_invested` | ≥ N **secteurs** distincts | N | Vraie diversification « décorrélée » : 3 actions du même secteur ne diversifient rien. | 🟢 trivial |
| 3 | `invested_in_submarket` | a investi dans **une enveloppe précise** | cible (id/clé) | Rend vraies les promesses « grâce au fonds euros / PEA / obligations ». | 🟠 besoin champ cible |
| 4 | `min_allocation_in_submarket_pct` | ≥ X % du portefeuille dans une enveloppe | X % + cible | « grâce au… » exigeant : une vraie part, pas 10 €. | 🟠 besoin champ cible |
| 5 | `max_single_asset_pct` | **aucun** actif > X % du portefeuille | X % | Anti-concentration : « évite les pièges », « allocation cohérente ». | 🟡 calcul de ratio |

**Types existants à exploiter davantage** (rien à coder) :
- `min_submarkets_invested` → diversification par enveloppe.
- `profit_min` → « bats l'inflation », « capitalisation long terme ».

### Prérequis d'architecture pour les types ciblés (#3 et #4)
Le modèle `Goal` n'a qu'un `goalValue Float`. Il peut porter un **seuil** (« ≥ 3 ») mais
pas une **cible** (« le fonds euros »). Pour les types #3 et #4, il faut ajouter un champ :

- **Option simple** : `goalTarget String?` (ex : `"AV"`, `"PEA"`).
- **Option flexible** : `goalParams Json?` (ex : `{ "submarket": "AV", "minPct": 30 }`).

Sans ce champ, les types #3 et #4 ne sont pas réalisables.

### Cas irréductibles (à laisser en proxy assumé)
- **Niv 8 « dividendes réinvestis »** : le moteur n'a pas de mécanique de dividende
  distincte (les gains passent par le prix). Pas de vérification honnête possible.
- **Niv 18 « rééquilibrage »** : « rééquilibrer » n'a pas de définition objective fiable.
  Mieux vaut approcher l'intention via `max_single_asset_pct`.

---

## 7. Mapping cible des 20 niveaux

✅ = type existant · 🆕 = type à créer (numéro de la section 6)

| Niv | Principal — promesse | Type cible | Bonus — promesse | Type cible |
|---|---|---|---|---|
| 1 | Place ton capital | 🆕3 `invested_in_submarket` (LIVRETS) | premiers intérêts | ✅ `wallet_min` |
| 2 | protège + fructifie | ✅ `wallet_gte_start` + ✅ `profit_min` > 0 | profite du taux | ✅ `wallet_min` |
| 3 | bats l'inflation | ✅ `profit_min` (≥ taux inflation) | mix LEP + Livret A | 🆕1 `min_assets_invested` ≥ 2 |
| 4 | protège | ✅ `wallet_gte_start` | grâce au fonds euros | 🆕3 `invested_in_submarket` (AV) |
| 5 | ne te rate pas | ✅ `wallet_gte_start` | mix fonds euros + UC | 🆕2 `min_fields_invested` ≥ 2 |
| 6 | défends le capital | ✅ `wallet_gte_start` | perf optimisée | ✅ `wallet_min` |
| 7 | survis à la bourse | ✅ `wallet_gte_start` | premier gain boursier | 🆕3 `invested_in_submarket` (PEA) |
| 8 | traverse la volatilité | ✅ `wallet_gte_start` | dividendes réinvestis* | ✅ `wallet_min` *(proxy)* |
| 9 | préserve le patrimoine | ✅ `wallet_gte_start` | encaisse les coupons | 🆕3 `invested_in_submarket` (OBLIGATIONS) |
| 10 | tiens la route | ✅ `wallet_gte_start` | perf indicielle (ETF) | 🆕3 `invested_in_submarket` (ETF_PEA) |
| 11 | élargis sans exploser | ✅ `min_submarkets_invested` ≥ 3 | boost américain | 🆕3 `invested_in_submarket` (CTO) |
| 12 | évite les pièges | 🆕5 `max_single_asset_pct` ≤ 40 | bon stock-picking | ✅ `profit_min` |
| 13 | résiste aux cycles | ✅ `wallet_gte_start` | timing sectoriel | 🆕2 `min_fields_invested` |
| 14 | reste discipliné | 🆕5 `max_single_asset_pct` ≤ 30 | stratégie cohérente | ✅ `min_submarkets_invested` ≥ 4 |
| 15 | traverse le drawdown | ✅ `wallet_gte_start` | perf long terme | ✅ `profit_min` |
| 16 | diversification qui tient | ✅ `min_submarkets_invested` ≥ 4 | amortis les chocs (décorrélé) | 🆕2 `min_fields_invested` ≥ 4 |
| 17 | allocation cohérente | 🆕5 `max_single_asset_pct` ≤ 25 | perf calibrée | ✅ `profit_min` |
| 18 | garde le cap | ✅ `wallet_gte_start` | rééquilibrage* | 🆕5 `max_single_asset_pct` *(proxy)* |
| 19 | survis à la crise | ✅ `wallet_gte_start` | profite du rebond | ✅ `profit_min` |
| 20 | finir riche | ✅ `profit_min` > 0 | vraie capitalisation LT | ✅ `profit_min` = 30 |

\* proxy assumé (voir section 6).

---

## 8. Que faire, dans quel ordre

1. **Sécuriser le moteur** (rapide, gros gain) : faire échouer (`return false`) un objectif
   *obligatoire* dont le `goalType` est inconnu ou nul, au lieu de le valider par défaut.
2. **Types triviaux, sans changement de schéma** : `min_assets_invested`,
   `min_fields_invested`, `max_single_asset_pct`. Couvrent déjà 8 niveaux.
3. **Enrichir le modèle `Goal`** (`goalTarget` ou `goalParams`) pour débloquer
   `invested_in_submarket` et `min_allocation_in_submarket_pct` (promesses « grâce à… »).
4. **Refondre le seed** `20lvlseed.ts` : aujourd'hui les goals sont une paire codée en dur ;
   il faut permettre une **liste** de goals par niveau et porter `goalType` / `goalValue`
   (et la cible) dans la définition de chaque niveau.
5. **Réviser les messages** `success`/`failure` des goals dont le type change.

---

## Annexe — Fichiers concernés

| Rôle | Fichier |
|---|---|
| Moteur de validation | `apps/backend/src/trpc/services/end-game.service.ts` (`validateGoal`) |
| Déclenchement auto de fin | `apps/backend/src/trpc/services/game-end-trigger.service.ts` |
| Étoiles / complétion | `apps/backend/src/trpc/services/level-completion.service.ts` |
| Modèle de données | `packages/@cashou/db-app/prisma/schema.prisma` (`Goal`, `LevelGoal`, `Submarket`, `Asset`) |
| Seed des 20 niveaux | `apps/backend/scripts/20lvlseed.ts` |
