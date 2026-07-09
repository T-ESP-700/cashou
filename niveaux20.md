# Cashou — Design pédagogique des 20 niveaux

> Document de conception. Source de vérité pour l'implémentation des `seed-levelN.ts` dans `apps/backend/scripts/`.

## Règles transverses

- **Stack strict** : chaque enveloppe (`Submarket`) introduite à un niveau reste disponible pour tous les niveaux suivants. Seeds idempotents via `findFirst({ title })` avant création.
- **Courbe de difficulté** : `duration` croît de 90 jours à 2 920 jours simulés ; `speed` décroît pour laisser plus de temps de décision aux niveaux avancés ; `startBalance` de 1 500 € à 100 000 € pour simuler une progression patrimoniale réaliste.
- **2 goals par niveau** : 1 obligatoire (`isMandatory: true`, survie) + 1 bonus (`isMandatory: false`, performance).
- **Events scénarisés** : 1 → 5 par niveau selon palier. Implémentés via `LevelEvent` (triggerPercent, position) + `Impact` (coef sur `submarketId` / `fieldId` / `assetId`).
- **Quiz MCQ** : 3 à 5 questions par niveau, ciblées sur le concept introduit. Réponse correcte seulement après validation des goals de survie.
- **Catalogue d'assets final au N°20** : ~39 assets en 6 submarkets, 8 `field` distincts.

## Principes de gamification appliqués

Le design des niveaux suit 5 principes éprouvés sur les jeux d'éducation financière (sources : 11FS, Yu-kai Chou Octalysis, étude longitudinale Wiley 2025) :

1. **Gated unlocks** — chaque niveau débloque une nouvelle enveloppe ou un nouveau type d'asset. C'est un "power-up" : le joueur ressent qu'il accède à un palier supérieur (Livret A → assurance vie → PEA → obligations → ETF → CTO → alternatifs).
2. **Hook narratif** — chaque description s'ouvre sur un enjeu concret ou une situation de vie ("Tu approches des 8 ans d'ancienneté", "Ton patrimoine sécurisé est solide"), pas sur une définition technique. La pédagogie vient ensuite.
3. **Progression visible** — `startBalance` croît de 1 500 € → 100 000 € sur 20 niveaux. Le joueur voit son patrimoine grossir, ce qui matérialise sa progression d'investisseur. `pointsRequired` joue le rôle d'XP gating (déblocage du niveau suivant).
4. **Difficulté en cycles** — chaque introduction d'enveloppe = pic de difficulté (nouvelle mécanique), suivi de 1-2 niveaux d'approfondissement où le joueur consolide. Évite le mur de complexité.
5. **Anti-sur-trading** — les goals s'appuient uniquement sur la **valeur finale du wallet** (`wallet_gte_*`), jamais sur le nombre de transactions. Ça empêche d'inciter au comportement toxique du "trading frénétique pour le dopamine hit" identifié comme dérive des apps fintech gamifiées.

## Submarkets et fields (catalogue cible)

| Submarket | Type | Field | Introduit | Assets |
|-----------|------|-------|----------:|--------|
| Livrets | SAVINGS | `livret_reglemente`, `livret_bancaire` | N°1-3 | Livret A, LDDS, LEP, Livret Jeune, CEL, PEL |
| Assurance vie | INSURANCE | `fonds_euros`, `uc` | N°4-5 | Fonds Euros Classique, Fonds Euros Dynamique, UC Actions Europe, UC Obligations, UC SCPI, UC ETF Monde |
| PEA | STOCK | `action_pea` | N°7 | TotalEnergies, LVMH, Sanofi, BNP Paribas, Danone, L'Oréal, Airbus |
| Obligations | STOCK | `obligation` | N°9 | OAT France 10 ans, OAT France 30 ans, Bund Allemagne, Corporate BBB, High Yield |
| ETF PEA | STOCK | `etf_pea` | N°10 | ETF CAC 40, ETF MSCI Europe, Amundi PEA Monde |
| CTO | STOCK | `action_us`, `etf_monde` | N°11 | Apple, Microsoft, Tesla, Nvidia, Amazon, ETF S&P 500, ETF MSCI World, ETF Émergents, ETF Nasdaq |
| Alternatifs | STOCK | `alternatif` | N°16 | SCPI directe, Crowdlending, OPCI |

## Types de goals utilisés

| goalType | goalValue | Signification |
|----------|-----------|---------------|
| `wallet_gte_start` | — | Wallet final ≥ startBalance (survie) |
| `wallet_gte_target` | montant € | Wallet final ≥ montant cible (performance) |

Les autres types (`invest_in_n_submarkets`, `hold_asset_field`) ne sont pas nécessaires pour ces 20 niveaux — on s'appuie uniquement sur la valeur finale du wallet pour éviter de complexifier le backend.

---

# Niveaux 1 à 20 — détail complet

---

## Niveau 1 — Ton premier placement : le Livret A

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 1 |
| `duration` | 90 (jours simulés) |
| `speed` | 262 800 |
| `startBalance` | 1 500 € |
| `pointsRequired` | 0 |

**Description** : Tu disposes d'un premier capital à faire fructifier. Avant la bourse, l'assurance vie ou les ETF, il y a un placement que 80% des Français possèdent : le Livret A. Capital garanti, taux réglementé révisé chaque semestre par la Banque de France, retraits libres. Ton point de départ d'investisseur.

**Enveloppes introduites** : Livrets (SAVINGS) → Livret A (rate 1.5%, plafond 22 950 €).

**Goals**
- 🟢 Obligatoire : *"Place ton capital sur un livret"* — `wallet_gte_start`
- ⭐ Bonus : *"Tes premiers intérêts"* — `wallet_gte_target` (1 505 €) — sur 90 jours à 1.5%, le Livret A rapporte ~5.50 €

**Events (1)**
1. **"Versement d'intérêts en fin d'année"** (triggerPercent: 80) — narratif : les intérêts du Livret A sont calculés par quinzaine et crédités chaque 31 décembre. Pédagogie : un placement sécurisé, c'est lent mais régulier — ne t'attends pas à devenir riche avec un livret seul.

**Quiz (3 questions)**
1. Qu'est-ce que le Livret A ?
   - Un compte courant gratuit
   - Un livret d'épargne réglementé à capital garanti, dont le taux est révisé chaque semestre ✅
   - Un placement en bourse
2. Le capital placé sur un Livret A est-il garanti ?
   - Non, il varie avec les marchés
   - Oui, il est entièrement garanti par l'État ✅
   - Seulement après 5 ans
