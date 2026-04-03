# Cashou - Architecture des 60 niveaux par difficulté

## Vue d'ensemble des paliers

| Palier | Difficulté | Niveaux | Enveloppes débloquées | Philosophie |
|--------|-----------|---------|----------------------|-------------|
| 1 | Débutant | 1-20 | Livret + Assurance Vie + PEA/CTO (ETF) | Épargner, comprendre les intérêts et les frais, entrer en bourse passivement |
| 2 | Intermédiaire | 21-40 | + Actions individuelles + Crypto | Stock picking, dividendes, volatilité extrême, gestion émotionnelle |
| 3 | Confirmé | 41-60 | + Private Equity + Produits Dérivés + Stratégies avancées | Illiquidité, levier, gestion multi-enveloppes, autonomie totale |

## Progression des enveloppes (ordre de déblocage)

| Phase | Enveloppe | Niveaux | Mécanique clé | Risque |
|-------|-----------|---------|----------------|--------|
| 1 | Livret | 1-6 | Intérêts garantis, réserve de sécurité, épargne de précaution | Aucun |
| 2 | Assurance Vie | 7-12 | Fonds euro + UC, frais, arbitrage, profil de risque, fiscalité | Faible-Modéré |
| 3 | Bourse (ETF) | 13-19 | Règle d'or, diversification passive, DCA, volatilité | Modéré |
| — | Boss Débutant | 20 | Validation Livret + AV + ETF | — |
| 4 | Bourse (Actions) | 21-29 | Stock picking, dividendes, analyse fondamentale | Élevé |
| 5 | Crypto | 30-39 | Ultra-volatilité, FOMO, cycles spéculatifs | Très élevé |
| — | Boss Intermédiaire | 40 | Validation Actions + Crypto | — |
| 6 | Private Equity | 41-46 | Illiquidité, engagement long terme, valorisation | Élevé (illiquide) |
| 7 | Bourse (Produits Dérivés) | 47-52 | Effet de levier, couverture, risque de perte totale | Extrême |
| 8 | Maîtrise totale | 53-59 | Allocation multi-enveloppes, stratégies avancées | Tous niveaux |
| — | Boss Final | 60 | Validation complète | Extrême |

---

## Catalogue des events par enveloppe

### Events Livret
- `EVT_L01` hausse_taux_livret: `LIVRET_A:1.05, LIVRET_DDS:1.04` — La BCE remonte ses taux, les livrets suivent.
- `EVT_L02` baisse_taux_livret: `LIVRET_A:0.94, LIVRET_DDS:0.96` — Baisse des taux directeurs, rendement en recul.
- `EVT_L03` inflation_grignote: `LIVRET_A:0.90, LIVRET_DDS:0.92` — L'inflation dépasse le taux du livret. Ton épargne perd du pouvoir d'achat.
- `EVT_L04` plafond_atteint: effet narratif uniquement — Tu atteins le plafond de ton Livret A. Et maintenant ?

### Events Assurance Vie
- `EVT_AV01` baisse_fonds_euro: `AV_EURO:0.94` — Les taux obligataires baissent, le fonds euro rapporte moins.
- `EVT_AV02` rallye_UC: `AV_UC:1.12` — Les marchés montent, tes unités de compte en profitent.
- `EVT_AV03` correction_UC: `AV_UC:0.88` — Correction sur les marchés actions, tes UC perdent de la valeur.
- `EVT_AV04` arbitrage_gratuit: effet narratif — Ton assureur offre un arbitrage gratuit. C'est le moment de rééquilibrer.
- `EVT_AV05` hausse_frais_gestion: `AV_EURO:0.97, AV_UC:0.97` — Ton assureur augmente ses frais. L'impact est silencieux mais réel.

### Events Bourse ETF
- `EVT_ETF01` choc_tech: `ETF_TECH:0.86, ETF_MONDE:0.93` — Correction tech type Nasdaq, le monde suit en douceur.
- `EVT_ETF02` rebond_mondial: `ETF_MONDE:1.08, ETF_TECH:1.10` — Reprise généralisée des marchés mondiaux.
- `EVT_ETF03` rotation_sectorielle: `ETF_TECH:0.90, ETF_ENERGIE:1.08` — L'argent quitte la tech pour l'énergie.
- `EVT_ETF04` krach_éclair: `ETF_TECH:0.74, ETF_MONDE:0.80` — Flash crash. -20% en une semaine. La panique s'installe.
- `EVT_ETF05` marche_stable: `ETF_MONDE:1.02, OBLIG_FR:1.01` — Marchés calmes. Le temps fait son travail.
- `EVT_ETF06` inflation_marche: `OBLIG_FR:0.88, ETF_MONDE:0.95` — L'inflation fait monter les taux, les obligations souffrent.

### Events Bourse Actions
- `EVT_ACT01` profit_warning: `CTO_TOTAL:0.82, CTO_LVMH:0.95` — TotalEnergies publie un profit warning. L'action dévisse.
- `EVT_ACT02` dividende_exceptionnel: `CTO_LVMH:1.08` — LVMH annonce un dividende record. Le titre bondit.
- `EVT_ACT03` scandale_entreprise: `CTO_TOTAL:0.70` — Scandale environnemental chez Total. Chute brutale.
- `EVT_ACT04` rallye_luxe: `CTO_LVMH:1.15, PEA_SU:1.05` — Le luxe français cartonne en Asie.
- `EVT_ACT05` crise_sectorielle: `PEA_AI:0.85, PEA_SU:0.80` — Crise industrielle européenne, les valeurs PEA souffrent.
- `EVT_ACT06` OPA_surprise: `PEA_AI:1.20` — Rumeur d'OPA sur Air Liquide. Le titre s'envole.

### Events Crypto
- `EVT_CR01` bull_run: `CRYPTO_BTC:1.35, CRYPTO_ETH:1.45` — Bull run. Le marché crypto explose à la hausse.
- `EVT_CR02` crypto_winter: `CRYPTO_BTC:0.55, CRYPTO_ETH:0.45` — Crypto winter. Les cours s'effondrent de moitié.
- `EVT_CR03` regulation_choc: `CRYPTO_BTC:0.75, CRYPTO_ETH:0.70` — Un pays majeur annonce une interdiction. Panique générale.
- `EVT_CR04` halving_btc: `CRYPTO_BTC:1.25` — Le halving Bitcoin réduit l'offre. Historiquement, ça monte.
- `EVT_CR05` hack_exchange: `CRYPTO_ETH:0.65` — Un exchange majeur se fait hacker. Les altcoins plongent.
- `EVT_CR06` adoption_institutionnelle: `CRYPTO_BTC:1.20, CRYPTO_ETH:1.15` — BlackRock lance un ETF Bitcoin. Vague d'adoption.

### Events Private Equity
- `EVT_PE01` startup_licorne: `PE_FUND:1.30` — Une startup du portefeuille atteint le statut de licorne.
- `EVT_PE02` faillite_portfolio: `PE_FUND:0.75` — Une entreprise du fonds fait faillite. Perte sèche.
- `EVT_PE03` appel_de_fonds: effet de trésorerie — Appel de fonds imprévu. Il faut libérer du capital.
- `EVT_PE04` sortie_reussie: `PE_FUND:1.40` — Exit réussi : IPO d'une participation. Plus-value massive.
- `EVT_PE05` gel_valorisation: `PE_FUND:0.95` — Les valorisations tech sont revues à la baisse. Impact modéré.

### Events Produits Dérivés
- `EVT_DER01` squeeze_short: `DERIV_CALL:1.60, DERIV_PUT:0.40` — Short squeeze ! Les calls explosent, les puts s'effondrent.
- `EVT_DER02` expiration_proche: `DERIV_CALL:0.70, DERIV_PUT:0.70` — Thêta decay : tes options perdent de la valeur chaque jour.
- `EVT_DER03` volatilite_explose: `DERIV_CALL:1.30, DERIV_PUT:1.30` — Le VIX explose. Toutes les options prennent de la valeur.
- `EVT_DER04` gap_overnight: `DERIV_CALL:0.50` — Gap baissier à l'ouverture. Ton call perd la moitié de sa valeur.
- `EVT_DER05` couverture_parfaite: `DERIV_PUT:1.40` — Ta couverture fonctionne : le put te protège pendant la baisse.

---