3. Pourquoi placer son argent sur un Livret A plutôt que de le laisser dormir ?
   - Pour générer des intérêts sans risque, même modestes ✅
   - Pour spéculer sur les marchés
   - Pour éviter les impôts uniquement

---

## Niveau 2 — LDDS et intérêts composés

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 2 |
| `duration` | 180 |
| `speed` | 262 800 |
| `startBalance` | 2 500 € |
| `pointsRequired` | 5 |

**Description** : Le Livret A a un plafond (22 950 €). Heureusement, son jumeau le LDDS (Livret de Développement Durable et Solidaire) offre exactement le même taux et un plafond supplémentaire de 12 000 €. Découvre aussi le pouvoir des intérêts composés sur 6 mois.

**Enveloppes disponibles** : Livret A (rate 1.5%) + LDDS (rate 1.5%, plafond 12 000 €).

**Goals**
- 🟢 Obligatoire : *"Protège et fais fructifier ton capital"* — `wallet_gte_start`
- ⭐ Bonus : *"Profite pleinement du taux livrets"* — `wallet_gte_target` (2 518 €) — sur 180 jours à 1.5%, le rendement attendu est ~18.50 €

**Events (1)**
1. **"Révision semestrielle du taux Livret A"** (triggerPercent: 50) — le taux réglementé est révisé chaque 1er février et 1er août par la Banque de France selon une formule (inflation + taux interbancaire). Il passe de 1.5% à 1.3% pour la deuxième moitié du niveau. Impact : coef 0.87 sur `rate` des deux livrets.

**Quiz (4 questions)**
1. Quel est le plafond du Livret A ?
   - 5 000 €
   - 22 950 € ✅
   - Illimité
2. Les intérêts du Livret A et du LDDS sont-ils imposables ?
   - Oui, à 30%
   - Non, totalement exonérés d'impôt et de prélèvements sociaux ✅
   - Seulement après 8 ans
3. Qu'est-ce que l'intérêt composé ?
   - Un intérêt fixe dans le temps
   - Un intérêt qui génère lui-même des intérêts l'année suivante ✅
   - Un intérêt négatif
4. Peut-on cumuler Livret A et LDDS ?
   - Non, un seul livret réglementé par personne
   - Oui, on peut détenir les deux et profiter des deux plafonds ✅
   - Oui, mais seulement après 18 ans

---

## Niveau 3 — Diversifie tes livrets : LEP, Livret Jeune, CEL, PEL

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 3 |
| `duration` | 365 |
| `speed` | 262 800 |
| `startBalance` | 3 500 € |
| `pointsRequired` | 15 |

**Description** : Tous les livrets ne se valent pas. Le LEP rapporte 2.5% (sous condition de revenus), le Livret Jeune au moins 1.5% (12-25 ans), le CEL 1% (= 2/3 du Livret A) et le PEL nouveau 2%. Apprends à composer le mix optimal selon ton profil — et découvre les ennemis silencieux du livret : inflation et fiscalité.

**Enveloppes disponibles** : Livret A + LDDS + LEP (rate 2.5%, plafond 10 000 €), Livret Jeune (rate 1.5%, plafond 1 600 €), CEL (rate 1%, plafond 15 300 €), PEL (rate 2%, blocage 4 ans minimum).

**Goals**
- 🟢 Obligatoire : *"Bats l'inflation simulée"* — `wallet_gte_start` (narratif : 1.5% d'inflation côté pouvoir d'achat)
- ⭐ Bonus : *"Mix optimal LEP + Livret A"* — `wallet_gte_target` (3 580 €) — environ 2.3% sur 365 jours en privilégiant le LEP (2.5%) sous plafond

**Events (2)**
1. **"Le LEP devient accessible"** (triggerPercent: 30) — éligibilité confirmée par l'administration fiscale (sous plafond de revenus). Le Livret d'Épargne Populaire à 2.5% est débloqué (plafond 10 000 €). Impact narratif : nouvel asset disponible — le seul livret qui bat encore l'inflation.
2. **"Pic d'inflation à 2.5%"** (triggerPercent: 60) — narratif : le pouvoir d'achat des livrets sous 2.5% recule. Seul le LEP suit. Le Livret A à 1.5% perd 1 point en réel. Pédagogie visuelle, pas d'impact mécanique.

**Quiz (5 questions)**
1. Qu'est-ce que l'inflation ?
   - Hausse générale des prix ✅
   - Baisse des salaires
   - Une taxe
2. Un livret à 1.5% avec une inflation à 2.5%, je gagne en pouvoir d'achat...
   - +1.5%
   - -1% (je perds en réalité) ✅
   - 0%
3. Qui peut ouvrir un LEP ?
   - Tout le monde
   - Les personnes à revenus modestes sous plafond fiscal ✅
   - Uniquement les investisseurs confirmés
4. Quel est le plafond du Livret Jeune et qui peut l'ouvrir ?
   - 22 950 €, tout le monde
   - 1 600 €, les 12-25 ans ✅
   - 10 000 €, les retraités
5. Quelle est la meilleure défense contre l'inflation longue ?
   - Laisser l'argent sur un placement non rémunéré
   - Placer sur des actifs dont le rendement dépasse durablement l'inflation ✅
   - Acheter uniquement de l'or

---

## Niveau 4 — Assurance vie : fonds euros

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 4 |
| `duration` | 365 |
| `speed` | 197 100 |
| `startBalance` | 5 000 € |
| `pointsRequired` | 30 |