# PALIER DÉBUTANT — Niveaux 1 à 20

*Tu découvres le monde de l'argent. De l'épargne sécurisée sur livret jusqu'à ton premier investissement en Bourse via les ETF, tu apprends les fondamentaux : intérêts, frais, inflation, diversification et investissement régulier. À la fin de ce palier, tu sais placer en livret, piloter une assurance vie, et investir en ETF via un PEA ou un CTO.*

---

## Phase 1 — LIVRET (Niveaux 1-6)
*"L'épargne de précaution"*

Le joueur découvre l'argent, les intérêts, et la notion de capital. Environnement 100% sécurisé. Le risque est nul mais le rendement aussi. On pose les fondations : réserve de sécurité, intérêts composés, inflation.

### Niveau 1 — "Ton premier capital"
> Tu as un capital de départ. Où le mettre en sécurité ?

Découvrir qu'on possède un capital et qu'un livret permet de le faire fructifier sans risque. Les intérêts arrivent tout seuls.

- **Situation du joueur** : Le joueur commence avec un capital initial sur son compte courant (ex: 1 500€). Il n'a encore aucun placement. Son argent dort à 0%.
- **Comment passer le niveau** : Ouvrir un Livret A et/ou un LDDS, et y placer une partie de son capital. Observer les premiers intérêts tomber à la fin du tour. Le niveau est réussi quand le joueur a placé au moins 50% de son capital disponible sur un livret.
- **Enveloppe** : Livret (LIVRET_A, LIVRET_DDS)
- **Event** : EVT_L01 hausse_taux_livret à 50% — Bonne nouvelle, les taux montent !
- **Mécanique apprise** : Placer de l'argent = générer des intérêts passifs

### Niveau 2 — "Quand les taux bougent"
> La BCE annonce une baisse de ses taux directeurs. Qu'est-ce que ça change pour toi ?

Découvrir que les taux d'intérêt ne sont pas fixes. Même en sécurité, les conditions changent.

- **Situation du joueur** : Le joueur commence avec un Livret A garni, ses intérêts tombent régulièrement. Il a pris confiance. Puis la BCE annonce une baisse de taux — ses intérêts diminuent d'un coup.
- **Comment passer le niveau** : Le joueur doit maintenir son épargne malgré la baisse de rendement. Ne pas retirer son argent. Le niveau enseigne que les taux bougent mais que le capital reste garanti. Réussi si le joueur garde son placement et comprend la relation BCE → taux → rendement.
- **Enveloppe** : Livret
- **Event** : EVT_L02 baisse_taux_livret à 50%
- **Mécanique apprise** : Les taux fluctuent, même sur les produits garantis

### Niveau 3 — "Ta réserve sacrée"
> Ton compte courant, c'est l'argent qui te reste après ton quotidien. Tout ce qui est dessus devrait travailler pour toi. Mais avant d'investir, une partie doit rester accessible pour les imprévus — et ça, c'est le livret. Liquide, disponible, garanti. Ta réserve de sécurité vit sur le livret, pas sur le compte courant.

Apprendre à tout placer sur le livret plutôt que de laisser dormir du capital sur le compte courant. Le livret est liquide : on peut retirer à tout moment en cas d'imprévu. C'est donc l'endroit idéal pour la réserve de sécurité. Le capital au-delà de cette réserve pourra ensuite être investi. Sans cette réserve sur le livret, le moindre imprévu te force à vendre tes investissements au pire moment.

- **Situation du joueur** : Le joueur commence avec du capital réparti entre son livret et son compte courant. L'argent sur le compte courant ne rapporte rien. Il doit comprendre que tout ce capital devrait être sur le livret : c'est liquide, garanti, et ça rapporte des intérêts.
- **Comment passer le niveau** : Transférer tout le capital restant du compte courant vers le livret. Le jeu définit un seuil de réserve de sécurité (ex: un montant cible). Un événement "dépense imprévue" survient : le joueur pioche dans son livret pour y faire face, puis le reconstitue. Réussi si le joueur a vidé son compte courant vers le livret ET a pu encaisser l'imprévu grâce à la liquidité du livret.
- **Enveloppe** : Livret
- **Event** : EVT_L01 hausse_taux à 35%, puis EVT_L02 baisse_taux à 70%
- **Mécanique apprise** : Le livret est liquide — c'est ta réserve de sécurité. Pas besoin de laisser dormir de l'argent sur le compte courant.

### Niveau 4 — "L'ennemi invisible"
> Ton livret rapporte 3%. L'inflation est à 5%. Tu gagnes ou tu perds ? Et pourtant, tes intérêts génèrent des intérêts — sur 20 ans, même un petit taux fait des miracles.

Comprendre deux forces qui s'opposent : l'inflation qui érode ton pouvoir d'achat, et les intérêts composés qui travaillent pour toi. Sur le court terme, l'inflation gagne. Sur le long terme, les intérêts composés prennent le dessus — à condition de trouver un rendement supérieur à l'inflation.

- **Situation du joueur** : Le joueur commence avec ses livrets bien garnis qui rapportent 3%, mais l'inflation est affichée à 5%. Il peut visualiser que ses intérêts grossissent en euros... mais son pouvoir d'achat (affiché en "euros réels") diminue. Un graphe montre les intérêts composés sur 20 ans.
- **Comment passer le niveau** : Répondre correctement à un quiz sur le rendement réel (nominal - inflation). Identifier que le livret perd du pouvoir d'achat quand l'inflation le dépasse. Réussi quand le joueur comprend qu'il "gagne" en euros mais "perd" en pouvoir d'achat, et qu'il faut chercher des rendements supérieurs à l'inflation.
- **Enveloppe** : Livret
- **Event** : EVT_L03 inflation_grignote à 50%
- **Mécanique apprise** : Rendement réel = rendement nominal - inflation. Les intérêts composés sont puissants, mais il faut battre l'inflation.

### Niveau 5 — "Les livrets sont pleins"
> Ton Livret A est au plafond (22 950€). Ton LDDS aussi (12 000€). Tes intérêts continuent de tomber, mais tu ne peux plus ajouter un centime. Et ton épargne excédentaire dort sur ton compte courant à 0%. Que faire ?

Constater les limites concrètes de l'épargne réglementée : plafonds atteints sur les deux livrets. Comprendre que l'argent qui reste sur un compte courant perd de la valeur chaque jour à cause de l'inflation.