**Description** : Les livrets plafonnent autour de 22 950 €. Pour aller au-delà sans risquer ton capital, l'assurance vie en fonds euros est l'arme secrète des Français : capital garanti, rendement moyen 2,65% en 2025 (et jusqu'à 4% sur les meilleurs contrats), fiscalité avantageuse après 8 ans. C'est l'enveloppe la plus détenue du pays — 1 900 milliards € sous gestion.

**Enveloppes introduites** : Assurance vie (INSURANCE) → Fonds Euros Classique (rate 2.65%, frais de gestion 0.6%), Fonds Euros Dynamique « boosté » (rate 3.5%, frais de gestion 0.8%, condition : 30% min en UC).

**Goals**
- 🟢 Obligatoire : *"Protège ton capital"* — `wallet_gte_start`
- ⭐ Bonus : *"Rendement supérieur au Livret A"* — `wallet_gte_target` (5 100 €)

**Events (2)**
1. **"Hausse des taux directeurs BCE"** (triggerPercent: 40) — la BCE relève ses taux pour combattre l'inflation. Les fonds euros adossés à des obligations longues en profitent : le Fonds Euros Classique grimpe de 2.65% à 3.2%. Impact : coef 1.21 sur `rate` de `fonds_euros`.
2. **"Le piège des frais de gestion"** (triggerPercent: 75) — narratif fort : 0.8%/an de frais sur 30 ans = 25% du capital final amputé. Pédagogie : les frais paraissent petits, leur effet composé est gigantesque.

**Quiz (4 questions)**
1. Un fonds euros en assurance vie garantit-il le capital ?
   - Oui, c'est la règle du fonds en euros ✅
   - Non, jamais
   - Seulement après 8 ans
2. Quel est le rendement moyen d'un fonds euros en 2025 ?
   - 0.5%
   - 2,65% net (jusqu'à 4% sur les meilleurs contrats) ✅
   - 10%
3. Peut-on retirer son argent d'une assurance vie à tout moment ?
   - Oui, avec une fiscalité potentielle sur les gains ✅
   - Non, bloqué 8 ans
   - Uniquement en cas de décès
4. L'assurance vie est-elle un placement de court terme ?
   - Oui, idéale pour quelques mois
   - Non, c'est un placement moyen/long terme dont la fiscalité s'optimise après 8 ans ✅
   - Peu importe la durée

---

## Niveau 5 — Unités de compte : passe la vitesse supérieure

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 5 |
| `duration` | 548 |
| `speed` | 197 100 |
| `startBalance` | 7 500 € |
| `pointsRequired` | 50 |

**Description** : Le fonds euros c'est bien, mais son rendement plafonne. Les Unités de Compte (UC) ouvrent la porte à des placements plus rémunérateurs... au prix d'un risque en capital.

**Enveloppes disponibles** : AV + UC Actions Europe, UC Obligations, UC SCPI, UC ETF Monde.

**Goals**
- 🟢 Obligatoire : *"Ne te rate pas"* — `wallet_gte_start`
- ⭐ Bonus : *"Mix gagnant fonds euros + UC"* — `wallet_gte_target` (7 800 €, ~4%)

**Events (2)**
1. **"Coup de boost sur l'Europe"** (triggerPercent: 35) — la BCE rassure, le CAC 40 s'envole : UC Actions Europe +12%. Impact : coef 1.12 sur l'asset.
2. **"Vent contraire : les actions plient"** (triggerPercent: 70) — résultats trimestriels décevants : UC Actions Europe et UC ETF Monde -8%. Impact : coef 0.92 sur le `field` uc (actions).

**Quiz (4 questions)**
1. Qu'est-ce qu'une UC (Unité de Compte) ?
   - Une part d'un placement (ETF, SCPI, OPCVM) logée dans l'assurance vie ✅
   - Un livret bancaire
   - Un crédit
2. Le capital d'une UC est-il garanti ?
   - Oui
   - Non, il varie avec les marchés sous-jacents ✅
   - Oui mais seulement après 8 ans
3. Pourquoi mélanger fonds euros et UC ?
   - Pour équilibrer sécurité et performance selon son profil ✅
   - Parce que c'est obligatoire
   - Sans raison particulière
4. Qu'est-ce qu'une SCPI ?
   - Un placement immobilier via une société civile qui détient des biens loués ✅
   - Une action cotée en bourse
   - Un livret bancaire

---

## Niveau 6 — Le cap fatidique des 8 ans

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 6 |
| `duration` | 548 |
| `speed` | 197 100 |
| `startBalance` | 10 000 € |
| `pointsRequired` | 75 |

**Description** : Ton assurance vie approche des 8 ans d'ancienneté : un cap fiscal décisif. Comprends pourquoi cette enveloppe est un pilier du patrimoine français.

**Enveloppes disponibles** : AV complète (fonds euros + toutes UC).

**Goals**
- 🟢 Obligatoire : *"Défends ton capital"* — `wallet_gte_start`
- ⭐ Bonus : *"Performance optimisée"* — `wallet_gte_target` (10 400 €, 4%)

**Events (2)**
1. **"Réforme fiscale : PFU 30%"** (triggerPercent: 30) — narratif : les gains hors abattement sont taxés à 30%. Pas d'impact direct sur les assets.
2. **"Ton assurance vie atteint 8 ans"** (triggerPercent: 65) — narratif déclencheur : abattement annuel de 4 600 € sur les gains débloqué.

**Quiz (5 questions)**
1. Quelle est la durée clé de l'assurance vie pour la fiscalité ?
   - 4 ans
   - 8 ans ✅
   - 15 ans
2. Abattement annuel sur les gains d'une assurance vie de plus de 8 ans (personne seule) ?
   - 0 €
   - 4 600 € ✅
   - 10 000 €
3. Qu'est-ce que le PFU ?
   - Le Prélèvement Forfaitaire Unique de 30% sur les gains ✅
   - Un livret
   - Un impôt sur la fortune
4. L'assurance vie est-elle un bon outil de transmission ?
   - Oui, elle offre des avantages successoraux importants ✅
   - Non
   - Seulement pour le conjoint
5. Les rachats partiels sont-ils possibles pendant la vie du contrat ?
   - Oui, à tout moment ✅
   - Non, jamais
   - Seulement après 8 ans

---

## Niveau 7 — Bienvenue en bourse : ouvre ton PEA

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 7 |
| `duration` | 730 |
| `speed` | 197 100 |
| `startBalance` | 12 500 € |
| `pointsRequired` | 110 |

**Description** : Ton patrimoine sécurisé est solide. Place maintenant une partie sur des actions via le PEA, l'enveloppe fiscale française conçue pour investir en Europe.

**Enveloppes introduites** : PEA (STOCK, field `action_pea`) → TotalEnergies, LVMH, Sanofi, BNP Paribas.

**Goals**
- 🟢 Obligatoire : *"Survis à ta première bourse"* — `wallet_gte_start`
- ⭐ Bonus : *"Premier gain boursier"* — `wallet_gte_target` (13 500 €, 8%)

**Events (2)**
1. **"Publication des résultats LVMH"** (triggerPercent: 30) — +8% sur LVMH. Impact : coef 1.08 sur l'asset.
2. **"Grève dans le secteur de l'énergie"** (triggerPercent: 65) — -10% sur TotalEnergies. Impact : coef 0.90.

**Quiz (4 questions)**
1. Qu'est-ce que le PEA ?
   - Un livret d'épargne
   - Un Plan d'Épargne en Actions avec avantage fiscal après 5 ans ✅
   - Une assurance vie
2. Quel est le plafond de versement du PEA ?
   - 22 950 €
   - 150 000 € ✅
   - 1 million €
3. Que peut-on loger dans un PEA ?
   - Des actions européennes et certains ETF éligibles ✅
   - De l'or et des cryptos
   - Des obligations d'État américain
4. Après combien d'années les gains sont-ils exonérés d'impôt sur le revenu (hors prélèvements sociaux) ?
   - 2 ans
   - 5 ans ✅
   - 10 ans

---

## Niveau 8 — Plus-value et dividende : la double rente

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 8 |
| `duration` | 730 |
| `speed` | 197 100 |
| `startBalance` | 15 000 € |
| `pointsRequired` | 150 |

**Description** : Une action, c'est deux sources de gain : la plus-value et le dividende. Apprends à les distinguer et à composer un portefeuille qui paie.

**Enveloppes disponibles** : PEA (+ Danone, L'Oréal, Airbus ajoutés).

**Goals**
- 🟢 Obligatoire : *"Traverse la volatilité"* — `wallet_gte_start`
- ⭐ Bonus : *"Dividendes réinvestis"* — `wallet_gte_target` (16 500 €, 10%)

**Events (3)**
1. **"Saison des dividendes"** (triggerPercent: 25) — versements : TotalEnergies +5%, Danone +3%, BNP Paribas +4%. Impact : coefs différenciés sur chaque asset.
2. **"Scandale comptable L'Oréal"** (triggerPercent: 55) — -15% sur L'Oréal. Impact : coef 0.85.
3. **"Rebond du secteur luxe"** (triggerPercent: 80) — LVMH +12%. Impact : coef 1.12.

**Quiz (5 questions)**
1. Qu'est-ce qu'un dividende ?
   - Une partie du bénéfice de l'entreprise redistribuée aux actionnaires ✅
   - Un intérêt fixe garanti
   - Un impôt
2. Plus-value vs dividende : quelle différence ?
   - Aucune, c'est la même chose
   - Plus-value = différence achat/vente ; dividende = distribution régulière du bénéfice ✅
   - L'inverse
3. Toutes les actions versent-elles des dividendes ?
   - Oui, toujours
   - Non, certaines réinvestissent tout leurs bénéfices (croissance) ✅
   - Seulement les actions US
4. Les dividendes perçus dans un PEA sont-ils taxés immédiatement ?
   - Oui, à chaque versement
   - Non, tant que l'argent reste dans le PEA ✅
   - Seulement après 8 ans
5. Une action qui monte de 10% m'a-t-elle rapporté 10% ?
   - Oui, immédiatement
   - Seulement si je vends (plus-value latente sinon) ✅
   - Jamais

---

## Niveau 9 — Obligations : le coupon contre la volatilité

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 9 |
| `duration` | 730 |
| `speed` | 197 100 |
| `startBalance` | 18 000 € |
| `pointsRequired` | 195 |

**Description** : Les actions montent et descendent. Les obligations, elles, paient un coupon régulier. Découvre ce pilier de la diversification et ses subtilités (duration, défaut, notation).

**Enveloppes introduites** : Obligations (STOCK, field `obligation`) → OAT France 10 ans (rate 3.4%), OAT France 30 ans (rate 3.8%, duration longue), Bund Allemagne 10 ans (rate 2.8%), Obligation d'entreprise solide "Corporate BBB" (rate 4.5%), Obligation à haut rendement "High Yield" (rate 7.5%, risquée).

**Goals**
- 🟢 Obligatoire : *"Préserve ton patrimoine"* — `wallet_gte_start`
- ⭐ Bonus : *"Encaisse les coupons"* — `wallet_gte_target` (18 720 €, 4%)

**Events (3)**
1. **"Hausse des taux directeurs BCE"** (triggerPercent: 20) — OAT 30 ans -12%, OAT 10 ans -5%, Corporate BBB -6%. Impacts : coefs par asset.
2. **"Faillite : ton High Yield s'effondre"** (triggerPercent: 50) — l'émetteur ne peut plus rembourser : -30% sur l'obligation High Yield. Pédagogie : 7.5% de coupon = prime de risque, pas un cadeau. Impact : coef 0.70.
3. **"Baisse des taux en fin de cycle"** (triggerPercent: 80) — OAT 30 ans +8%, OAT 10 ans +3%. Impacts : remontée.

**Quiz (5 questions)**
1. Qu'est-ce qu'une obligation ?
   - Un titre de dette (je prête à un État ou une entreprise) ✅
   - Une action
   - Un livret d'épargne
2. Quand les taux d'intérêt montent, le prix des obligations existantes...
   - Monte
   - Baisse (les nouvelles obligations offrent mieux) ✅
   - Reste stable
3. Qu'est-ce que la duration d'une obligation ?
   - Sa durée de vie
   - Sa sensibilité à une variation des taux d'intérêt ✅
   - Son rendement annuel
4. Une obligation "High Yield" est-elle sans risque ?
   - Oui
   - Non, haut rendement = risque de défaut élevé ✅
   - Peu importe
5. Le coupon d'une obligation classique (taux fixe) est-il connu à l'avance ?
   - Oui, c'est son principal avantage ✅
   - Non, il varie chaque mois
   - Jamais

---

## Niveau 10 — ETF : la révolution silencieuse

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 10 |
| `duration` | 730 |
| `speed` | 157 680 |
| `startBalance` | 22 000 € |
| `pointsRequired` | 245 |

**Description** : Acheter une seule action = concentrer le risque. Un ETF te fait investir en un clic dans des centaines d'entreprises, à frais très réduits. La révolution discrète de l'investissement moderne.

**Enveloppes introduites** : ETF éligibles PEA (STOCK, field `etf_pea`) → ETF CAC 40, ETF MSCI Europe, Amundi PEA Monde (synthétique, éligible PEA).

**Goals**
- 🟢 Obligatoire : *"Tiens la route"* — `wallet_gte_start`
- ⭐ Bonus : *"Performance indicielle"* — `wallet_gte_target` (23 760 €, 8%)

**Events (3)**
1. **"Rallye européen"** (triggerPercent: 20) — ETF MSCI Europe +10%. Impact : coef 1.10.
2. **"Correction sectorielle"** (triggerPercent: 50) — ETF CAC 40 -6%. Impact : coef 0.94.
3. **"L'arme des frais ultra-bas"** (triggerPercent: 75) — l'Amundi PEA Monde affiche 0.2% de frais quand un fonds actif comparable est à 1.5%. Sur 30 ans, ça change tout : -1.3%/an composé = -32% de capital final. Pédagogie : le coût caché qui mange ta retraite.

**Quiz (5 questions)**
1. Qu'est-ce qu'un ETF ?
   - Un fonds qui réplique automatiquement un indice boursier ✅
   - Une action individuelle
   - Un livret
2. Quelle est la principale différence entre un ETF et un fonds actif ?
   - ETF = frais élevés
   - ETF = frais très réduits grâce à la réplication passive ✅
   - Aucune différence
3. Un ETF CAC 40 me fait investir dans...
   - 40 entreprises au hasard
   - Les 40 plus grandes entreprises françaises cotées ✅
   - 40 pays
4. Les ETF sont-ils tous éligibles au PEA ?
   - Tous
   - Seulement ceux éligibles PEA (actions européennes ou synthétiques dédiés) ✅
   - Aucun
5. Avec un ETF Monde (MSCI ACWI), dans combien d'entreprises investis-tu ?
   - 40
   - Plus de 1 500 sur plusieurs dizaines de pays ✅
   - 10

---

## Niveau 11 — Le CTO : sans plafond, le monde s'ouvre

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 11 |
| `duration` | 730 |
| `speed` | 157 680 |
| `startBalance` | 26 000 € |
| `pointsRequired` | 300 |

**Description** : Le PEA se limite à l'Europe. Pour accéder aux géants américains et aux ETF mondiaux non-PEA, ouvre un Compte-Titres Ordinaire (CTO). Moins avantageux fiscalement, mais sans limites.

**Enveloppes introduites** : CTO (STOCK, fields `action_us` + `etf_monde`) → Apple, Microsoft, Tesla, Nvidia, Amazon ; ETF S&P 500, ETF MSCI World, ETF Émergents, ETF Nasdaq.

**Goals**
- 🟢 Obligatoire : *"Élargis sans exploser"* — `wallet_gte_start`
- ⭐ Bonus : *"Boost américain"* — `wallet_gte_target` (28 080 €, 8%)

**Events (3)**
1. **"Keynote Apple"** (triggerPercent: 25) — +7% sur Apple. Impact : coef 1.07.
2. **"Baisse du dollar"** (triggerPercent: 50) — -3% sur tous les assets USD (field `action_us` et `etf_monde`). Impact : coef 0.97 sur les fields.
3. **"Explosion du secteur tech"** (triggerPercent: 75) — ETF Nasdaq +12%, Apple +10%, Microsoft +9%. Impacts par asset.

**Quiz (5 questions)**
1. Quand faut-il utiliser un CTO plutôt qu'un PEA ?
   - Pour investir hors actions européennes (US, ETF Monde, Nasdaq) ✅
   - Tout le temps
   - Jamais
2. La fiscalité du CTO est-elle avantageuse ?
   - Oui, totalement exonérée
   - Non, PFU de 30% sur les gains et dividendes ✅
   - Oui, comme l'assurance vie
3. Pourquoi un ETF MSCI World standard n'est-il pas éligible au PEA ?
   - Parce qu'il contient des actions non-européennes ✅
   - Parce qu'il est trop cher
   - Parce qu'il est américain
4. Le PEA a-t-il un plafond de versements ?
   - Non, illimité
   - Oui, 150 000 € ✅
   - Oui, 1 million €
5. Que faire quand on atteint le plafond PEA ?
   - Ouvrir un CTO pour continuer à investir ✅
   - Arrêter d'investir
   - Payer une pénalité

---

## Niveau 12 — PER, capi, dividend yield : pense comme un analyste

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 12 |
| `duration` | 1 095 |
| `speed` | 157 680 |
| `startBalance` | 30 000 € |
| `pointsRequired` | 360 |

**Description** : Sélectionner une action, ce n'est pas au hasard. PER, capitalisation, dividende yield : apprends les ratios que regardent les pros pour distinguer une action chère d'une bonne affaire.

**Enveloppes disponibles** : PEA + CTO (stack complet).

**Goals**
- 🟢 Obligatoire : *"Évite les pièges"* — `wallet_gte_start`
- ⭐ Bonus : *"Bon stock-picking"* — `wallet_gte_target` (31 800 €, 6%)

**Events (3)**
1. **"Résultats Microsoft exceptionnels"** (triggerPercent: 25) — +10% sur Microsoft, +2% sur Apple (mitigé). Impacts différenciés.
2. **"Tesla jugé surcoté par les analystes"** (triggerPercent: 50) — -15% sur Tesla (PER jugé excessif). Impact : coef 0.85.
3. **"Dividende exceptionnel Danone"** (triggerPercent: 80) — rendement dividende 4%. Impact : coef 1.04 sur l'asset.

**Quiz (5 questions)**
1. Qu'est-ce que le PER (Price Earnings Ratio) ?
   - Un ratio cours de l'action / bénéfice par action ✅
   - Un impôt
   - Une obligation
2. Une action avec un PER de 50 est-elle bon marché ?
   - Oui, toujours
   - Non, c'est cher (typique des actions de forte croissance) ✅
   - Peu importe
3. Qu'est-ce que la capitalisation boursière d'une entreprise ?
   - La valeur de tous ses actifs
   - Le prix de son action multiplié par le nombre d'actions en circulation ✅
   - Son dividende annuel
4. Le rendement du dividende (dividend yield) se calcule comment ?
   - Dividende annuel / cours de l'action ✅
   - Cours de l'action / dividende
   - Dividende × nombre d'actions
5. Un "dividend yield" très élevé (10%+) est-il toujours un bon signal ?
   - Oui, toujours
   - Non, parfois c'est un piège : entreprise en difficulté, dividende non soutenable ✅
   - C'est inutile de regarder

---

## Niveau 13 — Cycliques vs défensifs : lis l'économie

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 13 |
| `duration` | 1 095 |
| `speed` | 157 680 |
| `startBalance` | 35 000 € |
| `pointsRequired` | 425 |

**Description** : Tous les secteurs ne réagissent pas pareil aux phases du cycle économique. Techno, luxe, énergie, santé, banques : apprends à mixer pour ne pas dépendre d'une seule dynamique.

**Enveloppes disponibles** : PEA + CTO.

**Goals**
- 🟢 Obligatoire : *"Résiste aux cycles"* — `wallet_gte_start`
- ⭐ Bonus : *"Bon timing sectoriel"* — `wallet_gte_target` (37 450 €, 7%)

**Events (3)**
1. **"Reprise économique forte"** (triggerPercent: 20) — cycliques explosent : BNP +12%, Airbus +10%, LVMH +8%. Défensifs stables : Sanofi +2%. Impacts par asset.
2. **"Crainte de récession"** (triggerPercent: 55) — cycliques -10%, défensifs (Sanofi, Danone) +3%. Message pédagogique : diversifier par secteur.
3. **"Effondrement du pétrole"** (triggerPercent: 80) — TotalEnergies -8%. Impact : coef 0.92.

**Quiz (5 questions)**
1. Que sont les secteurs dits "défensifs" ?
   - Santé, consommation courante, services essentiels ✅
   - Technologie, luxe, mines
   - Cryptomonnaies
2. Les secteurs cycliques...
   - Montent et baissent avec les phases de l'économie ✅
   - Sont stables toute l'année
   - Versent toujours des dividendes
3. En récession, quel type d'action résiste généralement mieux ?
   - Les actions défensives ✅
   - Les actions cycliques
   - Les obligations High Yield
4. Diversifier son portefeuille par secteur, c'est...
   - Une mauvaise idée
   - Réduire le risque spécifique à un secteur ✅
   - Garantir des gains
5. Une action "value" est...
   - Toujours risquée
   - Une action jugée sous-évaluée par rapport à ses fondamentaux ✅
   - Une obligation déguisée

---

## Niveau 14 — DCA, Value, Lazy : trouve ton style

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 14 |
| `duration` | 1 095 |
| `speed` | 131 400 |
| `startBalance` | 42 000 € |
| `pointsRequired` | 495 |

**Description** : DCA (investir régulièrement), value (chasser les bonnes affaires), lazy (ETF larges et patience) : trois approches éprouvées. Teste-les et trouve celle qui colle à ton tempérament.

**Enveloppes disponibles** : tout.

**Goals**
- 🟢 Obligatoire : *"Reste discipliné"* — `wallet_gte_start`
- ⭐ Bonus : *"Stratégie cohérente"* — `wallet_gte_target` (45 360 €, 8%)

**Events (3)**
1. **"Forte volatilité marché"** (triggerPercent: 20) — ETF MSCI World -8% puis +10% en rebond. Enseigne le DCA (moyenner à la baisse).
2. **"Rallye value"** (triggerPercent: 55) — Sanofi +10%, Danone +8% (sous-évaluées et sélectionnées).
3. **"Boom tech persistant"** (triggerPercent: 80) — ETF Nasdaq +15%, Nvidia +20% (lazy investing sur indices tech).

**Quiz (5 questions)**
1. Qu'est-ce que le DCA (Dollar Cost Averaging) ?
   - Investir un montant fixe à intervalles réguliers (mensuel, trimestriel) ✅
   - Un indice boursier
   - Un type de crédit
2. Quel est le principal avantage du DCA ?
   - Lisser le prix d'achat moyen face à la volatilité ✅
   - Garantir des gains
   - Éviter les impôts
3. Le "value investing", c'est quoi ?
   - Acheter des actions chères en croissance
   - Acheter des actions jugées sous-évaluées par rapport à leurs fondamentaux ✅
   - Faire du trading rapide
4. Le "lazy investing" privilégie...
   - Le stock-picking actif et quotidien
   - Quelques ETF larges diversifiés, peu chers, tenus dans le temps ✅
   - Les cryptomonnaies exclusivement
5. Quelle stratégie est la plus simple et éprouvée pour un débutant ?
   - Trading haute fréquence
   - Lazy investing + DCA ✅
   - Options et leviers

---

## Niveau 15 — Drawdown -30% : tu vas le vivre

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 15 |
| `duration` | 1 460 |
| `speed` | 131 400 |
| `startBalance` | 50 000 € |
| `pointsRequired` | 570 |

**Description** : Un drawdown de -30% est banal sur les marchés actions. Ce qui compte, ce n'est pas d'éviter les baisses (impossible), c'est d'avoir l'horizon pour les traverser.

**Enveloppes disponibles** : tout.

**Goals**
- 🟢 Obligatoire : *"Traverse le drawdown"* — `wallet_gte_start`
- ⭐ Bonus : *"Performance long terme"* — `wallet_gte_target` (54 000 €, 8%)

**Events (3)**
1. **"Chute brutale de l'ETF Monde"** (triggerPercent: 30) — ETF MSCI World -20% (drawdown sévère). Impact : coef 0.80.
2. **"Fuite vers les obligations"** (triggerPercent: 55) — OAT 10 ans +3% (safe haven). Impact : coef 1.03.
3. **"Rebond sur 6 mois simulés"** (triggerPercent: 80) — ETF MSCI World +25% depuis le point bas. Impact : coef 1.25.

**Quiz (5 questions)**
1. Qu'est-ce que le drawdown ?
   - La plus grosse chute enregistrée depuis un sommet de marché ✅
   - Le dividende annuel
   - Les frais de gestion
2. Un drawdown de -30% sur les actions est-il rare ?
   - Jamais vu
   - Non, ça arrive régulièrement (2000, 2008, 2020...) ✅
   - Impossible
3. Un horizon de placement long permet quoi ?
   - D'encaisser la volatilité et viser les rendements historiques des actions ✅
   - D'éliminer totalement tout risque
   - De gagner à coup sûr
4. La volatilité est-elle synonyme de perte ?
   - Oui
   - Non, c'est une mesure de variation (à la hausse comme à la baisse) ✅
   - Peu importe
5. Quel horizon minimum recommande-t-on pour investir en actions ?
   - 1 an
   - 5 à 8 ans minimum ✅
   - 3 mois

---

## Niveau 16 — Le secret des pros : la décorrélation

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 16 |
| `duration` | 1 460 |
| `speed` | 131 400 |
| `startBalance` | 60 000 € |
| `pointsRequired` | 650 |

**Description** : Diversifier, ce n'est pas "acheter beaucoup d'actions". C'est combiner des actifs qui ne bougent pas ensemble. Découvre l'immobilier papier (SCPI), le crowdlending, les OPCI pour sophistiquer ton allocation.

**Enveloppes introduites** : Alternatifs (STOCK, field `alternatif`) → SCPI directe, Crowdlending, OPCI.

**Goals**
- 🟢 Obligatoire : *"Diversification qui tient"* — `wallet_gte_start`
- ⭐ Bonus : *"Amortis les chocs"* — `wallet_gte_target` (64 800 €, 8%)

**Events (3)**
1. **"Choc immo : les SCPI tanguent"** (triggerPercent: 25) — vacance locative en hausse, valorisations révisées : SCPI directe -8%, UC SCPI -7%. Impact : coef 0.92-0.93 sur field immobilier.
2. **"Ton portefeuille amortit le choc"** (triggerPercent: 50) — pendant que l'immo souffre, les actions tiennent : ETF MSCI World +5%. La décorrélation paie. Impact : coef 1.05.
3. **"Nouvelle vague de hausse des taux"** (triggerPercent: 75) — la BCE durcit encore : obligations longues -6%, SCPI -4%, livrets et fonds euros inchangés. Impacts par field.

**Quiz (5 questions)**
1. Qu'est-ce que la corrélation entre deux actifs ?
   - Une mesure statistique de leur tendance à bouger ensemble ✅
   - Leur rendement combiné
   - Leur prix moyen
2. Pour bien diversifier, quelle corrélation recherche-t-on ?
   - Proche de +1 (parfaitement synchronisés)
   - Proche de 0 ou négative (indépendants ou opposés) ✅
   - +2 (ça n'existe pas)
3. Actions et obligations ont historiquement une corrélation...
   - Toujours fortement positive
   - Souvent faible, parfois négative (surtout en crise) ✅
   - Toujours à +1
4. Qu'est-ce qu'une SCPI ?
   - Une action cotée
   - Une société civile qui détient et loue de l'immobilier, distribue les loyers ✅
   - Un livret
5. Diversifier signifie...
   - Acheter plus de la même action
   - Répartir sur plusieurs classes d'actifs peu corrélées ✅
   - Faire plus de trades

---

## Niveau 17 — Quel investisseur es-tu ?

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 17 |
| `duration` | 1 825 |
| `speed` | 131 400 |
| `startBalance` | 70 000 € |
| `pointsRequired` | 735 |

**Description** : Il n'y a pas d'allocation universelle. À 25 ans, tu peux encaisser du risque. À 60 ans, tu sécurises. Apprends à ajuster ton portefeuille à ton âge, ton horizon et ta tolérance.

**Enveloppes disponibles** : tout.

**Goals**
- 🟢 Obligatoire : *"Allocation cohérente"* — `wallet_gte_start`
- ⭐ Bonus : *"Performance calibrée"* — `wallet_gte_target` (75 600 €, 8%)

**Events (3)**
1. **"Marché haussier"** (triggerPercent: 20) — actions +10%, obligations +1%. Le profil dynamique gagne plus. Impacts par field.
2. **"Choc intermédiaire"** (triggerPercent: 50) — actions -12%, obligations +4%. Le profil prudent souffre moins.
3. **"Stabilisation"** (triggerPercent: 80) — retour à la moyenne, l'équilibré ressort gagnant long terme.

**Quiz (5 questions)**
1. Profil prudent : quelle allocation actions typique ?
   - 0-20% ✅
   - 50-70%
   - 100%
2. Profil dynamique : quelle allocation actions ?
   - 0-20%
   - 70-100% ✅
   - 30%
3. La règle "110 - âge" sert à quoi ?
   - Estimer l'allocation actions recommandée selon l'âge ✅
   - Calculer l'âge de départ à la retraite
   - Fixer le taux du Livret A
4. Un jeune de 25 ans devrait avoir plutôt...
   - Plus d'actions (horizon long, peut encaisser la volatilité) ✅
   - Plus d'obligations
   - 100% en livrets
5. L'allocation dépend de quoi ?
   - Seulement l'âge
   - Âge + horizon + tolérance au risque + objectifs patrimoniaux ✅
   - Du hasard

---

## Niveau 18 — Discipline > intuition : l'art du rééquilibrage

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 18 |
| `duration` | 1 825 |
| `speed` | 131 400 |
| `startBalance` | 80 000 € |
| `pointsRequired` | 825 |

**Description** : Ton allocation cible dérive avec le temps : la part gagnante gonfle, la perdante rétrécit. Le rééquilibrage périodique ramène le portefeuille à sa cible. Discipline > intuition.

**Enveloppes disponibles** : tout.

**Goals**
- 🟢 Obligatoire : *"Garde le cap"* — `wallet_gte_start`
- ⭐ Bonus : *"Rééquilibrage discipliné"* — `wallet_gte_target` (86 400 €, 8%)

**Events (3)**
1. **"Bulle tech : ton portefeuille gonfle"** (triggerPercent: 25) — IA, semiconducteurs, hype : ETF Nasdaq +25%, Nvidia +30%. La part actions US explose ton allocation cible. Impacts par asset.
2. **"Le moment de vérité : rééquilibrer"** (triggerPercent: 50) — narratif déclencheur : vends tes gagnants (tech) pour racheter le sous-pondéré (obligations). Contre-intuitif, mais c'est la discipline qui paie.
3. **"La tech corrige : qui a gardé son cap ?"** (triggerPercent: 80) — ETF Nasdaq -15%. Ceux qui ont rééquilibré ont sécurisé leurs gains avant la chute. Les autres regardent leur portefeuille fondre. Impact : coef 0.85.

**Quiz (5 questions)**
1. Qu'est-ce que le rééquilibrage de portefeuille ?
   - Ramener chaque classe d'actifs à son poids cible initial ✅
   - Tout vendre et racheter
   - Ne rien faire
2. À quelle fréquence rééquilibrer ?
   - Tous les jours
   - Annuellement ou quand un seuil (±5%) est franchi ✅
   - Jamais
3. Le rééquilibrage systématique revient à...
   - Acheter au plus haut et vendre au plus bas
   - Vendre les gagnants (qui ont monté) et racheter les perdants (qui ont baissé) ✅
   - Ne rien changer
4. Dans un PEA, vendre pour rééquilibrer déclenche-t-il l'impôt ?
   - Oui, systématiquement
   - Non, tant que l'argent reste dans le PEA ✅
   - Parfois
5. Pourquoi le rééquilibrage aide psychologiquement ?
   - Pour suivre la foule
   - Pour rester discipliné et éviter le biais de sur-exposition émotionnelle ✅
   - Pour stresser davantage

---

## Niveau 19 — Krach, panique, sang-froid

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 19 |
| `duration` | 1 825 |
| `speed` | 105 120 |
| `startBalance` | 90 000 € |
| `pointsRequired` | 920 |

**Description** : Krach 2008, Covid 2020, guerre commerciale : les crises sont inévitables. Ce qui fait la différence, c'est ta réaction. Sang-froid, discipline, achat à la baisse : applique ce que tu sais.

**Enveloppes disponibles** : tout.

**Goals**
- 🟢 Obligatoire : *"Survis à la crise"* — `wallet_gte_start`
- ⭐ Bonus : *"Profite du rebond"* — `wallet_gte_target` (99 000 €, 10% malgré la crise)

**Events (4)**
1. **"Krach boursier mondial"** (triggerPercent: 15) — tous les ETF actions et actions individuelles -30%. Fonds euros +1% (refuge). Impacts par field actions.
2. **"Intervention des banques centrales"** (triggerPercent: 35) — -5% supplémentaire sur obligations longues (duration sensible), puis stabilisation.
3. **"Phase de rebond"** (triggerPercent: 65) — actions +25% depuis le bas. Le joueur qui a acheté à la baisse gagne. Impact : coef 1.25.
4. **"Nouveau cycle haussier"** (triggerPercent: 90) — ETF MSCI World +15%, actions tech +20%. Impacts.

**Quiz (5 questions)**
1. Que faut-il éviter pendant un krach ?
   - Tout vendre en panique et cristalliser ses pertes ✅
   - Garder son cap et acheter à la baisse
   - Analyser froidement la situation
2. Combien de temps dure en moyenne un krach + sa récupération complète ?
   - Quelques jours
   - 1 à 3 ans en moyenne sur les marchés actions ✅
   - 20 ans
3. Le fonds euros pendant un krach boursier ?
   - Chute avec les marchés
   - Reste stable grâce à la garantie de l'assureur ✅
   - Double de valeur
4. "Buy the dip" signifie...
   - Acheter quand les prix chutent fortement pour profiter du rebond ✅
   - Vendre au sommet
   - Ne rien faire
5. Quel est le plus gros risque pendant une crise ?
   - Les marchés eux-mêmes
   - Ses propres émotions (panique, biais cognitifs) ✅
   - Les banques centrales

---

## Niveau 20 — 8 ans pour bâtir ton patrimoine

| Paramètre | Valeur |
|-----------|-------:|
| `number` | 20 |
| `duration` | 2 920 (8 ans simulés) |
| `speed` | 105 120 |
| `startBalance` | 100 000 € |
| `pointsRequired` | 1 020 |

**Description** : Tu maîtrises les enveloppes, les classes d'actifs, les stratégies, la psychologie. Reste à appliquer sur 8 ans simulés : traverser les cycles économiques complets et voir la puissance de l'intérêt composé.

**Enveloppes disponibles** : tout (stack complet).

**Goals**
- 🟢 Obligatoire : *"Finir riche"* — `wallet_gte_start`
- ⭐ Bonus : *"Vraie capitalisation long terme"* — `wallet_gte_target` (130 000 €, +30% sur 8 ans ≈ 3.3%/an net)

**Events (5)**
1. **"Cycle 1 — Expansion"** (triggerPercent: 15) — actions +12%, obligations stables. Impacts.
2. **"Cycle 2 — Pic d'inflation"** (triggerPercent: 30) — obligations longues -8%, actions +5%, fonds euros +2%. Impacts par field.
3. **"Cycle 3 — Récession modérée"** (triggerPercent: 50) — actions -15%, obligations +5% (fuite vers qualité). Impacts par field.
4. **"Cycle 4 — Reprise durable"** (triggerPercent: 70) — actions +20%, obligations +3%. Impacts par field.
5. **"Cycle 5 — Nouveau cycle"** (triggerPercent: 90) — actions +10%, obligations +2%, convergence.

**Quiz (5 questions)**
1. Sur 20 ans, quel actif a historiquement offert le meilleur rendement annualisé ?
   - Livret A (2-3%)
   - Actions via ETF World (7-8% historiquement) ✅
   - Or (4-5%)
2. À 7% par an, l'intérêt composé double un capital en environ...
   - 20 ans
   - 10 ans (règle des 72) ✅
   - Jamais
3. Pourquoi est-il crucial d'investir tôt ?
   - Parce que les marchés baissent plus tard
   - Parce que l'intérêt composé amplifie le capital de manière exponentielle avec le temps ✅
   - Aucune raison particulière
4. Quelle est la plus grosse erreur d'un investisseur long terme ?
   - Ne pas commencer, ou sortir à chaque crise ✅
   - Payer trop de frais
   - Diversifier
5. Pour construire un patrimoine solide sur le long terme, la formule gagnante est...
   - Spéculer sur les cryptos à la mode
   - Investir régulièrement (DCA) + temps (long horizon) + diversification + frais bas ✅
   - Travailler plus d'heures

---

# Annexe — Mapping vers l'implémentation

## Fichiers à créer / mettre à jour

Un fichier par niveau : `apps/backend/scripts/seed-level1.ts` à `seed-level20.ts`.

Les fichiers existants (`seed-level1.ts`, `seed-level2.ts` à `seed-level6.ts` numérotés 1, 26-30) doivent être renommés ou réécrits pour coller à la nouvelle numérotation continue 1-20.

## Script orchestrateur

Un `seed-all-levels.ts` qui exécute en séquence les 20 seeds (idempotents), utile en dev.

## Commandes package.json à ajouter

```json
"db:seed:level1" à "db:seed:level20"
"db:seed:all-levels"
```

## Volume d'écriture estimé

- 20 fichiers seed (~200-400 lignes chacun)
- **57 events scriptés** (certains réutilisables entre niveaux via `LevelEvent.triggerPercent` différents)
- **94 questions quiz** (~280 réponses au total, ~3 réponses par question MCQ)
- **40 goals** (20 obligatoires + 20 bonus)
- **~39 assets** répartis en **8 fields** pour permettre des events par secteur/classe
- **7 submarkets** (Livrets, Assurance vie, PEA, Obligations, ETF PEA, CTO, Alternatifs)

## Convention de lecture des Impacts

`Impact.coef` est un multiplicateur appliqué à la valeur d'un asset (ou d'un field/submarket) :
- `coef: 1.08` = +8%
- `coef: 0.92` = -8%
- `coef: 0.70` = -30% (défaut High Yield)

La granularité d'impact (asset / field / submarket) est choisie selon la narration : un krach tech impacte un field (`action_us`), une faillite impacte un asset unique.