- **Situation du joueur** : Le joueur commence avec ses deux livrets au plafond. Il a encore du capital sur le compte courant mais ne peut plus rien ajouter aux livrets. Son excédent s'accumule à 0%, et l'inflation le grignote visiblement (indicateur rouge).
- **Comment passer le niveau** : Le joueur ne peut rien faire d'autre que constater le problème — c'est un niveau narratif de transition. Il voit son pouvoir d'achat baisser sur le compte courant tour après tour. Réussi quand le joueur comprend qu'il a besoin d'un nouveau véhicule d'épargne (le jeu suggère l'assurance vie).
- **Enveloppe** : Livret (LIVRET_A + LIVRET_DDS)
- **Event** : EVT_L04 plafond_atteint (narratif) + EVT_L03 inflation à 60%
- **Mécanique apprise** : Les livrets ont des plafonds — une fois atteints, chaque euro supplémentaire a besoin d'un autre support

### Niveau 6 — "Prêt à grandir" *(Boss Livret)*
> Tu as ta réserve de sécurité, tes deux livrets sont au max, et l'inflation grignote le reste. Tu as prouvé que tu sais épargner. Maintenant, il est temps de faire travailler ton argent autrement. Ton assureur t'ouvre les portes de l'assurance vie.

Validation des acquis livret. Scénario combinant inflation et baisse de taux. Le joueur doit prouver qu'il maîtrise l'épargne sécurisée. En récompense : déblocage de l'assurance vie.

- **Situation du joueur** : Les deux livrets sont au max. L'inflation est élevée. Les taux baissent. L'excédent dort à 0%. Le joueur est dans une impasse : il sait épargner, mais il perd de l'argent en pouvoir d'achat chaque tour.
- **Comment passer le niveau** : Survivre à un scénario de 5 tours combinant inflation forte et baisse de taux sans toucher à sa réserve de sécurité. Le joueur doit maintenir ses 3-6 mois de réserve intacts malgré la pression. Réussi si la réserve est intacte ET le joueur a identifié le besoin d'un nouveau véhicule. Récompense : déblocage de l'enveloppe Assurance Vie.
- **Enveloppe** : Livret
- **Event** : EVT_L03 inflation à 35%, EVT_L02 baisse_taux à 70%
- **Mécanique apprise** : Validation — le livret seul ne suffit pas pour construire un patrimoine. L'assurance vie est la prochaine étape.

---

## Phase 2 — ASSURANCE VIE (Niveaux 7-12)
*"Le couteau suisse de l'épargne"*

Le joueur découvre les fonds euros (sécurisé) et les unités de compte (exposées au marché). Il apprend les frais de gestion, les arbitrages, la notion de profil de risque et la fiscalité avantageuse. Premier contact avec la volatilité, mais amortie.

### Niveau 7 — "Le fonds euro, ton nouveau livret ?"
> L'assurance vie te propose un fonds euro. Garanti, mais avec des frais. Ça vaut le coup ?

Découvrir le fonds euro : capital garanti mais frais de gestion annuels. Comparer avec le livret.

- **Situation du joueur** : Le joueur commence avec l'assurance vie débloquée. Ses livrets sont pleins, il a un excédent disponible. L'AV lui propose un premier support : le fonds euro (capital garanti, ~2-3% brut, mais 0.75% de frais de gestion prélevés automatiquement).
- **Comment passer le niveau** : Placer une partie de l'excédent sur le fonds euro. Observer que le rendement est meilleur que le compte courant mais légèrement réduit par les frais. Comparer le rendement net (après frais) avec le livret. Réussi quand le joueur a effectué son premier versement en AV et compris la notion de rendement net.
- **Enveloppe** : Assurance Vie (AV_EURO)
- **Event** : EVT_AV01 baisse_fonds_euro à 50%
- **Mécanique apprise** : Rendement net = rendement brut - frais de gestion

### Niveau 8 — "Les unités de compte"
> Ton assureur te propose des UC. Plus risqué, mais potentiellement plus rentable. Tu oses ?

Découvrir les UC (unités de compte), premier contact avec des actifs non garantis à l'intérieur de l'assurance vie.

- **Situation du joueur** : Le joueur commence avec du capital sur le fonds euro. Son rendement net est correct mais limité. L'assureur lui propose un second support : les unités de compte (UC), qui suivent les marchés financiers. Potentiel de gain plus élevé, mais capital NON garanti — première fois que le joueur voit son capital fluctuer.
- **Comment passer le niveau** : Investir une portion de son AV en UC (le jeu peut suggérer 20-30% pour commencer). Observer les UC monter pendant un rallye. Constater que le rendement est supérieur au fonds euro. Réussi quand le joueur a réparti entre fonds euro et UC, et qu'il a vu les deux performances côte à côte.
- **Enveloppe** : Assurance Vie (AV_EURO + AV_UC)
- **Event** : EVT_AV02 rallye_UC à 50%
- **Mécanique apprise** : Plus de rendement = plus de risque, mais dans un cadre fiscal avantageux

### Niveau 9 — "Tes premiers réflexes"
> Tes UC montent, puis corrigent de 12%. Le fonds euro, lui, amortit le choc. Tu apprends deux réflexes : sécuriser les gains quand ça monte (arbitrage), et ne pas paniquer quand ça baisse.

Combiner deux leçons fondamentales. D'abord l'arbitrage : basculer des UC vers le fonds euro pour sécuriser les gains, sans frais fiscaux. Puis la correction : vivre sa première vraie baisse et comprendre que le fonds euro stabilise l'ensemble.

- **Situation du joueur** : Le joueur commence avec une AV répartie entre fonds euro et UC. Les UC montent bien (+12%). Puis l'assureur propose un "arbitrage gratuit" (bascule UC → fonds euro sans frais). Ensuite, les marchés corrigent (-12% sur les UC). Le joueur vit pour la première fois la volatilité dans son portefeuille.
- **Comment passer le niveau** : Effectuer un arbitrage pour sécuriser une partie des gains AVANT la correction. Puis encaisser la baisse sans tout retirer. Le joueur voit que la partie arbitrée vers le fonds euro est protégée, tandis que les UC restantes ont perdu. Réussi si le joueur a utilisé l'arbitrage ET n'a pas tout vendu pendant la correction. Score bonus si le timing de l'arbitrage est bon.
- **Enveloppe** : Assurance Vie
- **Event** : EVT_AV02 rallye_UC à 30%, EVT_AV04 arbitrage_gratuit à 55%, EVT_AV03 correction_UC à 80%
- **Mécanique apprise** : Arbitrage + gestion de la baisse — sécuriser les gains ET rester calme en correction

### Niveau 10 — "Les frais, l'ennemi silencieux"
> Ton assureur prend 0.75% par an. Ça paraît rien. Calcule sur 20 ans. Comme les intérêts composés travaillent pour toi, les frais composés travaillent contre toi.

Comprendre l'impact des frais de gestion sur la durée. Un petit pourcentage annuel = des milliers d'euros sur le long terme. Les frais composés sont le miroir négatif des intérêts composés.

- **Situation du joueur** : Le joueur commence avec une AV en place (fonds euro + UC). L'assureur annonce une hausse des frais de gestion. Le jeu montre une projection : combien les frais vont coûter sur 10 ans, 20 ans, 30 ans. L'effet est choquant — des centaines voire des milliers d'euros prélevés silencieusement.
- **Comment passer le niveau** : Répondre correctement à un quiz sur l'impact des frais composés (ex: "10 000€ à 5% brut avec 1.5% de frais pendant 20 ans → combien de moins que sans frais ?"). Le joueur doit aussi comparer deux contrats d'AV avec des frais différents et choisir le moins cher. Réussi quand le joueur identifie les frais comme un facteur décisif de performance long terme.
- **Enveloppe** : Assurance Vie
- **Event** : EVT_AV05 hausse_frais à 35%, EVT_AV03 correction_UC à 70%
- **Mécanique apprise** : Les frais composés sont aussi puissants que les intérêts composés — mais contre toi

### Niveau 11 — "Patience récompensée"
> Prudent, équilibré ou dynamique ? Choisis ton profil. Et sache que l'AV récompense la patience : après 8 ans, tu bénéficies d'un abattement fiscal de 4 600€/an sur tes gains.

Deux leçons liées. D'abord, définir son profil de risque : la répartition fonds euro / UC dépend de ta tolérance au risque ET de ton horizon de temps. Ensuite, comprendre que la fiscalité de l'AV récompense ceux qui restent : avant 8 ans, gains taxés à 30% ; après, abattement annuel.

- **Situation du joueur** : Le joueur commence avec une AV garnie et doit choisir un profil de risque (prudent : 70% euro / 30% UC, équilibré : 50/50, dynamique : 30% euro / 70% UC). Il vit ensuite un cycle hausse-baisse. Le profil dynamique gagne plus en hausse mais perd plus en baisse. Le jeu affiche aussi la fiscalité : retrait avant 8 ans = 30% de flat tax sur les gains, après 8 ans = abattement de 4 600€.
- **Comment passer le niveau** : Choisir un profil, vivre le cycle, et répondre à un quiz de synthèse. Questions type : "Si tu retires 5 000€ de gains avant 8 ans, combien d'impôts ?" vs "Après 8 ans ?". Réussi quand le joueur a choisi son profil ET compris l'avantage fiscal de la patience.
- **Enveloppe** : Assurance Vie
- **Event** : EVT_AV03 correction_UC à 35%, EVT_AV02 rallye_UC à 70%
- **Mécanique apprise** : Ton profil de risque + le temps = la clé. L'AV récompense la patience — 8 ans est le seuil magique.

### Niveau 12 — "L'enveloppe maîtrisée" *(Boss Assurance Vie)*
> Scénario complet : hausse, correction, hausse de frais. Prouve que tu sais piloter ton assurance vie. Tu as gagné le droit d'ouvrir un PEA et un CTO pour investir directement en Bourse via des ETF.

Validation. Le joueur doit arbitrer, gérer les frais, et maintenir un objectif de performance sur un cycle complet. En récompense : déblocage du PEA et du CTO, accès aux ETF et à la Bourse.

- **Situation du joueur** : Le joueur commence avec un profil de risque défini, une AV avec fonds euro et UC. Il va traverser un scénario long (8-10 tours) avec 3 événements : un rallye UC, une hausse de frais, puis une correction. Son objectif : terminer avec un rendement net positif tout en ayant arbitré intelligemment.
- **Comment passer le niveau** : Gérer activement son AV pendant le scénario complet. Arbitrer vers le fonds euro quand les UC montent trop (sécuriser les gains). Ne pas paniquer pendant la correction. Maintenir un rendement net positif malgré les frais. Réussi si le portefeuille AV termine en positif ET la réserve de sécurité sur le livret est toujours intacte. Récompense : déblocage du PEA et du CTO.
- **Enveloppe** : Assurance Vie
- **Event** : EVT_AV02 rallye à 25%, EVT_AV05 hausse_frais à 50%, EVT_AV03 correction à 75%
- **Mécanique apprise** : Maîtrise de l'enveloppe AV — arbitrage, frais, profil de risque, fiscalité. Prochaine étape : la Bourse.

---

## Phase 3 — BOURSE AVEC ETF (Niveaux 13-19)
*"La diversification passive"*

Le joueur accède aux marchés financiers via les ETF sur PEA et CTO. Mais d'abord, la règle d'or : ne JAMAIS investir l'argent dont on a besoin. L'épargne de précaution reste sur le livret. Seul l'excédent va en bourse, pour un horizon d'au moins 5 ans. Puis vient la diversification mondiale, le DCA, et les premiers vrais chocs de marché.

### Niveau 13 — "L'argent qu'on peut risquer"
> Tu as envie d'aller en Bourse. Mais attention : l'argent que tu investis ici, tu dois pouvoir le perdre sans que ta vie en soit affectée. Ta réserve de sécurité de 3 à 6 mois, elle, ne bouge PAS.

La règle d'or avant tout investissement en Bourse : tes 3 à 6 mois d'épargne d'urgence restent sur le livret, intouchables. L'argent investi en PEA ou CTO est de l'argent dont tu n'as pas besoin avant au moins 5 ans.

- **Situation du joueur** : Le joueur commence avec le PEA et le CTO débloqués. Il est tenté de tout mettre en bourse pour "gagner plus". Mais le jeu lui montre son patrimoine actuel : livrets (réserve), AV, et un excédent. Le jeu pose clairement la question : "Combien peux-tu investir sans toucher à ta réserve ?"
- **Comment passer le niveau** : Le joueur doit choisir combien investir en bourse. S'il tente de placer plus que son excédent (entamant sa réserve de sécurité), le jeu le bloque avec un avertissement. Un événement "dépense imprévue" survient pour tester : si la réserve est intacte, pas de problème ; si elle a été entamée, le joueur doit vendre à perte. Réussi si le joueur investit UNIQUEMENT l'excédent et conserve sa réserve intacte.
- **Enveloppe** : Livret (rappel) + PEA / CTO (introduction)
- **Event** : EVT_L03 inflation à 50%
- **Mécanique apprise** : Règle d'or — ne jamais investir l'argent dont on a besoin. La réserve de sécurité est sacrée.

### Niveau 14 — "Bienvenue en Bourse"
> Tu achètes ton premier ETF Monde. D'un coup, tu possèdes un bout de 1500 entreprises.

Découvrir l'ETF : un panier d'actions accessible en un clic. Découvrir le PEA et le CTO, les deux enveloppes pour investir en bourse.

- **Situation du joueur** : Le joueur a un PEA et un CTO vides, et un capital disponible (l'excédent hors réserve). Le jeu lui propose différents ETF : ETF Monde (1500 entreprises, diversifié), ETF Tech (concentré sur la tech), ETF Obligataire (obligations d'État). Marché calme, pas de stress.
- **Comment passer le niveau** : Acheter son premier ETF. Le jeu recommande l'ETF Monde pour débuter. Observer la performance pendant 3-4 tours de marché stable. Voir les petites variations (+1%, -0.5%, +2%). Réussi quand le joueur a acheté au moins un ETF et compris qu'il possède un bout de centaines d'entreprises en un seul clic.
- **Enveloppe** : PEA / CTO (ETF_MONDE)
- **Event** : EVT_ETF05 marche_stable à 50%
- **Mécanique apprise** : Un ETF = diversification automatique sur des centaines d'entreprises

### Niveau 15 — "Le DCA, ta meilleure arme"
> Plutôt que de tout investir d'un coup, tu investis un peu chaque mois. Pourquoi ça marche ?

Introduction au DCA. Investir régulièrement lisse le prix d'achat moyen et élimine le stress du timing.

- **Situation du joueur** : Le joueur commence avec un ETF Monde en portefeuille. Le jeu lui propose de mettre en place un versement régulier (DCA). Il peut choisir : tout investir d'un coup, ou investir un montant fixe chaque tour. Le marché va traverser un choc tech puis un rebond.
- **Comment passer le niveau** : Mettre en place un DCA (versement régulier chaque tour). Le jeu compare automatiquement la stratégie "tout d'un coup" vs "DCA" sur le même scénario. Pendant le choc tech, le DCA achète à bas prix, ce qui lisse le prix moyen. Réussi si le joueur a activé le DCA et constaté que son prix moyen d'achat est inférieur au prix d'entrée "tout d'un coup".
- **Enveloppe** : PEA / CTO (ETF_MONDE, ETF_TECH)
- **Event** : EVT_ETF01 choc_tech à 35%, EVT_ETF02 rebond à 70%
- **Mécanique apprise** : DCA = investir sans se soucier du "bon moment"

### Niveau 16 — "Tech vs Monde"
> L'ETF Tech performe mieux... mais il chute plus fort aussi. Quel équilibre ?

Comparer ETF sectoriels et ETF diversifiés. Comprendre le compromis rendement/volatilité.

- **Situation du joueur** : Le joueur commence avec un DCA en place sur l'ETF Monde. Il remarque que l'ETF Tech fait +15% quand le Monde fait +8%. Tentation de tout basculer sur la tech. Puis une rotation sectorielle frappe : la tech chute, l'énergie monte, le Monde absorbe le choc.
- **Comment passer le niveau** : Le joueur doit choisir sa répartition entre ETF Monde et ETF Tech (ou d'autres sectoriels). Pendant la rotation sectorielle, il constate que le Monde est plus stable. Réussi si le joueur maintient une diversification entre ETF (pas tout sur la tech) et termine le cycle avec un portefeuille équilibré. Le joueur qui a tout mis sur la tech voit les dégâts.
- **Enveloppe** : PEA / CTO (ETF_MONDE, ETF_TECH)
- **Event** : EVT_ETF03 rotation_sectorielle à 50%
- **Mécanique apprise** : Un ETF sectoriel concentre le risque — diversifier les ETF aussi

### Niveau 17 — "Le krach et le rebond"
> -20% en une semaine. Tout le monde panique et vend. Toi, tu restes — parce que ta réserve est intacte et que tu n'as pas BESOIN de cet argent. Trois mois plus tard, le marché rebondit. Ceux qui ont vendu ont raté la remontée.

Vivre le cycle complet krach → rebond en un seul niveau. La réserve de sécurité prend tout son sens : grâce à elle, tu n'es pas forcé de vendre dans la panique.

- **Situation du joueur** : Le joueur commence avec un portefeuille ETF en positif. Soudain, flash crash : -20% en un tour. Le jeu affiche des notifications anxiogènes ("Les marchés s'effondrent", "Les investisseurs fuient"). Le joueur a un bouton "TOUT VENDRE" bien visible. Sa réserve de sécurité sur le livret est affichée en vert (intacte).
- **Comment passer le niveau** : NE PAS vendre pendant le krach. Le DCA continue d'acheter pendant la baisse (à prix réduit). 3-4 tours plus tard, le rebond arrive. Le joueur qui a vendu voit qu'il a cristallisé ses pertes et raté le rebond. Le joueur qui est resté voit son DCA avoir profité des prix bas. Réussi si le joueur n'a pas vendu pendant la panique ET que sa réserve de sécurité est intacte (preuve qu'il n'avait pas besoin de cet argent).
- **Enveloppe** : PEA / CTO
- **Event** : EVT_ETF04 krach_éclair à 35%, EVT_ETF02 rebond à 70%
- **Mécanique apprise** : Un krach n'est pas une perte si tu ne vends pas — et grâce à ta réserve, tu n'as jamais à vendre sous la contrainte

### Niveau 18 — "L'inflation vs les marchés"
> L'inflation grimpe. Tes obligations souffrent. Mais tes ETF actions résistent. Pourquoi les entreprises s'adaptent mieux que les obligations à l'inflation ?

Comprendre que les actions sont un rempart partiel contre l'inflation. Les obligations perdent de la valeur quand les taux montent. Première leçon sur l'allocation actions/obligations.

- **Situation du joueur** : L'inflation remonte. Le jeu montre l'impact sur chaque classe d'actifs : le livret rapporte moins que l'inflation (rappel du niveau 4), les obligations (OBLIG_FR) chutent car les taux montent, mais les ETF actions résistent (+2% malgré l'inflation). Le joueur a peut-être des obligations en portefeuille — elles sont en rouge.
- **Comment passer le niveau** : Ajuster son allocation en réduisant la part obligataire et en maintenant ou renforçant les actions. Répondre à un quiz : "Pourquoi les actions résistent mieux à l'inflation ?" (les entreprises augmentent leurs prix). Réussi si le joueur comprend le rôle de chaque classe d'actifs face à l'inflation et a adapté son allocation.
- **Enveloppe** : PEA / CTO (ETF_MONDE, OBLIG_FR)
- **Event** : EVT_ETF06 inflation_marche à 50%
- **Mécanique apprise** : Les actions protègent mieux de l'inflation que les obligations — l'allocation compte

### Niveau 19 — "Le stratège passif" *(Boss ETF)*
> Cycle complet : rotation sectorielle, krach, rebond. Ton DCA est en place. Tiens bon. Tu maîtrises l'investissement passif. Prêt à choisir tes propres entreprises ?

Validation. Le joueur doit gérer un portefeuille multi-ETF à travers un cycle économique complet avec DCA.

- **Situation du joueur** : Le joueur commence avec un portefeuille ETF diversifié (Monde, Tech, Obligations) et un DCA en place. Il va traverser un cycle complet de 10-12 tours avec 3 événements majeurs enchaînés : rotation sectorielle, puis krach, puis rebond. C'est le test le plus long du palier débutant.
- **Comment passer le niveau** : Maintenir son DCA et son allocation pendant tout le cycle sans paniquer. Le joueur peut ajuster sa répartition entre ETF mais ne doit pas tout vendre. Il doit garder sa réserve de sécurité intacte sur le livret. Réussi si le portefeuille termine en positif sur l'ensemble du cycle ET la réserve est intacte. Récompense : déblocage des actions individuelles sur PEA et CTO.
- **Enveloppe** : PEA / CTO (ETF_MONDE, ETF_TECH, OBLIG_FR)
- **Event** : EVT_ETF03 rotation à 25%, EVT_ETF04 krach à 55%, EVT_ETF02 rebond à 80%
- **Mécanique apprise** : Maîtrise de l'investissement passif — DCA, diversification, patience. Prochaine étape : le stock picking.

---

### Niveau 20 — "Le triple jeu" *(Boss Débutant)*
> Tu gères maintenant 3 enveloppes : Livret, Assurance Vie et PEA/CTO. L'inflation monte, les marchés corrigent, les frais AV augmentent. Comment répartir ton capital entre sécurité et rendement ? Ta réserve de sécurité est-elle toujours intacte ?

Boss de fin de palier. Le joueur mobilise l'ensemble des compétences acquises : épargne de précaution intouchable, arbitrage AV, DCA en ETF.

- **Situation du joueur** : Le joueur commence avec 3 enveloppes en place : Livret (réserve), AV (fonds euro + UC), PEA/CTO (ETF). Son patrimoine est réparti entre les trois. Un cycle de 12-15 tours va tester toutes les compétences acquises avec des événements sur chaque enveloppe.
- **Comment passer le niveau** : Gérer les 3 enveloppes en parallèle pendant un scénario complet. L'inflation touche les livrets (rendement réel négatif), l'AV corrige (les UC baissent), puis les marchés rebondissent (les ETF remontent). Le joueur doit : (1) garder sa réserve de sécurité intacte sur le livret, (2) arbitrer dans l'AV au bon moment, (3) maintenir son DCA ETF pendant la baisse. Réussi si les 3 conditions sont remplies ET le patrimoine global est en positif. Le joueur qui a touché à sa réserve ou vendu ses ETF en panique échoue. Récompense : passage au palier Intermédiaire.
- **Enveloppe** : Livret + Assurance Vie + PEA/CTO
- **Event** : EVT_L03 inflation à 20%, EVT_AV03 correction à 50%, EVT_ETF02 rebond à 80%
- **Mécanique apprise** : Gestion coordonnée de 3 enveloppes — chaque poche a son rôle dans la stratégie globale

---

# PALIER INTERMÉDIAIRE — Niveaux 21 à 40

*Tu montes en puissance. Les ETF étaient confortables, mais maintenant tu passes aux actions individuelles et tu entres dans l'univers crypto. Les enjeux sont plus élevés, les émotions plus fortes, et les erreurs plus coûteuses. Tu apprends que la discipline et la connaissance sont tes meilleures armes.*

---

## Phase 4 — BOURSE AVEC ACTIONS (Niveaux 21-29)
*"Le stock picking"*

Le joueur passe des paniers (ETF) aux actions individuelles. Il découvre ce qu'est une entreprise cotée, les dividendes, l'analyse fondamentale, les profit warnings, et les risques spécifiques. La volatilité est plus forte et les décisions plus personnelles.

### Niveau 21 — "Qu'est-ce qu'une action ?"
> Ton ETF Monde contient 1500 entreprises. Mais qu'est-ce que ça veut dire, "posséder un bout d'une entreprise" ? Comment elle gagne de l'argent ? Pourquoi son prix bouge ?

Avant d'acheter sa première action, comprendre ce qu'est une entreprise cotée : chiffre d'affaires, bénéfices, cours de bourse. Comprendre que le prix d'une action reflète les attentes du marché sur l'avenir de l'entreprise, pas seulement sa valeur actuelle.

- **Enveloppe** : PEA / CTO (ETF_MONDE — observation)
- **Event** : EVT_ETF05 marche_stable à 50%
- **Mécanique apprise** : Une action est une part d'une entreprise — son prix reflète ce que le marché pense de son avenir

### Niveau 22 — "Ta première action"
> Tu achètes une action LVMH. Tu possèdes un minuscule bout de la plus grande maison de luxe au monde.

Passer de l'observation à l'action. Acheter sa première action individuelle. Comprendre la différence avec un ETF : plus de potentiel, plus de risque, mais aussi plus de responsabilité dans le choix.

- **Enveloppe** : CTO (CTO_LVMH)
- **Event** : EVT_ACT04 rallye_luxe à 50%
- **Mécanique apprise** : Une action = le destin d'une seule entreprise, pour le meilleur et pour le pire

### Niveau 23 — "Le dividende, ce bonus"
> LVMH verse son dividende annuel. De l'argent qui tombe sans rien faire. Mais attention au piège.

Découvrir les dividendes. Comprendre qu'un dividende n'est pas de l'argent gratuit (le cours baisse du montant versé).

- **Enveloppe** : CTO (CTO_LVMH, CTO_TOTAL)
- **Event** : EVT_ACT02 dividende_exceptionnel à 50%
- **Mécanique apprise** : Le dividende est prélevé sur le cours — ce n'est pas un cadeau, c'est un choix de l'entreprise

### Niveau 24 — "Profit warning"
> TotalEnergies publie des résultats décevants. L'action perd 18% en une séance. Tu avais tout mis dessus ?

Découvrir le risque spécifique (idiosyncratique). Une mauvaise nouvelle sur UNE entreprise peut faire très mal.

- **Enveloppe** : CTO (CTO_TOTAL, CTO_LVMH)
- **Event** : EVT_ACT01 profit_warning à 50%
- **Mécanique apprise** : Ne jamais mettre tous ses oeufs dans le même panier — surtout en actions individuelles

### Niveau 25 — "Le PEA, ton allié fiscal"
> Le PEA offre une fiscalité avantageuse après 5 ans. Mais tu ne peux y mettre que des actions européennes.

Découvrir les avantages fiscaux du PEA pour les actions individuelles (pas seulement les ETF). Comprendre la contrainte géographique et le plafond.

- **Enveloppe** : PEA (PEA_AI, PEA_SU)
- **Event** : EVT_ACT05 crise_sectorielle à 50%
- **Mécanique apprise** : L'enveloppe fiscale change le rendement net — le PEA est un outil puissant

### Niveau 26 — "L'OPA qui change tout"
> Rumeur d'OPA sur Air Liquide. Le titre bondit de 20%. Tu vends pour sécuriser ou tu gardes ?

Vivre un événement corporate inattendu. Apprendre à gérer l'euphorie comme la panique.

- **Enveloppe** : PEA
- **Event** : EVT_ACT06 OPA_surprise à 40%, EVT_ACT05 crise_sectorielle à 75%
- **Mécanique apprise** : Les événements corporate sont imprévisibles — prendre ses profits n'est pas un crime

### Niveau 27 — "Le scandale"
> Un scandale environnemental frappe Total. -30% en deux jours. C'est une opportunité ou un piège ?

Apprendre à distinguer une baisse temporaire (opportunité) d'une destruction de valeur (piège). Introduction aux indicateurs fondamentaux (P/E ratio, rendement du dividende) pour évaluer si le prix reflète encore la réalité.

- **Enveloppe** : CTO
- **Event** : EVT_ACT03 scandale à 50%
- **Mécanique apprise** : "Buy the dip" ne marche que si les fondamentaux sont intacts — les ratios financiers aident à trancher

### Niveau 28 — "CTO vs PEA : le match"
> Tu as les deux enveloppes. Comment répartir ? Les actions US au CTO, les européennes au PEA ? Et les secteurs, comment les équilibrer ?

Optimiser l'allocation entre CTO et PEA. Comprendre la complémentarité des deux enveloppes et la rotation sectorielle : l'énergie monte quand la tech baisse, la santé résiste quand tout s'effondre.

- **Enveloppe** : CTO + PEA
- **Event** : EVT_ACT04 rallye_luxe à 35%, EVT_ACT01 profit_warning à 70%
- **Mécanique apprise** : Chaque enveloppe a ses forces, chaque secteur a son cycle — combiner les deux est la stratégie optimale

### Niveau 29 — "L'investisseur éclairé" *(Boss Actions)*
> Gère un portefeuille actions complet à travers un cycle : rallye, scandale, OPA, crise sectorielle.

Validation. Le joueur mobilise toutes les compétences actions : diversification, fiscalité, gestion des news, dividendes.

- **Enveloppe** : CTO + PEA
- **Event** : EVT_ACT04 rallye à 20%, EVT_ACT03 scandale à 50%, EVT_ACT06 OPA à 80%
- **Mécanique apprise** : Maîtrise du stock picking — sélection, diversification, discipline

---

## Phase 5 — CRYPTO (Niveaux 30-39)
*"Le Far West financier"*

Le joueur entre dans l'univers crypto. Volatilité extrême, FOMO, manipulation de marché, hacks d'exchange. Les gains potentiels sont énormes mais les pertes aussi. On apprend à garder la tête froide dans le chaos.

### Niveau 30 — "Bienvenue dans la crypto"
> Tu achètes ton premier Bitcoin. Bienvenue dans un marché ouvert 24h/24, 7j/7, sans régulateur.

Découvrir les cryptomonnaies. Comprendre les différences fondamentales avec les marchés traditionnels.

- **Enveloppe** : Crypto (CRYPTO_BTC)
- **Event** : EVT_CR06 adoption_institutionnelle à 50%
- **Mécanique apprise** : La crypto est un marché sans filet — pas de coupe-circuit, pas de fermeture

### Niveau 31 — "Le FOMO, ton pire ennemi"
> Le Bitcoin monte de 35% en un mois. Tout le monde en parle. Tu achètes au sommet ?

Apprendre à résister au FOMO (Fear Of Missing Out). Acheter quand tout le monde achète = acheter cher.

- **Enveloppe** : Crypto (CRYPTO_BTC, CRYPTO_ETH)
- **Event** : EVT_CR01 bull_run à 40%, EVT_CR03 regulation_choc à 75%
- **Mécanique apprise** : Le FOMO pousse à acheter au plus haut — la discipline bat l'émotion

### Niveau 32 — "L'hiver crypto"
> -50% sur ton portefeuille. Le marché est en crypto winter. Certains disent que c'est mort. D'autres que c'est l'opportunité du siècle.

Vivre un bear market crypto. Apprendre que les cycles sont normaux et que les hivers préparent les printemps.

- **Enveloppe** : Crypto
- **Event** : EVT_CR02 crypto_winter à 50%
- **Mécanique apprise** : Les marchés crypto cyclent violemment — survivre à l'hiver est la clé

### Niveau 33 — "Le halving"
> Le halving Bitcoin réduit la production de nouveaux BTC de moitié. Historiquement, les prix montent après.

Comprendre les mécanismes d'offre et de demande spécifiques à la crypto. Le halving est un événement prévisible.

- **Enveloppe** : Crypto
- **Event** : EVT_CR04 halving à 50%
- **Mécanique apprise** : Certains événements crypto sont programmés — les anticiper est un avantage

### Niveau 34 — "Le hack"
> Un exchange majeur se fait pirater. Les fonds sont bloqués. L'Ethereum plonge de 35%.

Découvrir le risque de contrepartie en crypto. Not your keys, not your coins.

- **Enveloppe** : Crypto
- **Event** : EVT_CR05 hack_exchange à 50%
- **Mécanique apprise** : Le risque technique est unique à la crypto — la sécurité est ta responsabilité

### Niveau 35 — "Régulation surprise"
> Un pays majeur interdit les crypto. Panique sur les marchés. Puis un autre les adopte.

Comprendre le risque réglementaire. Les crypto vivent dans un cadre légal instable.

- **Enveloppe** : Crypto
- **Event** : EVT_CR03 regulation_choc à 35%, EVT_CR06 adoption à 70%
- **Mécanique apprise** : La régulation peut tuer ou propulser un marché — rester informé est vital

### Niveau 36 — "Bitcoin vs Altcoins"
> L'Ethereum, Solana, Cardano... Des milliers de projets existent. Comment les évaluer ? Pourquoi Bitcoin est-il à part ?

Comprendre la hiérarchie crypto. Bitcoin = réserve de valeur, Ethereum = infrastructure, altcoins = paris spéculatifs. Plus on descend en capitalisation, plus le risque augmente.

- **Enveloppe** : Crypto (CRYPTO_BTC, CRYPTO_ETH)
- **Event** : EVT_CR01 bull_run à 40%, EVT_CR05 hack_exchange à 75%
- **Mécanique apprise** : Tous les cryptos ne se valent pas — la capitalisation et l'usage réel sont tes boussoles

### Niveau 37 — "Combien en crypto ?"
> La crypto représente 60% de ton portefeuille total. C'est trop ? Combien devrait-elle peser ?

Apprendre à dimensionner la poche crypto dans un portefeuille global. Règle classique : 5-10% max.

- **Enveloppe** : Crypto + rappel des autres enveloppes
- **Event** : EVT_CR01 bull_run à 30%, EVT_CR02 crypto_winter à 65%
- **Mécanique apprise** : La crypto est un satellite, pas le coeur de ton portefeuille

### Niveau 38 — "La DeFi, finance sans intermédiaire"
> Prêter tes cryptos pour toucher des intérêts ? Du staking pour sécuriser un réseau ? La DeFi promet des rendements fous. Mais les risques sont à la mesure des promesses.

Découvrir la finance décentralisée : lending, staking, liquidity pools. Des rendements attractifs mais des risques de smart contract, d'impermanent loss et de rug pull.

- **Enveloppe** : Crypto
- **Event** : EVT_CR05 hack_exchange à 35%, EVT_CR06 adoption à 70%
- **Mécanique apprise** : La DeFi amplifie tout — les rendements ET les risques. Si tu ne comprends pas d'où vient le yield, c'est toi le yield

### Niveau 39 — "Le survivant" *(Boss Crypto)*
> Bull run, crash, hack, régulation. Le cycle crypto complet. Ceux qui restent debout sont rares.

Validation. Cycle crypto complet avec les événements les plus violents. Le joueur doit garder la tête froide et son allocation sous contrôle.

- **Enveloppe** : Crypto
- **Event** : EVT_CR01 bull_run à 20%, EVT_CR02 crypto_winter à 45%, EVT_CR04 halving à 75%
- **Mécanique apprise** : Survie en environnement extrême — discipline, position sizing, patience

---

### Niveau 40 — "Le couteau suisse" *(Boss Intermédiaire)*
> Tu gères maintenant 5 enveloppes : Livret, AV, ETF, Actions et Crypto. Un krach boursier touche tes actions et ETF. La crypto plonge en même temps. Ton AV corrige. Seul le livret tient. Comment réagis-tu ?

Boss de fin de palier intermédiaire. Le joueur doit coordonner toutes les enveloppes apprises jusqu'ici dans un scénario de crise généralisée. Rééquilibrage, patience, allocation.

- **Enveloppe** : Livret + AV + PEA/CTO + Crypto
- **Event** : EVT_ETF04 krach à 20%, EVT_CR02 crypto_winter à 50%, EVT_AV03 correction à 80%
- **Mécanique apprise** : Gestion de crise multi-enveloppes — quand tout baisse, la stratégie fait la différence

---

# PALIER CONFIRMÉ — Niveaux 41 à 60

*Tu es prêt pour le grand bain. Capital bloqué pendant des années en Private Equity, effet de levier destructeur avec les produits dérivés, et gestion avancée de portefeuille multi-enveloppes. Ici, seule la discipline te sauve. Tu apprends les instruments les plus complexes et tu construis ta stratégie patrimoniale complète.*

---

## Phase 6 — PRIVATE EQUITY (Niveaux 41-46)
*"Le capital patient"*

Le joueur découvre l'investissement non coté. L'argent est bloqué, les rendements sont lents à se matérialiser, mais les exits peuvent être spectaculaires. On apprend la patience forcée et la gestion de trésorerie.

### Niveau 41 — "L'investissement patient"
> Tu investis dans un fonds PE. Ton argent est bloqué 7 ans minimum. Pas de bouton "vendre".

Découvrir le private equity. Comprendre l'illiquidité : tu ne peux pas sortir quand tu veux.

- **Enveloppe** : Private Equity (PE_FUND)
- **Event** : EVT_PE05 gel_valorisation à 50%
- **Mécanique apprise** : Illiquidité = rendement potentiel plus élevé, mais pas de sortie de secours

### Niveau 42 — "L'appel de fonds"
> Le fonds te demande de libérer du capital. Tu dois avoir la trésorerie prête.

Comprendre les appels de fonds. Le PE nécessite de la planification de trésorerie.

- **Enveloppe** : Private Equity
- **Event** : EVT_PE03 appel_de_fonds à 50%
- **Mécanique apprise** : Le PE engage au-delà du montant initial — prévoir la trésorerie

### Niveau 43 — "La licorne"
> Une startup du fonds atteint une valorisation d'un milliard. Ta part a été multipliée.

Vivre un succès PE. Comprendre que les gains viennent en marches d'escalier, pas en courbe.

- **Enveloppe** : Private Equity
- **Event** : EVT_PE01 startup_licorne à 50%
- **Mécanique apprise** : Le PE récompense la patience — les gains sont discontinus mais potentiellement massifs

### Niveau 44 — "La faillite dans le portefeuille"
> Une entreprise du fonds fait faillite. Perte sèche de 25%. Mais le fonds est diversifié.

Vivre un échec dans un fonds PE. Comprendre que c'est normal : un fonds PE a des gagnants ET des perdants.

- **Enveloppe** : Private Equity
- **Event** : EVT_PE02 faillite à 35%, EVT_PE01 licorne à 70%
- **Mécanique apprise** : En PE, 30% des investissements échouent — c'est prévu dans le modèle

### Niveau 45 — "L'exit spectaculaire"
> IPO d'une participation ! Le fonds distribue les gains. +40% sur cette ligne.

Vivre une sortie réussie. Comprendre les mécanismes de distribution en PE.

- **Enveloppe** : Private Equity
- **Event** : EVT_PE04 sortie_reussie à 50%
- **Mécanique apprise** : Les exits (IPO, rachat) sont le moment de vérité en PE

### Niveau 46 — "Le capital patient" *(Boss PE)*
> Cycle PE complet : appel de fonds, gel, faillite, licorne, exit. 7 ans en accéléré.

Validation. Le joueur traverse un cycle PE complet et comprend que ce type d'investissement n'est pas pour l'argent dont on a besoin.

- **Enveloppe** : Private Equity
- **Event** : EVT_PE03 appel à 20%, EVT_PE02 faillite à 45%, EVT_PE04 sortie à 75%
- **Mécanique apprise** : Maîtrise du PE — patience, trésorerie, acceptation des pertes

---

## Phase 7 — BOURSE AVEC PRODUITS DÉRIVÉS (Niveaux 47-52)
*"Le jeu des pros"*

Le joueur découvre les options et l'effet de levier. Les gains sont amplifiés, les pertes aussi. On peut tout perdre en une journée. C'est l'ultime test de maîtrise et de discipline.

### Niveau 47 — "L'effet de levier"
> Tu achètes un call sur l'ETF Monde. Avec 100€, tu contrôles l'équivalent de 1000€. Magique ? Dangereux.

Découvrir les produits dérivés et l'effet de levier. Comprendre que ça amplifie dans les deux sens.

- **Enveloppe** : Dérivés (DERIV_CALL)
- **Event** : EVT_DER03 volatilite_explose à 50%
- **Mécanique apprise** : Le levier multiplie les gains ET les pertes — c'est une arme à double tranchant

### Niveau 48 — "Le temps joue contre toi"
> Tes options perdent de la valeur chaque jour qui passe (thêta). Même si le marché ne bouge pas, tu perds.

Comprendre le thêta decay. Les options ont une date d'expiration — le temps est un coût.

- **Enveloppe** : Dérivés (DERIV_CALL, DERIV_PUT)
- **Event** : EVT_DER02 expiration_proche à 50%
- **Mécanique apprise** : Les dérivés ont une durée de vie — le temps est toujours contre l'acheteur

### Niveau 49 — "La couverture"
> Plutôt que de spéculer, tu utilises un put pour protéger ton portefeuille actions. L'assurance a un coût.

Découvrir l'usage défensif des dérivés. Un put est une assurance contre la baisse.

- **Enveloppe** : Dérivés (DERIV_PUT)
- **Event** : EVT_DER04 gap_overnight à 35%, EVT_DER05 couverture_parfaite à 70%
- **Mécanique apprise** : Les dérivés ne sont pas que spéculatifs — la couverture est leur usage le plus intelligent

### Niveau 50 — "Le short squeeze"
> Tu as vendu à découvert, convaincu que le marché allait baisser. Sauf que les acheteurs s'emballent. Ton call explose, ta position est liquidée.

Découvrir le short squeeze et la vente à découvert. Comprendre qu'on peut miser sur la baisse, mais que le risque est théoriquement illimité.

- **Enveloppe** : Dérivés (DERIV_CALL, DERIV_PUT)
- **Event** : EVT_DER01 squeeze_short à 50%
- **Mécanique apprise** : Shorter = parier sur la baisse avec un risque illimité — réservé aux plus disciplinés

### Niveau 51 — "Les stratégies combinées"
> Un call + un put sur le même actif = un straddle. Tu gagnes si le marché bouge fort, dans n'importe quelle direction.

Découvrir les stratégies optionnelles combinées. Comprendre que les dérivés permettent de parier sur la volatilité elle-même, pas seulement sur une direction.

- **Enveloppe** : Dérivés (DERIV_CALL + DERIV_PUT)
- **Event** : EVT_DER03 volatilite_explose à 35%, EVT_DER02 expiration à 70%
- **Mécanique apprise** : Les options permettent de parier sur la volatilité — pas seulement sur la hausse ou la baisse

### Niveau 52 — "L'arme maîtrisée" *(Boss Dérivés)*
> Gap overnight, squeeze, couverture, expiration. Les dérivés réunis dans un niveau. Ne risque jamais plus que ce que tu peux perdre.

Validation. Le joueur traverse un cycle dérivés complet. Il doit utiliser la couverture, gérer le thêta, et survivre aux événements violents.

- **Enveloppe** : Dérivés
- **Event** : EVT_DER04 gap à 20%, EVT_DER01 squeeze à 50%, EVT_DER05 couverture à 80%
- **Mécanique apprise** : Maîtrise des dérivés — levier contrôlé, couverture, gestion du temps

---

## Phase 8 — MAÎTRISE TOTALE (Niveaux 53-59)
*"Le stratège patrimonial"*

Le joueur maîtrise chaque enveloppe individuellement. Maintenant, il apprend à les orchestrer ensemble. Allocation globale, rééquilibrage, fiscalité croisée, gestion de crise à l'échelle du patrimoine. C'est ici qu'on passe d'investisseur à stratège.

### Niveau 53 — "L'allocation patrimoniale"
> Tu as 7 enveloppes. Combien dans chacune ? 50% actions, 20% crypto, 30% livret ? Ou l'inverse ? Construis TON allocation.

Définir une allocation cible globale en fonction de son profil, son horizon de temps et ses objectifs. Comprendre que l'allocation stratégique explique 90% de la performance long terme.

- **Enveloppe** : Toutes
- **Event** : EVT_ETF05 marche_stable à 40%, EVT_AV02 rallye à 75%
- **Mécanique apprise** : L'allocation d'actifs est LA décision la plus importante — elle explique 90% du rendement

### Niveau 54 — "La corrélation des actifs"
> Quand les actions baissent, l'or monte. Quand les taux montent, les obligations baissent. Rien ne bouge seul.

Comprendre les corrélations entre classes d'actifs. Découvrir qu'un portefeuille bien construit combine des actifs qui ne bougent pas dans la même direction.

- **Enveloppe** : PEA/CTO + Crypto + Assurance Vie
- **Event** : EVT_ETF04 krach à 30%, EVT_CR01 bull_run à 65%
- **Mécanique apprise** : La diversification fonctionne grâce à la décorrélation — chercher des actifs qui ne bougent pas ensemble

### Niveau 55 — "Le rééquilibrage global"
> Après un bull run crypto, ta poche crypto pèse 40% au lieu de 10%. Il faut vendre pour rééquilibrer. C'est contre-intuitif, mais c'est la discipline.

Apprendre le rééquilibrage à l'échelle du patrimoine global. Vendre ce qui a trop monté, renforcer ce qui a baissé. Mécaniquement, on achète bas et on vend haut.

- **Enveloppe** : Toutes
- **Event** : EVT_CR01 bull_run à 25%, EVT_ETF03 rotation à 55%, EVT_AV03 correction à 80%
- **Mécanique apprise** : Rééquilibrer = forcer la discipline d'acheter bas et vendre haut, sans émotion

### Niveau 56 — "La fiscalité multi-enveloppes"
> PEA exonéré après 5 ans, AV avantagée après 8 ans, CTO taxé chaque année. Où vendre en premier ? Où laisser grossir ?

Optimiser la fiscalité en jouant sur les enveloppes. Comprendre que l'ordre de retrait change radicalement le rendement net.

- **Enveloppe** : PEA + AV + CTO
- **Event** : EVT_ACT04 rallye à 35%, EVT_AV02 rallye à 70%
- **Mécanique apprise** : La fiscalité est le rendement caché — optimiser les retraits entre enveloppes peut valoir des milliers d'euros

### Niveau 57 — "Construire une rente"
> Dividendes, coupons, intérêts, distributions PE. Et si tu vivais de tes investissements ? Combien faut-il ?

Calculer le capital nécessaire pour générer un revenu passif. Comprendre la règle des 4% et ses limites. Concevoir un portefeuille orienté rendement.

- **Enveloppe** : Toutes
- **Event** : EVT_ACT02 dividende à 30%, EVT_PE04 sortie à 60%, EVT_AV01 baisse à 85%
- **Mécanique apprise** : La rente est le Graal — mais elle nécessite un capital conséquent et une allocation résiliente

### Niveau 58 — "La tempête parfaite"
> Krach boursier, crypto winter, hausse de taux, faillite PE. Tout tombe en même temps. C'est le stress test ultime de ton allocation.

Vivre le pire scénario possible : une crise systémique qui touche toutes les classes d'actifs. Seule l'allocation initiale et la discipline de ne pas tout vendre font la différence.

- **Enveloppe** : Toutes
- **Event** : EVT_ETF04 krach à 15%, EVT_CR02 crypto_winter à 35%, EVT_PE02 faillite à 60%, EVT_AV03 correction à 85%
- **Mécanique apprise** : Les crises systémiques sont rares mais réelles — survivre = ne pas paniquer et respecter son allocation

### Niveau 59 — "L'investisseur anti-fragile"
> Tu ne subis plus les crises. Tu les utilises. Couverture en dérivés, rachat d'actifs bradés, renforcement DCA. Le chaos est ton allié.

Synthèse de toutes les compétences : utiliser les dérivés pour couvrir, profiter des baisses pour renforcer, rééquilibrer en faveur des actifs décotés. L'anti-fragilité, c'est devenir plus fort à chaque crise.

- **Enveloppe** : Toutes
- **Event** : EVT_DER05 couverture à 20%, EVT_ETF04 krach à 45%, EVT_ETF02 rebond à 75%
- **Mécanique apprise** : L'anti-fragilité — profiter du désordre plutôt que le subir, en combinant toutes les enveloppes

---

### Niveau 60 — "Maître de ton destin" *(Boss Final)*
> Tout ton parcours en un niveau. Tu gères livrets, AV, ETF, actions, crypto, PE et dérivés. Un cycle économique complet avec les événements les plus violents. Prouve que tu maîtrises tout.

Le boss ultime. Le joueur gère l'ensemble de ses enveloppes à travers un cycle complet. Les événements sont multiples et violents. Seul un joueur qui a compris chaque phase peut réussir. Aucune aide, aucun rappel. Autonomie totale.

- **Enveloppe** : Toutes
- **Event** : EVT_ETF04 krach à 15%, EVT_CR02 crypto_winter à 35%, EVT_DER01 squeeze à 55%, EVT_PE02 faillite à 75%, EVT_ETF02 rebond à 90%
- **Mécanique apprise** : Autonomie totale — allocation multi-enveloppes, gestion de crise, discipline, construction patrimoniale

---

## Principes de design

### Progression par palier de difficulté

| Palier | Enveloppes disponibles | Émotion dominante | Leçon principale |
|--------|----------------------|-------------------|-------------------|
| Débutant | Livret, AV, ETF (PEA/CTO) | Confiance, curiosité | L'argent se gère, les frais comptent, l'inflation existe, la bourse n'est pas un casino |
| Intermédiaire | + Actions, + Crypto | Stress, tentation, doute | Les émotions sont l'ennemi, la méthode sauve, la volatilité est normale |
| Confirmé | + PE, + Dérivés, + Stratégie globale | Peur, euphorie, discipline | Seule la discipline distingue l'investisseur du joueur, l'allocation fait tout |

### Anti-redondance

1. **Chaque phase a sa propre "saveur"** : les livrets sont calmes et pédagogiques, la crypto est chaotique et émotionnelle, le PE est lent et stratégique, les dérivés sont rapides et techniques, la maîtrise totale est réflexive et stratégique.

2. **Les events sont spécifiques à chaque univers** : un "choc" sur un livret (baisse de taux) n'a rien à voir avec un "choc" en crypto (hack d'exchange). Le joueur ne revit jamais le même scénario.

3. **La mécanique change à chaque phase** :
   - Livret → intérêts garantis, inflation, épargne de précaution
   - AV → arbitrage, frais, profil de risque
   - ETF → DCA, diversification passive, patience
   - Actions → stock picking, dividendes, news corporate, ratios
   - Crypto → FOMO, cycles, risque technique, DeFi
   - PE → illiquidité, appels de fonds, exits
   - Dérivés → levier, thêta, couverture, stratégies combinées
   - Maîtrise → allocation globale, corrélation, rééquilibrage, fiscalité, rente

4. **Boss de fin de phase** : chaque phase se termine par un niveau de validation. Les boss de fin de palier (20, 40, 60) combinent les mécaniques de TOUTES les enveloppes du palier.

5. **Progression narrative** : le joueur passe du rôle d'épargnant prudent (Débutant) à investisseur actif (Intermédiaire) à stratège patrimonial (Confirmé). Chaque palier marque une transformation identitaire.

6. **Déblocage progressif** : les enveloppes se débloquent dans un ordre strict. Impossible de toucher aux dérivés sans avoir prouvé sa maîtrise des instruments précédents.
