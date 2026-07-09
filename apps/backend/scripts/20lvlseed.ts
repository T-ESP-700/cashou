/**
 * 20lvlseed.ts — Seed unique des 20 niveaux Cashou.
 *
 * Source de vérité : niveaux20.md (racine du repo).
 * Crée, de façon idempotente : 1 Market, 7 Submarkets, 10 Fields, 39 Assets
 * (+ AssetHistory généré), 20 Levels, leurs Events/Impacts, Goals/LevelGoals
 * et un Quiz MCQ par niveau (Questions + Answers).
 *
 * Re-exécutable sans créer de doublon (findFirst / upsert partout).
 *
 * Notes d'implémentation :
 *  - Les frais de gestion annuels sont persistés via `Asset.managementFee`
 *    (table MANAGEMENT_FEES) et déduits du rendement net par le moteur
 *    d'intérêts. Les frais d'entrée/sortie, eux, restent narratifs.
 *  - Le doc utilise goalType `wallet_gte_target` ; le backend ne gère que
 *    `wallet_min` (wallet >= montant absolu). Les goals bonus sont donc seedés
 *    en `wallet_min` avec goalValue = montant cible.
 *  - Capital garanti : les livrets ET les fonds euros n'ont AUCUN historique de
 *    prix → le moteur les valorise en `rate`-based déterministe (jamais de perte).
 *  - Events sur le *taux* d'un actif garanti (N°2 Livret A, N°4 fonds euros) :
 *    seedés en vrais Impact (coef). Pour un actif `rate`-based, le moteur
 *    interprète le coef comme un multiplicateur du *taux* à partir du
 *    déclenchement ; pour un actif à historique, comme un multiplicateur de
 *    *valeur*. Un même Impact field+submarket touche donc tous les actifs du
 *    couple, qu'ils soient à taux ou à prix.
 *
 * Usage : bun run db:seed:20lvl
 */

import { PrismaClient } from '@cashou/db-app';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Génération d'historique de prix
// ---------------------------------------------------------------------------

const HISTORY_START_DATE = new Date('2018-01-01');
const HISTORY_START_DAY = 365;       // chaque niveau démarre à J+365 (1 an de passé visible)
const TOTAL_HISTORY_DAYS = HISTORY_START_DAY + 2920 + 30; // couvre le N°20 (2920 j) + marge

/**
 * Marche aléatoire avec drift — données de marché pures, sans events bakés.
 * Les events sont appliqués au runtime par le backend.
 */
function generatePriceHistory(
  assetId: number,
  startPrice: number,       // en centimes
  annualRate: number,       // ex: 8 pour 8 %
  dailyVolatility: number,  // ex: 0.012 pour 1,2 %
  days: number = TOTAL_HISTORY_DAYS,
): { assetId: number; timestamp: Date; value: number }[] {
  const dailyDrift = Math.pow(1 + annualRate / 100, 1 / 365) - 1;
  const points: { assetId: number; timestamp: Date; value: number }[] = [];
  let price = startPrice;

  for (let d = 0; d < days; d++) {
    const date = new Date(HISTORY_START_DATE);
    date.setDate(date.getDate() + d);
    const random = (Math.random() - 0.5) * 2; // [-1, 1]
    price = Math.round(price * (1 + dailyDrift + dailyVolatility * random));
    if (price < 1) price = 1;
    points.push({ assetId, timestamp: date, value: price });
  }
  return points;
}

async function resetSequences() {
  const tables = [
    'levels', 'markets', 'submarkets', 'fields', 'assets', 'events',
    'impacts', 'level_events', 'level_goals', 'goals', 'quiz',
    'questions', 'answers', 'quiz_questions',
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`,
    );
  }
}

// ---------------------------------------------------------------------------
// Définitions statiques : Submarkets, Fields, Assets
// ---------------------------------------------------------------------------

const MARKET_TITLE = "Univers d'investissement Cashou";

type SubmarketType = 'SAVINGS' | 'INSURANCE' | 'STOCK';

interface SubmarketDef { key: string; title: string; type: SubmarketType; description: string }

const SUBMARKETS: SubmarketDef[] = [
  { key: 'LIVRETS', title: 'Livrets', type: 'SAVINGS', description: "Livrets d'épargne réglementés et bancaires : capital garanti, rendement modéré, liquidité totale." },
  { key: 'AV', title: 'Assurance vie', type: 'INSURANCE', description: "Enveloppe phare des Français : fonds euros à capital garanti et unités de compte plus dynamiques." },
  { key: 'PEA', title: 'PEA', type: 'STOCK', description: "Plan d'Épargne en Actions : actions européennes dans une enveloppe fiscalement avantageuse après 5 ans." },
  { key: 'OBLIGATIONS', title: 'Obligations', type: 'STOCK', description: "Titres de dette d'États et d'entreprises : un coupon régulier contre la volatilité des actions." },
  { key: 'ETF_PEA', title: 'ETF PEA', type: 'STOCK', description: "Fonds indiciels éligibles au PEA : diversification instantanée à frais très réduits." },
  { key: 'CTO', title: 'CTO', type: 'STOCK', description: "Compte-Titres Ordinaire : accès sans plafond aux actions américaines et aux ETF mondiaux." },
  { key: 'ALTERNATIFS', title: 'Alternatifs', type: 'STOCK', description: "Placements décorrélés : immobilier papier (SCPI, OPCI) et crowdlending." },
];

// Field.name est unique : la clé sert directement de name.
const FIELDS: string[] = [
  'livret_reglemente', 'livret_bancaire', 'fonds_euros', 'uc', 'action_pea',
  'obligation', 'etf_pea', 'action_us', 'etf_monde', 'alternatif',
];

interface AssetDef {
  symbol: string;
  title: string;
  submarket: string;       // clé SubmarketDef
  field: string;           // nom de Field
  rate: number;            // %
  maxAmount: number | null;
  minAmount: number;
  description: string;
  volatility: number;      // volatilité quotidienne pour l'historique
}

const ASSETS: AssetDef[] = [
  // --- Livrets ---
  { symbol: 'C20_LIVRET_A', title: 'Livret A', submarket: 'LIVRETS', field: 'livret_reglemente', rate: 1.5, maxAmount: 22950, minAmount: 10, volatility: 0,
    description: "Livret d'épargne réglementé à capital garanti, taux révisé chaque semestre par la Banque de France. Plafond 22 950 €." },
  { symbol: 'C20_LDDS', title: 'LDDS', submarket: 'LIVRETS', field: 'livret_reglemente', rate: 1.5, maxAmount: 12000, minAmount: 10, volatility: 0,
    description: "Livret de Développement Durable et Solidaire : même taux que le Livret A, plafond supplémentaire de 12 000 €." },
  { symbol: 'C20_LEP', title: 'LEP', submarket: 'LIVRETS', field: 'livret_reglemente', rate: 2.5, maxAmount: 10000, minAmount: 10, volatility: 0,
    description: "Livret d'Épargne Populaire réservé aux revenus modestes : le seul livret qui bat durablement l'inflation. Plafond 10 000 €." },
  { symbol: 'C20_LIVRET_JEUNE', title: 'Livret Jeune', submarket: 'LIVRETS', field: 'livret_reglemente', rate: 1.5, maxAmount: 1600, minAmount: 10, volatility: 0,
    description: "Livret réservé aux 12-25 ans, taux au moins égal au Livret A. Plafond 1 600 €." },
  { symbol: 'C20_CEL', title: 'CEL', submarket: 'LIVRETS', field: 'livret_bancaire', rate: 1.0, maxAmount: 15300, minAmount: 10, volatility: 0,
    description: "Compte Épargne Logement rémunéré à environ deux tiers du Livret A. Plafond 15 300 €." },
  { symbol: 'C20_PEL', title: 'PEL', submarket: 'LIVRETS', field: 'livret_bancaire', rate: 2.0, maxAmount: 61200, minAmount: 10, volatility: 0,
    description: "Plan Épargne Logement à taux fixe garanti, avec blocage de 4 ans minimum." },

  // --- Assurance vie ---
  { symbol: 'C20_FE_CLASSIQUE', title: 'Fonds Euros Classique', submarket: 'AV', field: 'fonds_euros', rate: 2.65, maxAmount: null, minAmount: 10, volatility: 0.001,
    description: "Fonds euros à capital garanti, cœur de l'assurance vie française. Rendement ~2,65 %. Frais de gestion ~0,6 %/an." },
  { symbol: 'C20_FE_DYNAMIQUE', title: 'Fonds Euros Dynamique', submarket: 'AV', field: 'fonds_euros', rate: 3.5, maxAmount: null, minAmount: 10, volatility: 0.003,
    description: "Fonds euros « boosté » : rendement supérieur (~3,5 %) en contrepartie d'une part minimale en UC. Frais de gestion ~0,8 %/an." },
  { symbol: 'C20_UC_ACTIONS_EUROPE', title: 'UC Actions Europe', submarket: 'AV', field: 'uc', rate: 6, maxAmount: null, minAmount: 10, volatility: 0.011,
    description: "Unité de compte investie en actions européennes. Capital non garanti, performance liée aux marchés." },
  { symbol: 'C20_UC_OBLIGATIONS', title: 'UC Obligations', submarket: 'AV', field: 'uc', rate: 3, maxAmount: null, minAmount: 10, volatility: 0.004,
    description: "Unité de compte obligataire : plus stable que les UC actions, sensible aux taux d'intérêt." },
  { symbol: 'C20_UC_SCPI', title: 'UC SCPI', submarket: 'AV', field: 'uc', rate: 4, maxAmount: null, minAmount: 10, volatility: 0.005,
    description: "Unité de compte immobilière (SCPI) logée dans l'assurance vie : loyers mutualisés." },
  { symbol: 'C20_UC_ETF_MONDE', title: 'UC ETF Monde', submarket: 'AV', field: 'uc', rate: 7, maxAmount: null, minAmount: 10, volatility: 0.012,
    description: "Unité de compte répliquant un indice actions mondial via un ETF." },

  // --- PEA (actions) ---
  { symbol: 'C20_TOTALENERGIES', title: 'TotalEnergies', submarket: 'PEA', field: 'action_pea', rate: 6, maxAmount: null, minAmount: 10, volatility: 0.014,
    description: "Major de l'énergie : action cyclique sensible au prix du pétrole, dividende généreux." },
  { symbol: 'C20_LVMH', title: 'LVMH', submarket: 'PEA', field: 'action_pea', rate: 8, maxAmount: null, minAmount: 10, volatility: 0.016,
    description: "Leader mondial du luxe : action de croissance au profil cyclique." },
  { symbol: 'C20_SANOFI', title: 'Sanofi', submarket: 'PEA', field: 'action_pea', rate: 5, maxAmount: null, minAmount: 10, volatility: 0.011,
    description: "Laboratoire pharmaceutique : valeur défensive, résistante aux récessions." },
  { symbol: 'C20_BNP_PARIBAS', title: 'BNP Paribas', submarket: 'PEA', field: 'action_pea', rate: 7, maxAmount: null, minAmount: 10, volatility: 0.015,
    description: "Grande banque européenne : action cyclique sensible aux taux et à la conjoncture." },
  { symbol: 'C20_DANONE', title: 'Danone', submarket: 'PEA', field: 'action_pea', rate: 4, maxAmount: null, minAmount: 10, volatility: 0.010,
    description: "Géant de l'agroalimentaire : valeur défensive de consommation courante." },
  { symbol: 'C20_LOREAL', title: "L'Oréal", submarket: 'PEA', field: 'action_pea', rate: 7, maxAmount: null, minAmount: 10, volatility: 0.012,
    description: "Numéro un mondial des cosmétiques : valeur de qualité à croissance régulière." },
  { symbol: 'C20_AIRBUS', title: 'Airbus', submarket: 'PEA', field: 'action_pea', rate: 8, maxAmount: null, minAmount: 10, volatility: 0.016,
    description: "Constructeur aéronautique : action cyclique liée au cycle d'investissement." },

  // --- Obligations ---
  { symbol: 'C20_OAT_10', title: 'OAT France 10 ans', submarket: 'OBLIGATIONS', field: 'obligation', rate: 3.4, maxAmount: null, minAmount: 10, volatility: 0.004,
    description: "Obligation d'État français à 10 ans : référence du marché obligataire de la zone euro." },
  { symbol: 'C20_OAT_30', title: 'OAT France 30 ans', submarket: 'OBLIGATIONS', field: 'obligation', rate: 3.8, maxAmount: null, minAmount: 10, volatility: 0.009,
    description: "Obligation d'État français à 30 ans : duration longue, très sensible aux variations de taux." },
  { symbol: 'C20_BUND_10', title: 'Bund Allemagne 10 ans', submarket: 'OBLIGATIONS', field: 'obligation', rate: 2.8, maxAmount: null, minAmount: 10, volatility: 0.003,
    description: "Obligation d'État allemand à 10 ans : valeur refuge de référence de la zone euro." },
  { symbol: 'C20_CORPORATE_BBB', title: 'Corporate BBB', submarket: 'OBLIGATIONS', field: 'obligation', rate: 4.5, maxAmount: null, minAmount: 10, volatility: 0.006,
    description: "Obligation d'entreprise solide (notation BBB) : coupon supérieur aux OAT, risque modéré." },
  { symbol: 'C20_HIGH_YIELD', title: 'High Yield', submarket: 'OBLIGATIONS', field: 'obligation', rate: 7.5, maxAmount: null, minAmount: 10, volatility: 0.015,
    description: "Obligation à haut rendement : coupon élevé en contrepartie d'un fort risque de défaut." },

  // --- ETF PEA ---
  { symbol: 'C20_ETF_CAC40', title: 'ETF CAC 40', submarket: 'ETF_PEA', field: 'etf_pea', rate: 7, maxAmount: null, minAmount: 10, volatility: 0.012,
    description: "ETF répliquant les 40 plus grandes capitalisations françaises." },
  { symbol: 'C20_ETF_MSCI_EUROPE', title: 'ETF MSCI Europe', submarket: 'ETF_PEA', field: 'etf_pea', rate: 7, maxAmount: null, minAmount: 10, volatility: 0.012,
    description: "ETF répliquant les grandes entreprises européennes." },
  { symbol: 'C20_AMUNDI_PEA_MONDE', title: 'Amundi PEA Monde', submarket: 'ETF_PEA', field: 'etf_pea', rate: 8, maxAmount: null, minAmount: 10, volatility: 0.012,
    description: "ETF synthétique mondial éligible au PEA : exposition mondiale à frais très réduits (~0,2 %)." },

  // --- CTO ---
  { symbol: 'C20_APPLE', title: 'Apple', submarket: 'CTO', field: 'action_us', rate: 9, maxAmount: null, minAmount: 10, volatility: 0.016,
    description: "Géant technologique américain : valeur phare de la tech mondiale." },
  { symbol: 'C20_MICROSOFT', title: 'Microsoft', submarket: 'CTO', field: 'action_us', rate: 10, maxAmount: null, minAmount: 10, volatility: 0.015,
    description: "Leader du logiciel et du cloud : valeur de croissance régulière." },
  { symbol: 'C20_TESLA', title: 'Tesla', submarket: 'CTO', field: 'action_us', rate: 12, maxAmount: null, minAmount: 10, volatility: 0.028,
    description: "Constructeur de véhicules électriques : action de croissance très volatile." },
  { symbol: 'C20_NVIDIA', title: 'Nvidia', submarket: 'CTO', field: 'action_us', rate: 14, maxAmount: null, minAmount: 10, volatility: 0.030,
    description: "Leader des semi-conducteurs et de l'IA : action de croissance très volatile." },
  { symbol: 'C20_AMAZON', title: 'Amazon', submarket: 'CTO', field: 'action_us', rate: 10, maxAmount: null, minAmount: 10, volatility: 0.018,
    description: "Géant du e-commerce et du cloud computing." },
  { symbol: 'C20_ETF_SP500', title: 'ETF S&P 500', submarket: 'CTO', field: 'etf_monde', rate: 9, maxAmount: null, minAmount: 10, volatility: 0.013,
    description: "ETF répliquant les 500 plus grandes entreprises américaines." },
  { symbol: 'C20_ETF_MSCI_WORLD', title: 'ETF MSCI World', submarket: 'CTO', field: 'etf_monde', rate: 8, maxAmount: null, minAmount: 10, volatility: 0.012,
    description: "ETF répliquant plus de 1 500 entreprises des pays développés." },
  { symbol: 'C20_ETF_EMERGENTS', title: 'ETF Émergents', submarket: 'CTO', field: 'etf_monde', rate: 7, maxAmount: null, minAmount: 10, volatility: 0.016,
    description: "ETF actions des marchés émergents : potentiel de croissance élevé, forte volatilité." },
  { symbol: 'C20_ETF_NASDAQ', title: 'ETF Nasdaq', submarket: 'CTO', field: 'etf_monde', rate: 11, maxAmount: null, minAmount: 10, volatility: 0.018,
    description: "ETF répliquant l'indice technologique américain Nasdaq 100." },

  // --- Alternatifs ---
  { symbol: 'C20_SCPI_DIRECTE', title: 'SCPI directe', submarket: 'ALTERNATIFS', field: 'alternatif', rate: 4.5, maxAmount: null, minAmount: 10, volatility: 0.004,
    description: "Société Civile de Placement Immobilier détenue en direct : immobilier locatif mutualisé." },
  { symbol: 'C20_CROWDLENDING', title: 'Crowdlending', submarket: 'ALTERNATIFS', field: 'alternatif', rate: 8, maxAmount: null, minAmount: 10, volatility: 0.006,
    description: "Prêt participatif à des entreprises ou projets : rendement élevé, risque de défaut." },
  { symbol: 'C20_OPCI', title: 'OPCI', submarket: 'ALTERNATIFS', field: 'alternatif', rate: 4, maxAmount: null, minAmount: 10, volatility: 0.008,
    description: "Organisme de Placement Collectif Immobilier : mêle immobilier et actifs liquides." },
];

// Frais de gestion annuels (% par an) par symbole. Symbole absent = 0 (sans frais).
// Persistés en base (Asset.managementFee) et déduits du rendement net par le
// moteur d'intérêts — c'est le « piège des frais » du N°4, désormais réellement
// ressenti. Les actifs détenus en direct (livrets, actions, obligations) n'ont
// pas de frais de gestion ; les enveloppes gérées (fonds euros, UC, ETF) si.
const MANAGEMENT_FEES: Record<string, number> = {
  C20_FE_CLASSIQUE: 0.6,
  C20_FE_DYNAMIQUE: 0.8,
  C20_UC_ACTIONS_EUROPE: 0.8,
  C20_UC_OBLIGATIONS: 0.8,
  C20_UC_SCPI: 0.8,
  C20_UC_ETF_MONDE: 0.8,
  C20_ETF_CAC40: 0.25,
  C20_ETF_MSCI_EUROPE: 0.25,
  C20_AMUNDI_PEA_MONDE: 0.2,
  C20_ETF_SP500: 0.15,
  C20_ETF_MSCI_WORLD: 0.2,
  C20_ETF_EMERGENTS: 0.3,
  C20_ETF_NASDAQ: 0.3,
};

const LIVRET_SYMBOLS = ASSETS
  .filter((asset) => asset.submarket === 'LIVRETS')
  .map((asset) => asset.symbol);
const FONDS_EUROS_SYMBOLS = ASSETS
  .filter((asset) => asset.submarket === 'AV' && asset.field === 'fonds_euros')
  .map((asset) => asset.symbol);
const UC_SYMBOLS = ASSETS
  .filter((asset) => asset.submarket === 'AV' && asset.field === 'uc')
  .map((asset) => asset.symbol);
const PEA_SYMBOLS = ASSETS
  .filter((asset) => asset.submarket === 'PEA')
  .map((asset) => asset.symbol);
const OBLIGATION_SYMBOLS = ASSETS
  .filter((asset) => asset.submarket === 'OBLIGATIONS')
  .map((asset) => asset.symbol);
const ETF_PEA_SYMBOLS = ASSETS
  .filter((asset) => asset.submarket === 'ETF_PEA')
  .map((asset) => asset.symbol);
const CTO_SYMBOLS = ASSETS
  .filter((asset) => asset.submarket === 'CTO')
  .map((asset) => asset.symbol);
const ALTERNATIF_SYMBOLS = ASSETS
  .filter((asset) => asset.submarket === 'ALTERNATIFS')
  .map((asset) => asset.symbol);

function getAvailableAssetSymbolsForLevel(levelNumber: number): string[] {
  if (levelNumber <= 1) {
    return ['C20_LIVRET_A'];
  }
  if (levelNumber === 2) {
    return ['C20_LIVRET_A', 'C20_LDDS'];
  }
  if (levelNumber === 3) {
    return [...LIVRET_SYMBOLS];
  }
  if (levelNumber === 4) {
    return [...LIVRET_SYMBOLS, ...FONDS_EUROS_SYMBOLS];
  }
  if (levelNumber <= 6) {
    return [...LIVRET_SYMBOLS, ...FONDS_EUROS_SYMBOLS, ...UC_SYMBOLS];
  }
  if (levelNumber <= 8) {
    return [...LIVRET_SYMBOLS, ...FONDS_EUROS_SYMBOLS, ...UC_SYMBOLS, ...PEA_SYMBOLS];
  }
  if (levelNumber === 9) {
    return [...LIVRET_SYMBOLS, ...FONDS_EUROS_SYMBOLS, ...UC_SYMBOLS, ...PEA_SYMBOLS, ...OBLIGATION_SYMBOLS];
  }
  if (levelNumber === 10) {
    return [...LIVRET_SYMBOLS, ...FONDS_EUROS_SYMBOLS, ...UC_SYMBOLS, ...PEA_SYMBOLS, ...OBLIGATION_SYMBOLS, ...ETF_PEA_SYMBOLS];
  }
  if (levelNumber <= 15) {
    return [...LIVRET_SYMBOLS, ...FONDS_EUROS_SYMBOLS, ...UC_SYMBOLS, ...PEA_SYMBOLS, ...OBLIGATION_SYMBOLS, ...ETF_PEA_SYMBOLS, ...CTO_SYMBOLS];
  }
  return [
    ...LIVRET_SYMBOLS,
    ...FONDS_EUROS_SYMBOLS,
    ...UC_SYMBOLS,
    ...PEA_SYMBOLS,
    ...OBLIGATION_SYMBOLS,
    ...ETF_PEA_SYMBOLS,
    ...CTO_SYMBOLS,
    ...ALTERNATIF_SYMBOLS,
  ];
}

// ---------------------------------------------------------------------------
// Définitions des 20 niveaux
// ---------------------------------------------------------------------------

type ImpactDef =
  | { asset: string; coef: number }
  | { field: string; submarket: string; coef: number };

interface EventDef {
  title: string;
  description: string;
  triggerPercent: number;
  position: number;
  impacts: ImpactDef[]; // vide => hasImpact: false (narratif)
}

interface GoalDef {
  title: string;
  description: string;
  successMessage: string;
  failureMessage: string;
}

interface QuestionDef {
  text: string;
  explanation: string;
  answers: { text: string; isCorrect: boolean }[];
}

interface LevelDef {
  number: number;
  title: string;
  duration: number;
  speed: number;
  startBalance: number;
  pointsRequired: number;
  description: string;
  mandatoryGoal: GoalDef;
  bonusGoal: GoalDef & { target: number };
  events: EventDef[];
  quizTitle: string;
  quizDescription: string;
  questions: QuestionDef[];
}

const LEVELS: LevelDef[] = [
  // ===================== NIVEAU 1 =====================
  {
    number: 1,
    title: 'Ton premier placement : le Livret A',
    duration: 90,
    speed: 262800,
    startBalance: 1500,
    pointsRequired: 0,
    description: "Tu disposes d'un premier capital à faire fructifier. Avant la bourse, l'assurance vie ou les ETF, il y a un placement que 80 % des Français possèdent : le Livret A. Capital garanti, taux réglementé révisé chaque semestre par la Banque de France, retraits libres. Ton point de départ d'investisseur.",
    mandatoryGoal: {
      title: 'Place ton capital sur un livret',
      description: 'Termine le niveau sans perdre de capital par rapport à ton solde de départ.',
      successMessage: 'Bravo : ton capital est intact, tu as fait tes premiers pas d\'épargnant.',
      failureMessage: 'Ton capital a baissé. Place ton argent dès le début sur un livret pour le sécuriser.',
    },
    bonusGoal: {
      title: 'Tes premiers intérêts',
      description: 'Termine avec au moins 1 505 € : sur 90 jours à 1,5 %, le Livret A rapporte ~5,50 €.',
      successMessage: 'Tes premiers intérêts sont tombés : lent mais sûr, c\'est ça l\'épargne.',
      failureMessage: 'Tu n\'as pas capté tous tes intérêts. Place ton capital plus tôt dans le niveau.',
      target: 1505,
    },
    events: [
      { title: "Versement d'intérêts en fin d'année", triggerPercent: 80, position: 1, impacts: [],
        description: "Les intérêts du Livret A sont calculés par quinzaine et crédités chaque 31 décembre. Un placement sécurisé, c'est lent mais régulier : ne t'attends pas à devenir riche avec un livret seul." },
    ],
    quizTitle: 'Quiz Niveau 1 — Le Livret A',
    quizDescription: 'Teste tes connaissances sur le premier placement de tout épargnant.',
    questions: [
      { text: "Qu'est-ce que le Livret A ?",
        explanation: "Le Livret A est un livret d'épargne réglementé à capital garanti, dont le taux est fixé par l'État et révisé chaque semestre.",
        answers: [
          { text: 'Un compte courant gratuit', isCorrect: false },
          { text: "Un livret d'épargne réglementé à capital garanti, dont le taux est révisé chaque semestre", isCorrect: true },
          { text: 'Un placement en bourse', isCorrect: false },
        ] },
      { text: 'Le capital placé sur un Livret A est-il garanti ?',
        explanation: "Oui : le capital du Livret A est intégralement garanti par l'État, il ne peut pas baisser.",
        answers: [
          { text: 'Non, il varie avec les marchés', isCorrect: false },
          { text: "Oui, il est entièrement garanti par l'État", isCorrect: true },
          { text: 'Seulement après 5 ans', isCorrect: false },
        ] },
      { text: "Pourquoi placer son argent sur un Livret A plutôt que de le laisser dormir ?",
        explanation: "Un Livret A génère des intérêts sans aucun risque : même modestes, ils valent mieux que de l'argent qui dort.",
        answers: [
          { text: 'Pour générer des intérêts sans risque, même modestes', isCorrect: true },
          { text: 'Pour spéculer sur les marchés', isCorrect: false },
          { text: 'Pour éviter les impôts uniquement', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 2 =====================
  {
    number: 2,
    title: 'LDDS et intérêts composés',
    duration: 180,
    speed: 262800,
    startBalance: 2500,
    pointsRequired: 5,
    description: "Le Livret A a un plafond (22 950 €). Heureusement, son jumeau le LDDS (Livret de Développement Durable et Solidaire) offre exactement le même taux et un plafond supplémentaire de 12 000 €. Découvre aussi le pouvoir des intérêts composés sur 6 mois.",
    mandatoryGoal: {
      title: 'Protège et fais fructifier ton capital',
      description: 'Termine le niveau sans entamer ton capital de départ.',
      successMessage: 'Capital préservé : tes livrets jouent leur rôle de coffre-fort.',
      failureMessage: 'Ton capital a reculé. Répartis-le sur tes livrets dès le début du niveau.',
    },
    bonusGoal: {
      title: 'Profite pleinement du taux livrets',
      description: 'Termine avec au moins 2 515 € : sur 180 jours, le taux baissant de 1,5 % à 1,3 % à mi-parcours, le rendement attendu est ~17 €.',
      successMessage: 'Tu as capté tout le rendement de tes livrets, malgré la révision du taux.',
      failureMessage: "Tu laisses du rendement de côté. Place ton capital tôt et profite des deux plafonds.",
      target: 2515,
    },
    events: [
      { title: 'Révision semestrielle du taux Livret A', triggerPercent: 50, position: 1,
        impacts: [{ field: 'livret_reglemente', submarket: 'LIVRETS', coef: 0.8667 }],
        description: "Le taux réglementé est révisé chaque 1er février et 1er août par la Banque de France selon une formule (inflation + taux interbancaire). Il passe de 1,5 % à 1,3 % pour la deuxième moitié du niveau." },
    ],
    quizTitle: 'Quiz Niveau 2 — Livrets et intérêts composés',
    quizDescription: "Plafonds, fiscalité et magie des intérêts composés.",
    questions: [
      { text: 'Quel est le plafond du Livret A ?',
        explanation: 'Le plafond de versement du Livret A est fixé à 22 950 € (hors intérêts capitalisés).',
        answers: [
          { text: '5 000 €', isCorrect: false },
          { text: '22 950 €', isCorrect: true },
          { text: 'Illimité', isCorrect: false },
        ] },
      { text: 'Les intérêts du Livret A et du LDDS sont-ils imposables ?',
        explanation: "Non : les intérêts du Livret A et du LDDS sont totalement exonérés d'impôt et de prélèvements sociaux.",
        answers: [
          { text: 'Oui, à 30 %', isCorrect: false },
          { text: "Non, totalement exonérés d'impôt et de prélèvements sociaux", isCorrect: true },
          { text: 'Seulement après 8 ans', isCorrect: false },
        ] },
      { text: "Qu'est-ce que l'intérêt composé ?",
        explanation: "L'intérêt composé est un intérêt qui génère lui-même des intérêts l'année suivante : le capital grossit de façon exponentielle.",
        answers: [
          { text: 'Un intérêt fixe dans le temps', isCorrect: false },
          { text: "Un intérêt qui génère lui-même des intérêts l'année suivante", isCorrect: true },
          { text: 'Un intérêt négatif', isCorrect: false },
        ] },
      { text: 'Peut-on cumuler Livret A et LDDS ?',
        explanation: 'Oui : on peut détenir un Livret A et un LDDS en même temps et profiter des deux plafonds.',
        answers: [
          { text: 'Non, un seul livret réglementé par personne', isCorrect: false },
          { text: 'Oui, on peut détenir les deux et profiter des deux plafonds', isCorrect: true },
          { text: 'Oui, mais seulement après 18 ans', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 3 =====================
  {
    number: 3,
    title: 'Diversifie tes livrets : LEP, Livret Jeune, CEL, PEL',
    duration: 365,
    speed: 262800,
    startBalance: 3500,
    pointsRequired: 15,
    description: "Tous les livrets ne se valent pas. Le LEP rapporte 2,5 % (sous condition de revenus), le Livret Jeune au moins 1,5 % (12-25 ans), le CEL 1 % (≈ 2/3 du Livret A) et le PEL nouveau 2 %. Apprends à composer le mix optimal selon ton profil — et découvre les ennemis silencieux du livret : inflation et fiscalité.",
    mandatoryGoal: {
      title: "Bats l'inflation simulée",
      description: 'Termine sans perdre de capital, malgré une inflation simulée qui grignote le pouvoir d\'achat.',
      successMessage: "Ton capital tient face à l'inflation : tu as choisi les bons livrets.",
      failureMessage: "L'inflation a eu le dernier mot. Privilégie les livrets les mieux rémunérés.",
    },
    bonusGoal: {
      title: 'Mix optimal LEP + Livret A',
      description: 'Termine avec au moins 3 580 € en privilégiant le LEP (2,5 %) sous son plafond.',
      successMessage: 'Mix optimal réussi : ~2,3 % sur l\'année en jouant le LEP.',
      failureMessage: "Tu peux faire mieux : concentre ton épargne sur le LEP, le seul livret qui bat l'inflation.",
      target: 3580,
    },
    events: [
      { title: 'Le LEP devient accessible', triggerPercent: 30, position: 1, impacts: [],
        description: "Éligibilité confirmée par l'administration fiscale (sous plafond de revenus). Le Livret d'Épargne Populaire à 2,5 % est débloqué : le seul livret qui bat encore l'inflation." },
      { title: "Pic d'inflation à 2,5 %", triggerPercent: 60, position: 2, impacts: [],
        description: "Le pouvoir d'achat des livrets sous 2,5 % recule. Seul le LEP suit : le Livret A à 1,5 % perd 1 point en réel." },
    ],
    quizTitle: 'Quiz Niveau 3 — Livrets, inflation et fiscalité',
    quizDescription: "Le bon livret selon ton profil, et comment l'inflation ronge l'épargne.",
    questions: [
      { text: "Qu'est-ce que l'inflation ?",
        explanation: "L'inflation est la hausse générale et durable des prix, qui réduit le pouvoir d'achat de l'argent.",
        answers: [
          { text: 'Hausse générale des prix', isCorrect: true },
          { text: 'Baisse des salaires', isCorrect: false },
          { text: 'Une taxe', isCorrect: false },
        ] },
      { text: "Un livret à 1,5 % avec une inflation à 2,5 %, je gagne en pouvoir d'achat...",
        explanation: "Si le livret rapporte 1,5 % et l'inflation est de 2,5 %, le rendement réel est négatif : -1 %.",
        answers: [
          { text: '+1,5 %', isCorrect: false },
          { text: '-1 % (je perds en réalité)', isCorrect: true },
          { text: '0 %', isCorrect: false },
        ] },
      { text: 'Qui peut ouvrir un LEP ?',
        explanation: 'Le LEP est réservé aux personnes dont les revenus sont sous un plafond fiscal.',
        answers: [
          { text: 'Tout le monde', isCorrect: false },
          { text: 'Les personnes à revenus modestes sous plafond fiscal', isCorrect: true },
          { text: 'Uniquement les investisseurs confirmés', isCorrect: false },
        ] },
      { text: "Quel est le plafond du Livret Jeune et qui peut l'ouvrir ?",
        explanation: 'Le Livret Jeune est plafonné à 1 600 € et réservé aux 12-25 ans.',
        answers: [
          { text: '22 950 €, tout le monde', isCorrect: false },
          { text: '1 600 €, les 12-25 ans', isCorrect: true },
          { text: '10 000 €, les retraités', isCorrect: false },
        ] },
      { text: "Quelle est la meilleure défense contre l'inflation longue ?",
        explanation: "Pour battre l'inflation sur le long terme, il faut des actifs dont le rendement la dépasse durablement.",
        answers: [
          { text: 'Laisser l\'argent sur un placement non rémunéré', isCorrect: false },
          { text: "Placer sur des actifs dont le rendement dépasse durablement l'inflation", isCorrect: true },
          { text: 'Acheter uniquement de l\'or', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 4 =====================
  {
    number: 4,
    title: 'Assurance vie : fonds euros',
    duration: 365,
    speed: 197100,
    startBalance: 5000,
    pointsRequired: 30,
    description: "Les livrets plafonnent autour de 22 950 €. Pour aller au-delà sans risquer ton capital, l'assurance vie en fonds euros est l'arme secrète des Français : capital garanti, rendement moyen 2,65 % en 2025 (jusqu'à 4 % sur les meilleurs contrats), fiscalité avantageuse après 8 ans. C'est l'enveloppe la plus détenue du pays — 1 900 milliards € sous gestion.",
    mandatoryGoal: {
      title: 'Protège ton capital',
      description: 'Termine le niveau sans perdre de capital de départ.',
      successMessage: 'Capital garanti tenu : le fonds euros joue parfaitement son rôle.',
      failureMessage: 'Ton capital a baissé. Le fonds euros garantit le capital : places-y ton argent.',
    },
    bonusGoal: {
      title: 'Rendement supérieur au Livret A',
      description: 'Termine avec au moins 5 100 € grâce au fonds euros.',
      successMessage: 'Ton fonds euros a battu le Livret A : bien joué.',
      failureMessage: "Tu n'as pas pleinement profité du fonds euros. Investis-y plus tôt.",
      target: 5100,
    },
    events: [
      { title: 'Hausse des taux directeurs BCE', triggerPercent: 40, position: 1,
        impacts: [{ asset: 'C20_FE_CLASSIQUE', coef: 1.2075 }],
        description: "La BCE relève ses taux pour combattre l'inflation. Les fonds euros adossés à des obligations longues en profitent : le Fonds Euros Classique grimpe de 2,65 % à 3,2 %." },
      { title: 'Le piège des frais de gestion', triggerPercent: 75, position: 2, impacts: [],
        description: "0,8 %/an de frais sur 30 ans, c'est environ 25 % du capital final amputé. Les frais paraissent petits, leur effet composé est gigantesque." },
    ],
    quizTitle: 'Quiz Niveau 4 — Assurance vie et fonds euros',
    quizDescription: "Capital garanti, rendement et horizon de l'assurance vie.",
    questions: [
      { text: 'Un fonds euros en assurance vie garantit-il le capital ?',
        explanation: 'Oui : la garantie du capital est la règle même du fonds en euros.',
        answers: [
          { text: "Oui, c'est la règle du fonds en euros", isCorrect: true },
          { text: 'Non, jamais', isCorrect: false },
          { text: 'Seulement après 8 ans', isCorrect: false },
        ] },
      { text: "Quel est le rendement moyen d'un fonds euros en 2025 ?",
        explanation: 'En 2025, un fonds euros rapporte en moyenne ~2,65 % net, jusqu\'à 4 % sur les meilleurs contrats.',
        answers: [
          { text: '0,5 %', isCorrect: false },
          { text: '2,65 % net (jusqu\'à 4 % sur les meilleurs contrats)', isCorrect: true },
          { text: '10 %', isCorrect: false },
        ] },
      { text: "Peut-on retirer son argent d'une assurance vie à tout moment ?",
        explanation: "Oui : l'argent reste disponible, avec une fiscalité potentielle sur les seuls gains.",
        answers: [
          { text: 'Oui, avec une fiscalité potentielle sur les gains', isCorrect: true },
          { text: 'Non, bloqué 8 ans', isCorrect: false },
          { text: 'Uniquement en cas de décès', isCorrect: false },
        ] },
      { text: "L'assurance vie est-elle un placement de court terme ?",
        explanation: "Non : c'est un placement moyen/long terme dont la fiscalité s'optimise après 8 ans.",
        answers: [
          { text: 'Oui, idéale pour quelques mois', isCorrect: false },
          { text: "Non, c'est un placement moyen/long terme dont la fiscalité s'optimise après 8 ans", isCorrect: true },
          { text: 'Peu importe la durée', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 5 =====================
  {
    number: 5,
    title: 'Unités de compte : passe la vitesse supérieure',
    duration: 548,
    speed: 197100,
    startBalance: 7500,
    pointsRequired: 50,
    description: "Le fonds euros c'est bien, mais son rendement plafonne. Les Unités de Compte (UC) ouvrent la porte à des placements plus rémunérateurs... au prix d'un risque en capital.",
    mandatoryGoal: {
      title: 'Ne te rate pas',
      description: 'Termine sans perdre de capital malgré les variations des UC.',
      successMessage: 'Tu as encaissé la volatilité des UC sans perdre de capital.',
      failureMessage: "Les UC ont entamé ton capital. Dose-les avec du fonds euros pour amortir.",
    },
    bonusGoal: {
      title: 'Mix gagnant fonds euros + UC',
      description: 'Termine avec au moins 7 800 € (~4 %) en combinant fonds euros et UC.',
      successMessage: 'Mix gagnant : tu as équilibré sécurité et performance.',
      failureMessage: "Ton mix n'a pas assez performé. Ajoute une part d'UC bien choisies.",
      target: 7800,
    },
    events: [
      { title: "Coup de boost sur l'Europe", triggerPercent: 35, position: 1,
        impacts: [{ asset: 'C20_UC_ACTIONS_EUROPE', coef: 1.12 }],
        description: "La BCE rassure, le CAC 40 s'envole : l'UC Actions Europe gagne +12 %." },
      { title: 'Vent contraire : les actions plient', triggerPercent: 70, position: 2,
        impacts: [{ field: 'uc', submarket: 'AV', coef: 0.92 }],
        description: "Résultats trimestriels décevants : les UC actions reculent de -8 %." },
    ],
    quizTitle: 'Quiz Niveau 5 — Unités de compte',
    quizDescription: 'Performance, risque et rôle des UC dans une assurance vie.',
    questions: [
      { text: "Qu'est-ce qu'une UC (Unité de Compte) ?",
        explanation: "Une UC est une part d'un placement (ETF, SCPI, OPCVM) logée dans l'assurance vie.",
        answers: [
          { text: "Une part d'un placement (ETF, SCPI, OPCVM) logée dans l'assurance vie", isCorrect: true },
          { text: 'Un livret bancaire', isCorrect: false },
          { text: 'Un crédit', isCorrect: false },
        ] },
      { text: "Le capital d'une UC est-il garanti ?",
        explanation: "Non : la valeur d'une UC varie avec les marchés sous-jacents, le capital n'est pas garanti.",
        answers: [
          { text: 'Oui', isCorrect: false },
          { text: 'Non, il varie avec les marchés sous-jacents', isCorrect: true },
          { text: 'Oui mais seulement après 8 ans', isCorrect: false },
        ] },
      { text: 'Pourquoi mélanger fonds euros et UC ?',
        explanation: "Mélanger fonds euros et UC permet d'équilibrer sécurité et performance selon son profil.",
        answers: [
          { text: 'Pour équilibrer sécurité et performance selon son profil', isCorrect: true },
          { text: "Parce que c'est obligatoire", isCorrect: false },
          { text: 'Sans raison particulière', isCorrect: false },
        ] },
      { text: "Qu'est-ce qu'une SCPI ?",
        explanation: "Une SCPI est une société civile qui détient et loue de l'immobilier, et redistribue les loyers.",
        answers: [
          { text: 'Un placement immobilier via une société civile qui détient des biens loués', isCorrect: true },
          { text: 'Une action cotée en bourse', isCorrect: false },
          { text: 'Un livret bancaire', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 6 =====================
  {
    number: 6,
    title: 'Le cap fatidique des 8 ans',
    duration: 548,
    speed: 197100,
    startBalance: 10000,
    pointsRequired: 75,
    description: "Ton assurance vie approche des 8 ans d'ancienneté : un cap fiscal décisif. Comprends pourquoi cette enveloppe est un pilier du patrimoine français.",
    mandatoryGoal: {
      title: 'Défends ton capital',
      description: 'Termine le niveau sans perdre de capital de départ.',
      successMessage: 'Capital défendu : ton assurance vie reste solide.',
      failureMessage: 'Ton capital a reculé. Appuie-toi sur le fonds euros pour le sécuriser.',
    },
    bonusGoal: {
      title: 'Performance optimisée',
      description: 'Termine avec au moins 10 400 € (~4 %).',
      successMessage: 'Performance optimisée : ton assurance vie travaille bien pour toi.',
      failureMessage: "La performance reste en deçà de la cible. Ajuste ton allocation fonds euros / UC.",
      target: 10400,
    },
    events: [
      { title: 'Réforme fiscale : PFU 30 %', triggerPercent: 30, position: 1, impacts: [],
        description: "Les gains hors abattement sont taxés au Prélèvement Forfaitaire Unique de 30 %." },
      { title: 'Ton assurance vie atteint 8 ans', triggerPercent: 65, position: 2, impacts: [],
        description: "Cap franchi : un abattement annuel de 4 600 € sur les gains est débloqué (personne seule)." },
    ],
    quizTitle: 'Quiz Niveau 6 — Fiscalité de l\'assurance vie',
    quizDescription: 'Le cap des 8 ans, le PFU et la transmission.',
    questions: [
      { text: "Quelle est la durée clé de l'assurance vie pour la fiscalité ?",
        explanation: "C'est à 8 ans d'ancienneté que la fiscalité de l'assurance vie devient la plus avantageuse.",
        answers: [
          { text: '4 ans', isCorrect: false },
          { text: '8 ans', isCorrect: true },
          { text: '15 ans', isCorrect: false },
        ] },
      { text: "Abattement annuel sur les gains d'une assurance vie de plus de 8 ans (personne seule) ?",
        explanation: "Après 8 ans, une personne seule bénéficie d'un abattement annuel de 4 600 € sur les gains.",
        answers: [
          { text: '0 €', isCorrect: false },
          { text: '4 600 €', isCorrect: true },
          { text: '10 000 €', isCorrect: false },
        ] },
      { text: "Qu'est-ce que le PFU ?",
        explanation: 'Le PFU est le Prélèvement Forfaitaire Unique de 30 % qui s\'applique sur les gains.',
        answers: [
          { text: 'Le Prélèvement Forfaitaire Unique de 30 % sur les gains', isCorrect: true },
          { text: 'Un livret', isCorrect: false },
          { text: 'Un impôt sur la fortune', isCorrect: false },
        ] },
      { text: "L'assurance vie est-elle un bon outil de transmission ?",
        explanation: "Oui : l'assurance vie offre des avantages successoraux importants pour transmettre un capital.",
        answers: [
          { text: 'Oui, elle offre des avantages successoraux importants', isCorrect: true },
          { text: 'Non', isCorrect: false },
          { text: 'Seulement pour le conjoint', isCorrect: false },
        ] },
      { text: 'Les rachats partiels sont-ils possibles pendant la vie du contrat ?',
        explanation: "Oui : on peut effectuer des rachats partiels à tout moment sur une assurance vie.",
        answers: [
          { text: 'Oui, à tout moment', isCorrect: true },
          { text: 'Non, jamais', isCorrect: false },
          { text: 'Seulement après 8 ans', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 7 =====================
  {
    number: 7,
    title: 'Bienvenue en bourse : ouvre ton PEA',
    duration: 730,
    speed: 197100,
    startBalance: 12500,
    pointsRequired: 110,
    description: "Ton patrimoine sécurisé est solide. Place maintenant une partie sur des actions via le PEA, l'enveloppe fiscale française conçue pour investir en Europe.",
    mandatoryGoal: {
      title: 'Survis à ta première bourse',
      description: 'Termine sans perdre de capital malgré la volatilité des actions.',
      successMessage: 'Première bourse réussie : ton capital a tenu.',
      failureMessage: "La bourse a entamé ton capital. Garde une part sécurisée pour amortir.",
    },
    bonusGoal: {
      title: 'Premier gain boursier',
      description: 'Termine avec au moins 13 500 € (~8 %).',
      successMessage: 'Premier gain boursier engrangé : bienvenue chez les investisseurs.',
      failureMessage: "Pas encore de plus-value. Choisis tes actions et garde-les dans la durée.",
      target: 13500,
    },
    events: [
      { title: 'Publication des résultats LVMH', triggerPercent: 30, position: 1,
        impacts: [{ asset: 'C20_LVMH', coef: 1.08 }],
        description: "LVMH publie d'excellents résultats : +8 % sur l'action." },
      { title: "Grève dans le secteur de l'énergie", triggerPercent: 65, position: 2,
        impacts: [{ asset: 'C20_TOTALENERGIES', coef: 0.90 }],
        description: "Une grève paralyse le secteur de l'énergie : -10 % sur TotalEnergies." },
    ],
    quizTitle: 'Quiz Niveau 7 — Le PEA',
    quizDescription: "Fonctionnement, plafond et fiscalité du Plan d'Épargne en Actions.",
    questions: [
      { text: "Qu'est-ce que le PEA ?",
        explanation: "Le PEA est un Plan d'Épargne en Actions offrant un avantage fiscal sur les gains après 5 ans.",
        answers: [
          { text: "Un livret d'épargne", isCorrect: false },
          { text: "Un Plan d'Épargne en Actions avec avantage fiscal après 5 ans", isCorrect: true },
          { text: 'Une assurance vie', isCorrect: false },
        ] },
      { text: 'Quel est le plafond de versement du PEA ?',
        explanation: 'Le plafond de versement du PEA est de 150 000 €.',
        answers: [
          { text: '22 950 €', isCorrect: false },
          { text: '150 000 €', isCorrect: true },
          { text: '1 million €', isCorrect: false },
        ] },
      { text: 'Que peut-on loger dans un PEA ?',
        explanation: 'Le PEA accueille des actions européennes et certains ETF éligibles.',
        answers: [
          { text: 'Des actions européennes et certains ETF éligibles', isCorrect: true },
          { text: 'De l\'or et des cryptos', isCorrect: false },
          { text: "Des obligations d'État américain", isCorrect: false },
        ] },
      { text: "Après combien d'années les gains sont-ils exonérés d'impôt sur le revenu (hors prélèvements sociaux) ?",
        explanation: "Après 5 ans de détention, les gains d'un PEA sont exonérés d'impôt sur le revenu.",
        answers: [
          { text: '2 ans', isCorrect: false },
          { text: '5 ans', isCorrect: true },
          { text: '10 ans', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 8 =====================
  {
    number: 8,
    title: 'Plus-value et dividende : la double rente',
    duration: 730,
    speed: 197100,
    startBalance: 15000,
    pointsRequired: 150,
    description: "Une action, c'est deux sources de gain : la plus-value et le dividende. Apprends à les distinguer et à composer un portefeuille qui paie.",
    mandatoryGoal: {
      title: 'Traverse la volatilité',
      description: 'Termine sans perdre de capital malgré les secousses du marché.',
      successMessage: 'Volatilité traversée : ton capital est intact.',
      failureMessage: "Les secousses ont entamé ton capital. Diversifie tes actions.",
    },
    bonusGoal: {
      title: 'Dividendes réinvestis',
      description: 'Termine avec au moins 16 500 € (~10 %).',
      successMessage: 'Plus-values et dividendes cumulés : la double rente fonctionne.',
      failureMessage: "Tu n'as pas atteint la cible. Combine actions de croissance et actions à dividendes.",
      target: 16500,
    },
    events: [
      { title: 'Saison des dividendes', triggerPercent: 25, position: 1,
        impacts: [
          { asset: 'C20_TOTALENERGIES', coef: 1.05 },
          { asset: 'C20_DANONE', coef: 1.03 },
          { asset: 'C20_BNP_PARIBAS', coef: 1.04 },
        ],
        description: "Versements de dividendes : TotalEnergies +5 %, Danone +3 %, BNP Paribas +4 %." },
      { title: "Scandale comptable L'Oréal", triggerPercent: 55, position: 2,
        impacts: [{ asset: 'C20_LOREAL', coef: 0.85 }],
        description: "Un scandale comptable secoue L'Oréal : -15 % sur l'action." },
      { title: 'Rebond du secteur luxe', triggerPercent: 80, position: 3,
        impacts: [{ asset: 'C20_LVMH', coef: 1.12 }],
        description: "Le secteur du luxe rebondit fortement : LVMH +12 %." },
    ],
    quizTitle: 'Quiz Niveau 8 — Plus-value et dividende',
    quizDescription: 'Les deux sources de gain d\'une action.',
    questions: [
      { text: "Qu'est-ce qu'un dividende ?",
        explanation: "Un dividende est une partie du bénéfice de l'entreprise redistribuée à ses actionnaires.",
        answers: [
          { text: "Une partie du bénéfice de l'entreprise redistribuée aux actionnaires", isCorrect: true },
          { text: 'Un intérêt fixe garanti', isCorrect: false },
          { text: 'Un impôt', isCorrect: false },
        ] },
      { text: 'Plus-value vs dividende : quelle différence ?',
        explanation: "La plus-value est la différence entre prix d'achat et de vente ; le dividende est une distribution régulière du bénéfice.",
        answers: [
          { text: "Aucune, c'est la même chose", isCorrect: false },
          { text: 'Plus-value = différence achat/vente ; dividende = distribution régulière du bénéfice', isCorrect: true },
          { text: "L'inverse", isCorrect: false },
        ] },
      { text: 'Toutes les actions versent-elles des dividendes ?',
        explanation: "Non : certaines entreprises de croissance réinvestissent tout leur bénéfice et ne versent pas de dividende.",
        answers: [
          { text: 'Oui, toujours', isCorrect: false },
          { text: 'Non, certaines réinvestissent tout leur bénéfice (croissance)', isCorrect: true },
          { text: 'Seulement les actions US', isCorrect: false },
        ] },
      { text: 'Les dividendes perçus dans un PEA sont-ils taxés immédiatement ?',
        explanation: "Non : tant que l'argent reste dans le PEA, les dividendes ne sont pas taxés.",
        answers: [
          { text: 'Oui, à chaque versement', isCorrect: false },
          { text: "Non, tant que l'argent reste dans le PEA", isCorrect: true },
          { text: 'Seulement après 8 ans', isCorrect: false },
        ] },
      { text: "Une action qui monte de 10 % m'a-t-elle rapporté 10 % ?",
        explanation: "Le gain n'est réalisé qu'à la vente : sinon il s'agit d'une plus-value latente, encore virtuelle.",
        answers: [
          { text: 'Oui, immédiatement', isCorrect: false },
          { text: 'Seulement si je vends (plus-value latente sinon)', isCorrect: true },
          { text: 'Jamais', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 9 =====================
  {
    number: 9,
    title: 'Obligations : le coupon contre la volatilité',
    duration: 730,
    speed: 197100,
    startBalance: 18000,
    pointsRequired: 195,
    description: "Les actions montent et descendent. Les obligations, elles, paient un coupon régulier. Découvre ce pilier de la diversification et ses subtilités : duration, défaut, notation.",
    mandatoryGoal: {
      title: 'Préserve ton patrimoine',
      description: 'Termine sans perdre de capital malgré les mouvements de taux.',
      successMessage: 'Patrimoine préservé : tes obligations ont fait leur travail.',
      failureMessage: "Ton capital a reculé. Évite de surpondérer les obligations longues et le High Yield.",
    },
    bonusGoal: {
      title: 'Encaisse les coupons',
      description: 'Termine avec au moins 18 720 € (~4 %).',
      successMessage: 'Coupons encaissés : le revenu obligataire est au rendez-vous.',
      failureMessage: "Tu n'as pas capté assez de coupons. Sélectionne des obligations de qualité.",
      target: 18720,
    },
    events: [
      { title: 'Remontée des taux : tes obligations chutent', triggerPercent: 20, position: 1,
        impacts: [
          { asset: 'C20_OAT_30', coef: 0.88 },
          { asset: 'C20_OAT_10', coef: 0.95 },
          { asset: 'C20_CORPORATE_BBB', coef: 0.94 },
        ],
        description: "La BCE relève ses taux : OAT 30 ans -12 %, OAT 10 ans -5 %, Corporate BBB -6 %. Quand les taux montent, le prix des obligations existantes baisse." },
      { title: "Faillite : ton High Yield s'effondre", triggerPercent: 50, position: 2,
        impacts: [{ asset: 'C20_HIGH_YIELD', coef: 0.70 }],
        description: "L'émetteur ne peut plus rembourser : -30 % sur l'obligation High Yield. Un coupon de 7,5 % est une prime de risque, pas un cadeau." },
      { title: 'Baisse des taux en fin de cycle', triggerPercent: 80, position: 3,
        impacts: [
          { asset: 'C20_OAT_30', coef: 1.08 },
          { asset: 'C20_OAT_10', coef: 1.03 },
        ],
        description: "Les taux refluent en fin de cycle : OAT 30 ans +8 %, OAT 10 ans +3 %." },
    ],
    quizTitle: 'Quiz Niveau 9 — Les obligations',
    quizDescription: 'Coupon, duration, défaut et sensibilité aux taux.',
    questions: [
      { text: "Qu'est-ce qu'une obligation ?",
        explanation: "Une obligation est un titre de dette : en l'achetant, on prête de l'argent à un État ou une entreprise.",
        answers: [
          { text: "Un titre de dette (je prête à un État ou une entreprise)", isCorrect: true },
          { text: 'Une action', isCorrect: false },
          { text: "Un livret d'épargne", isCorrect: false },
        ] },
      { text: "Quand les taux d'intérêt montent, le prix des obligations existantes...",
        explanation: "Quand les taux montent, les obligations existantes baissent car les nouvelles offrent un meilleur rendement.",
        answers: [
          { text: 'Monte', isCorrect: false },
          { text: 'Baisse (les nouvelles obligations offrent mieux)', isCorrect: true },
          { text: 'Reste stable', isCorrect: false },
        ] },
      { text: "Qu'est-ce que la duration d'une obligation ?",
        explanation: "La duration mesure la sensibilité du prix d'une obligation à une variation des taux d'intérêt.",
        answers: [
          { text: 'Sa durée de vie', isCorrect: false },
          { text: "Sa sensibilité à une variation des taux d'intérêt", isCorrect: true },
          { text: 'Son rendement annuel', isCorrect: false },
        ] },
      { text: 'Une obligation « High Yield » est-elle sans risque ?',
        explanation: "Non : un haut rendement traduit un risque de défaut élevé de l'émetteur.",
        answers: [
          { text: 'Oui', isCorrect: false },
          { text: 'Non, haut rendement = risque de défaut élevé', isCorrect: true },
          { text: 'Peu importe', isCorrect: false },
        ] },
      { text: "Le coupon d'une obligation classique (taux fixe) est-il connu à l'avance ?",
        explanation: "Oui : connaître le coupon à l'avance est le principal avantage d'une obligation à taux fixe.",
        answers: [
          { text: "Oui, c'est son principal avantage", isCorrect: true },
          { text: 'Non, il varie chaque mois', isCorrect: false },
          { text: 'Jamais', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 10 =====================
  {
    number: 10,
    title: 'ETF : la révolution silencieuse',
    duration: 730,
    speed: 157680,
    startBalance: 22000,
    pointsRequired: 245,
    description: "Acheter une seule action = concentrer le risque. Un ETF te fait investir en un clic dans des centaines d'entreprises, à frais très réduits. La révolution discrète de l'investissement moderne.",
    mandatoryGoal: {
      title: 'Tiens la route',
      description: 'Termine sans perdre de capital malgré les corrections de marché.',
      successMessage: 'Tu as tenu la route : la diversification des ETF amortit les chocs.',
      failureMessage: "Ton capital a reculé. Un ETF large dilue le risque : appuie-toi dessus.",
    },
    bonusGoal: {
      title: 'Performance indicielle',
      description: 'Termine avec au moins 23 760 € (~8 %).',
      successMessage: 'Performance indicielle atteinte : les ETF travaillent pour toi.',
      failureMessage: "La cible n'est pas atteinte. Investis tôt et garde tes ETF dans la durée.",
      target: 23760,
    },
    events: [
      { title: 'Rallye européen', triggerPercent: 20, position: 1,
        impacts: [{ asset: 'C20_ETF_MSCI_EUROPE', coef: 1.10 }],
        description: "Les marchés européens s'envolent : ETF MSCI Europe +10 %." },
      { title: 'Correction sectorielle', triggerPercent: 50, position: 2,
        impacts: [{ asset: 'C20_ETF_CAC40', coef: 0.94 }],
        description: "Correction sur les valeurs françaises : ETF CAC 40 -6 %." },
      { title: "L'arme des frais ultra-bas", triggerPercent: 75, position: 3, impacts: [],
        description: "L'Amundi PEA Monde affiche 0,2 % de frais quand un fonds actif comparable est à 1,5 %. Sur 30 ans, -1,3 %/an composé représente ~32 % de capital final en moins." },
    ],
    quizTitle: 'Quiz Niveau 10 — Les ETF',
    quizDescription: 'Réplication indicielle, frais et diversification.',
    questions: [
      { text: "Qu'est-ce qu'un ETF ?",
        explanation: "Un ETF est un fonds qui réplique automatiquement un indice boursier.",
        answers: [
          { text: 'Un fonds qui réplique automatiquement un indice boursier', isCorrect: true },
          { text: 'Une action individuelle', isCorrect: false },
          { text: 'Un livret', isCorrect: false },
        ] },
      { text: "Quelle est la principale différence entre un ETF et un fonds actif ?",
        explanation: "L'ETF a des frais très réduits grâce à sa réplication passive, là où un fonds actif coûte plus cher.",
        answers: [
          { text: 'ETF = frais élevés', isCorrect: false },
          { text: 'ETF = frais très réduits grâce à la réplication passive', isCorrect: true },
          { text: 'Aucune différence', isCorrect: false },
        ] },
      { text: 'Un ETF CAC 40 me fait investir dans...',
        explanation: "Un ETF CAC 40 réplique les 40 plus grandes entreprises françaises cotées.",
        answers: [
          { text: '40 entreprises au hasard', isCorrect: false },
          { text: 'Les 40 plus grandes entreprises françaises cotées', isCorrect: true },
          { text: '40 pays', isCorrect: false },
        ] },
      { text: 'Les ETF sont-ils tous éligibles au PEA ?',
        explanation: "Non : seuls les ETF éligibles PEA (actions européennes ou ETF synthétiques dédiés) peuvent y être logés.",
        answers: [
          { text: 'Tous', isCorrect: false },
          { text: 'Seulement ceux éligibles PEA (actions européennes ou synthétiques dédiés)', isCorrect: true },
          { text: 'Aucun', isCorrect: false },
        ] },
      { text: 'Avec un ETF Monde (MSCI ACWI), dans combien d\'entreprises investis-tu ?',
        explanation: "Un ETF Monde expose à plus de 1 500 entreprises réparties sur des dizaines de pays.",
        answers: [
          { text: '40', isCorrect: false },
          { text: 'Plus de 1 500 sur plusieurs dizaines de pays', isCorrect: true },
          { text: '10', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 11 =====================
  {
    number: 11,
    title: "Le CTO : sans plafond, le monde s'ouvre",
    duration: 730,
    speed: 157680,
    startBalance: 26000,
    pointsRequired: 300,
    description: "Le PEA se limite à l'Europe. Pour accéder aux géants américains et aux ETF mondiaux non-PEA, ouvre un Compte-Titres Ordinaire (CTO). Moins avantageux fiscalement, mais sans limites.",
    mandatoryGoal: {
      title: 'Élargis sans exploser',
      description: 'Termine sans perdre de capital en ouvrant ton portefeuille à l\'international.',
      successMessage: 'Tu as élargi ton univers sans casser ton capital.',
      failureMessage: "Le risque de change et la tech ont mordu ton capital. Dose ton exposition US.",
    },
    bonusGoal: {
      title: 'Boost américain',
      description: 'Termine avec au moins 28 080 € (~8 %).',
      successMessage: 'Boost américain réussi : les géants US ont dopé ton portefeuille.',
      failureMessage: "Le boost attendu n'est pas là. Sélectionne des valeurs US solides via le CTO.",
      target: 28080,
    },
    events: [
      { title: 'Keynote Apple', triggerPercent: 25, position: 1,
        impacts: [{ asset: 'C20_APPLE', coef: 1.07 }],
        description: "Une keynote enthousiasme les marchés : Apple +7 %." },
      { title: 'Baisse du dollar', triggerPercent: 50, position: 2,
        impacts: [
          { field: 'action_us', submarket: 'CTO', coef: 0.97 },
          { field: 'etf_monde', submarket: 'CTO', coef: 0.97 },
        ],
        description: "Le dollar recule : -3 % sur tous les actifs libellés en USD." },
      { title: 'Explosion du secteur tech', triggerPercent: 75, position: 3,
        impacts: [
          { asset: 'C20_ETF_NASDAQ', coef: 1.12 },
          { asset: 'C20_APPLE', coef: 1.10 },
          { asset: 'C20_MICROSOFT', coef: 1.09 },
        ],
        description: "Le secteur tech explose : ETF Nasdaq +12 %, Apple +10 %, Microsoft +9 %." },
    ],
    quizTitle: 'Quiz Niveau 11 — Le Compte-Titres Ordinaire',
    quizDescription: 'CTO vs PEA : quand et pourquoi.',
    questions: [
      { text: "Quand faut-il utiliser un CTO plutôt qu'un PEA ?",
        explanation: "Le CTO sert à investir hors actions européennes : actions US, ETF Monde, Nasdaq...",
        answers: [
          { text: 'Pour investir hors actions européennes (US, ETF Monde, Nasdaq)', isCorrect: true },
          { text: 'Tout le temps', isCorrect: false },
          { text: 'Jamais', isCorrect: false },
        ] },
      { text: 'La fiscalité du CTO est-elle avantageuse ?',
        explanation: "Non : le CTO subit le PFU de 30 % sur les gains et les dividendes, sans avantage fiscal.",
        answers: [
          { text: 'Oui, totalement exonérée', isCorrect: false },
          { text: 'Non, PFU de 30 % sur les gains et dividendes', isCorrect: true },
          { text: "Oui, comme l'assurance vie", isCorrect: false },
        ] },
      { text: "Pourquoi un ETF MSCI World standard n'est-il pas éligible au PEA ?",
        explanation: "Le PEA n'accepte que des actions européennes : un ETF World contient des actions non-européennes.",
        answers: [
          { text: "Parce qu'il contient des actions non-européennes", isCorrect: true },
          { text: "Parce qu'il est trop cher", isCorrect: false },
          { text: "Parce qu'il est américain", isCorrect: false },
        ] },
      { text: 'Le PEA a-t-il un plafond de versements ?',
        explanation: 'Oui : le PEA est plafonné à 150 000 € de versements.',
        answers: [
          { text: 'Non, illimité', isCorrect: false },
          { text: 'Oui, 150 000 €', isCorrect: true },
          { text: 'Oui, 1 million €', isCorrect: false },
        ] },
      { text: "Que faire quand on atteint le plafond PEA ?",
        explanation: "Une fois le plafond PEA atteint, on ouvre un CTO pour continuer à investir.",
        answers: [
          { text: 'Ouvrir un CTO pour continuer à investir', isCorrect: true },
          { text: "Arrêter d'investir", isCorrect: false },
          { text: 'Payer une pénalité', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 12 =====================
  {
    number: 12,
    title: 'PER, capi, dividend yield : pense comme un analyste',
    duration: 1095,
    speed: 157680,
    startBalance: 30000,
    pointsRequired: 360,
    description: "Sélectionner une action, ce n'est pas au hasard. PER, capitalisation, dividende yield : apprends les ratios que regardent les pros pour distinguer une action chère d'une bonne affaire.",
    mandatoryGoal: {
      title: 'Évite les pièges',
      description: 'Termine sans perdre de capital en évitant les valeurs surcotées.',
      successMessage: 'Pièges évités : ton stock-picking est plus fin.',
      failureMessage: "Une valeur surcotée t'a coûté cher. Surveille les ratios avant d'acheter.",
    },
    bonusGoal: {
      title: 'Bon stock-picking',
      description: 'Termine avec au moins 31 800 € (~6 %).',
      successMessage: 'Bon stock-picking : tes ratios t\'ont guidé vers les bonnes affaires.',
      failureMessage: "Le stock-picking n'a pas payé. Croise PER, capitalisation et dividend yield.",
      target: 31800,
    },
    events: [
      { title: 'Résultats Microsoft exceptionnels', triggerPercent: 25, position: 1,
        impacts: [
          { asset: 'C20_MICROSOFT', coef: 1.10 },
          { asset: 'C20_APPLE', coef: 1.02 },
        ],
        description: "Microsoft publie des résultats exceptionnels : +10 %, et +2 % sur Apple par entraînement." },
      { title: 'Tesla jugé surcoté par les analystes', triggerPercent: 50, position: 2,
        impacts: [{ asset: 'C20_TESLA', coef: 0.85 }],
        description: "Les analystes jugent le PER de Tesla excessif : -15 % sur l'action." },
      { title: 'Dividende exceptionnel Danone', triggerPercent: 80, position: 3,
        impacts: [{ asset: 'C20_DANONE', coef: 1.04 }],
        description: "Danone verse un dividende exceptionnel : rendement de 4 % pour l'actionnaire." },
    ],
    quizTitle: 'Quiz Niveau 12 — Ratios d\'analyse',
    quizDescription: 'PER, capitalisation et rendement du dividende.',
    questions: [
      { text: "Qu'est-ce que le PER (Price Earnings Ratio) ?",
        explanation: "Le PER est le ratio entre le cours de l'action et le bénéfice par action.",
        answers: [
          { text: "Un ratio cours de l'action / bénéfice par action", isCorrect: true },
          { text: 'Un impôt', isCorrect: false },
          { text: 'Une obligation', isCorrect: false },
        ] },
      { text: 'Une action avec un PER de 50 est-elle bon marché ?',
        explanation: "Non : un PER de 50 est élevé, typique des actions de forte croissance, pas d'une affaire bon marché.",
        answers: [
          { text: 'Oui, toujours', isCorrect: false },
          { text: "Non, c'est cher (typique des actions de forte croissance)", isCorrect: true },
          { text: 'Peu importe', isCorrect: false },
        ] },
      { text: "Qu'est-ce que la capitalisation boursière d'une entreprise ?",
        explanation: "La capitalisation boursière est le cours de l'action multiplié par le nombre d'actions en circulation.",
        answers: [
          { text: 'La valeur de tous ses actifs', isCorrect: false },
          { text: "Le prix de son action multiplié par le nombre d'actions en circulation", isCorrect: true },
          { text: 'Son dividende annuel', isCorrect: false },
        ] },
      { text: 'Le rendement du dividende (dividend yield) se calcule comment ?',
        explanation: "Le dividend yield = dividende annuel divisé par le cours de l'action.",
        answers: [
          { text: "Dividende annuel / cours de l'action", isCorrect: true },
          { text: "Cours de l'action / dividende", isCorrect: false },
          { text: "Dividende × nombre d'actions", isCorrect: false },
        ] },
      { text: "Un « dividend yield » très élevé (10 %+) est-il toujours un bon signal ?",
        explanation: "Non : un rendement très élevé peut signaler une entreprise en difficulté et un dividende non soutenable.",
        answers: [
          { text: 'Oui, toujours', isCorrect: false },
          { text: "Non, parfois c'est un piège : entreprise en difficulté, dividende non soutenable", isCorrect: true },
          { text: 'C\'est inutile de regarder', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 13 =====================
  {
    number: 13,
    title: "Cycliques vs défensifs : lis l'économie",
    duration: 1095,
    speed: 157680,
    startBalance: 35000,
    pointsRequired: 425,
    description: "Tous les secteurs ne réagissent pas pareil aux phases du cycle économique. Techno, luxe, énergie, santé, banques : apprends à mixer pour ne pas dépendre d'une seule dynamique.",
    mandatoryGoal: {
      title: 'Résiste aux cycles',
      description: 'Termine sans perdre de capital en traversant les phases du cycle économique.',
      successMessage: 'Tu as résisté aux cycles : ta diversification sectorielle paie.',
      failureMessage: "Un retournement de cycle t'a coûté cher. Mélange cycliques et défensifs.",
    },
    bonusGoal: {
      title: 'Bon timing sectoriel',
      description: 'Termine avec au moins 37 450 € (~7 %).',
      successMessage: 'Bon timing sectoriel : tu as su lire les phases de l\'économie.',
      failureMessage: "Le timing sectoriel n'a pas payé. Garde un cœur défensif en toutes circonstances.",
      target: 37450,
    },
    events: [
      { title: 'Reprise économique forte', triggerPercent: 20, position: 1,
        impacts: [
          { asset: 'C20_BNP_PARIBAS', coef: 1.12 },
          { asset: 'C20_AIRBUS', coef: 1.10 },
          { asset: 'C20_LVMH', coef: 1.08 },
          { asset: 'C20_SANOFI', coef: 1.02 },
        ],
        description: "La reprise économique dope les cycliques : BNP +12 %, Airbus +10 %, LVMH +8 %. Les défensifs restent calmes : Sanofi +2 %." },
      { title: 'Crainte de récession', triggerPercent: 55, position: 2,
        impacts: [
          { asset: 'C20_BNP_PARIBAS', coef: 0.90 },
          { asset: 'C20_AIRBUS', coef: 0.90 },
          { asset: 'C20_LVMH', coef: 0.90 },
          { asset: 'C20_SANOFI', coef: 1.03 },
          { asset: 'C20_DANONE', coef: 1.03 },
        ],
        description: "Crainte de récession : les cycliques chutent de -10 %, tandis que les défensifs (Sanofi, Danone) gagnent +3 %." },
      { title: 'Effondrement du pétrole', triggerPercent: 80, position: 3,
        impacts: [{ asset: 'C20_TOTALENERGIES', coef: 0.92 }],
        description: "Le cours du pétrole s'effondre : -8 % sur TotalEnergies." },
    ],
    quizTitle: 'Quiz Niveau 13 — Cycliques et défensifs',
    quizDescription: 'Lire le cycle économique et diversifier par secteur.',
    questions: [
      { text: 'Que sont les secteurs dits « défensifs » ?',
        explanation: "Les secteurs défensifs (santé, consommation courante, services essentiels) résistent mieux aux récessions.",
        answers: [
          { text: 'Santé, consommation courante, services essentiels', isCorrect: true },
          { text: 'Technologie, luxe, mines', isCorrect: false },
          { text: 'Cryptomonnaies', isCorrect: false },
        ] },
      { text: 'Les secteurs cycliques...',
        explanation: "Les secteurs cycliques montent et baissent au rythme des phases de l'économie.",
        answers: [
          { text: "Montent et baissent avec les phases de l'économie", isCorrect: true },
          { text: "Sont stables toute l'année", isCorrect: false },
          { text: 'Versent toujours des dividendes', isCorrect: false },
        ] },
      { text: "En récession, quel type d'action résiste généralement mieux ?",
        explanation: "En récession, les actions défensives résistent généralement mieux que les cycliques.",
        answers: [
          { text: 'Les actions défensives', isCorrect: true },
          { text: 'Les actions cycliques', isCorrect: false },
          { text: 'Les obligations High Yield', isCorrect: false },
        ] },
      { text: "Diversifier son portefeuille par secteur, c'est...",
        explanation: "Diversifier par secteur réduit le risque spécifique lié à un secteur en difficulté.",
        answers: [
          { text: 'Une mauvaise idée', isCorrect: false },
          { text: 'Réduire le risque spécifique à un secteur', isCorrect: true },
          { text: 'Garantir des gains', isCorrect: false },
        ] },
      { text: 'Une action « value » est...',
        explanation: "Une action value est jugée sous-évaluée par rapport à ses fondamentaux.",
        answers: [
          { text: 'Toujours risquée', isCorrect: false },
          { text: 'Une action jugée sous-évaluée par rapport à ses fondamentaux', isCorrect: true },
          { text: 'Une obligation déguisée', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 14 =====================
  {
    number: 14,
    title: 'DCA, Value, Lazy : trouve ton style',
    duration: 1095,
    speed: 157680,
    startBalance: 42000,
    pointsRequired: 495,
    description: "DCA (investir régulièrement), value (chasser les bonnes affaires), lazy (ETF larges et patience) : trois approches éprouvées. Teste-les et trouve celle qui colle à ton tempérament.",
    mandatoryGoal: {
      title: 'Reste discipliné',
      description: 'Termine sans perdre de capital en gardant une stratégie cohérente.',
      successMessage: 'Discipline tenue : ta stratégie a résisté aux émotions du marché.',
      failureMessage: "Le manque de discipline a coûté cher. Choisis une stratégie et tiens-la.",
    },
    bonusGoal: {
      title: 'Stratégie cohérente',
      description: 'Termine avec au moins 45 360 € (~8 %).',
      successMessage: 'Stratégie cohérente et payante : tu as trouvé ton style.',
      failureMessage: "La cible n'est pas atteinte. Une stratégie tenue dans la durée bat l'improvisation.",
      target: 45360,
    },
    events: [
      { title: 'Forte volatilité marché', triggerPercent: 20, position: 1,
        impacts: [{ asset: 'C20_ETF_MSCI_WORLD', coef: 1.02 }],
        description: "Forte volatilité : l'ETF MSCI World plonge de -8 % puis rebondit de +10 %. C'est le terrain idéal du DCA, qui moyenne le prix d'achat à la baisse." },
      { title: 'Rallye value', triggerPercent: 55, position: 2,
        impacts: [
          { asset: 'C20_SANOFI', coef: 1.10 },
          { asset: 'C20_DANONE', coef: 1.08 },
        ],
        description: "Rallye sur les valeurs décotées : Sanofi +10 %, Danone +8 %." },
      { title: 'Boom tech persistant', triggerPercent: 80, position: 3,
        impacts: [
          { asset: 'C20_ETF_NASDAQ', coef: 1.15 },
          { asset: 'C20_NVIDIA', coef: 1.20 },
        ],
        description: "Le boom technologique se prolonge : ETF Nasdaq +15 %, Nvidia +20 %." },
    ],
    quizTitle: 'Quiz Niveau 14 — Styles d\'investissement',
    quizDescription: 'DCA, value investing et lazy investing.',
    questions: [
      { text: "Qu'est-ce que le DCA (Dollar Cost Averaging) ?",
        explanation: "Le DCA consiste à investir un montant fixe à intervalles réguliers, quel que soit le marché.",
        answers: [
          { text: 'Investir un montant fixe à intervalles réguliers (mensuel, trimestriel)', isCorrect: true },
          { text: 'Un indice boursier', isCorrect: false },
          { text: 'Un type de crédit', isCorrect: false },
        ] },
      { text: 'Quel est le principal avantage du DCA ?',
        explanation: "Le DCA lisse le prix d'achat moyen et atténue l'effet de la volatilité.",
        answers: [
          { text: "Lisser le prix d'achat moyen face à la volatilité", isCorrect: true },
          { text: 'Garantir des gains', isCorrect: false },
          { text: 'Éviter les impôts', isCorrect: false },
        ] },
      { text: "Le « value investing », c'est quoi ?",
        explanation: "Le value investing consiste à acheter des actions sous-évaluées par rapport à leurs fondamentaux.",
        answers: [
          { text: 'Acheter des actions chères en croissance', isCorrect: false },
          { text: 'Acheter des actions jugées sous-évaluées par rapport à leurs fondamentaux', isCorrect: true },
          { text: 'Faire du trading rapide', isCorrect: false },
        ] },
      { text: 'Le « lazy investing » privilégie...',
        explanation: "Le lazy investing repose sur quelques ETF larges, peu chers, conservés dans la durée.",
        answers: [
          { text: 'Le stock-picking actif et quotidien', isCorrect: false },
          { text: 'Quelques ETF larges diversifiés, peu chers, tenus dans le temps', isCorrect: true },
          { text: 'Les cryptomonnaies exclusivement', isCorrect: false },
        ] },
      { text: 'Quelle stratégie est la plus simple et éprouvée pour un débutant ?',
        explanation: "Pour un débutant, le combo lazy investing + DCA est simple, robuste et éprouvé.",
        answers: [
          { text: 'Trading haute fréquence', isCorrect: false },
          { text: 'Lazy investing + DCA', isCorrect: true },
          { text: 'Options et leviers', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 15 =====================
  {
    number: 15,
    title: 'Drawdown -30 % : tu vas le vivre',
    duration: 1460,
    speed: 197100,
    startBalance: 50000,
    pointsRequired: 570,
    description: "Un drawdown de -30 % est banal sur les marchés actions. Ce qui compte, ce n'est pas d'éviter les baisses (impossible), c'est d'avoir l'horizon pour les traverser.",
    mandatoryGoal: {
      title: 'Traverse le drawdown',
      description: 'Termine sans perdre de capital malgré une forte baisse de marché.',
      successMessage: 'Drawdown traversé : tu as gardé ton cap quand ça tanguait.',
      failureMessage: "Le drawdown a eu raison de ton capital. Garde ton horizon long et ne vends pas en panique.",
    },
    bonusGoal: {
      title: 'Performance long terme',
      description: 'Termine avec au moins 54 000 € (~8 %).',
      successMessage: 'Performance long terme au rendez-vous : le rebond récompense la patience.',
      failureMessage: "La cible n'est pas atteinte. Rester investi pendant le rebond est décisif.",
      target: 54000,
    },
    events: [
      { title: "Chute brutale de l'ETF Monde", triggerPercent: 30, position: 1,
        impacts: [{ asset: 'C20_ETF_MSCI_WORLD', coef: 0.80 }],
        description: "Drawdown sévère : l'ETF MSCI World chute de -20 %." },
      { title: 'Fuite vers les obligations', triggerPercent: 55, position: 2,
        impacts: [{ asset: 'C20_OAT_10', coef: 1.03 }],
        description: "Les investisseurs cherchent un refuge : l'OAT 10 ans gagne +3 %." },
      { title: 'Rebond sur 6 mois simulés', triggerPercent: 80, position: 3,
        impacts: [{ asset: 'C20_ETF_MSCI_WORLD', coef: 1.25 }],
        description: "L'ETF MSCI World rebondit de +25 % depuis son point bas." },
    ],
    quizTitle: 'Quiz Niveau 15 — Drawdown et volatilité',
    quizDescription: 'Comprendre les baisses de marché et l\'horizon de placement.',
    questions: [
      { text: "Qu'est-ce que le drawdown ?",
        explanation: "Le drawdown est la plus forte baisse enregistrée depuis un sommet de marché.",
        answers: [
          { text: "La plus grosse chute enregistrée depuis un sommet de marché", isCorrect: true },
          { text: 'Le dividende annuel', isCorrect: false },
          { text: 'Les frais de gestion', isCorrect: false },
        ] },
      { text: 'Un drawdown de -30 % sur les actions est-il rare ?',
        explanation: "Non : un drawdown de -30 % arrive régulièrement (2000, 2008, 2020...).",
        answers: [
          { text: 'Jamais vu', isCorrect: false },
          { text: 'Non, ça arrive régulièrement (2000, 2008, 2020...)', isCorrect: true },
          { text: 'Impossible', isCorrect: false },
        ] },
      { text: 'Un horizon de placement long permet quoi ?',
        explanation: "Un horizon long permet d'encaisser la volatilité et de viser les rendements historiques des actions.",
        answers: [
          { text: "D'encaisser la volatilité et viser les rendements historiques des actions", isCorrect: true },
          { text: "D'éliminer totalement tout risque", isCorrect: false },
          { text: 'De gagner à coup sûr', isCorrect: false },
        ] },
      { text: 'La volatilité est-elle synonyme de perte ?',
        explanation: "Non : la volatilité mesure l'ampleur des variations, à la hausse comme à la baisse.",
        answers: [
          { text: 'Oui', isCorrect: false },
          { text: "Non, c'est une mesure de variation (à la hausse comme à la baisse)", isCorrect: true },
          { text: 'Peu importe', isCorrect: false },
        ] },
      { text: 'Quel horizon minimum recommande-t-on pour investir en actions ?',
        explanation: "On recommande un horizon d'au moins 5 à 8 ans pour investir en actions.",
        answers: [
          { text: '1 an', isCorrect: false },
          { text: '5 à 8 ans minimum', isCorrect: true },
          { text: '3 mois', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 16 =====================
  {
    number: 16,
    title: 'Le secret des pros : la décorrélation',
    duration: 1460,
    speed: 197100,
    startBalance: 60000,
    pointsRequired: 650,
    description: "Diversifier, ce n'est pas « acheter beaucoup d'actions ». C'est combiner des actifs qui ne bougent pas ensemble. Découvre l'immobilier papier (SCPI), le crowdlending, les OPCI pour sophistiquer ton allocation.",
    mandatoryGoal: {
      title: 'Diversification qui tient',
      description: 'Termine sans perdre de capital grâce à une allocation décorrélée.',
      successMessage: 'Diversification solide : tes actifs décorrélés ont amorti les chocs.',
      failureMessage: "Ton portefeuille a trop bougé d'un bloc. Combine des actifs peu corrélés.",
    },
    bonusGoal: {
      title: 'Amortis les chocs',
      description: 'Termine avec au moins 64 800 € (~8 %).',
      successMessage: 'Chocs amortis : la décorrélation a lissé ta performance.',
      failureMessage: "La cible n'est pas atteinte. Ajoute des actifs alternatifs réellement décorrélés.",
      target: 64800,
    },
    events: [
      { title: 'Choc immo : les SCPI tanguent', triggerPercent: 25, position: 1,
        impacts: [
          { asset: 'C20_SCPI_DIRECTE', coef: 0.92 },
          { asset: 'C20_UC_SCPI', coef: 0.93 },
        ],
        description: "Vacance locative en hausse, valorisations révisées : SCPI directe -8 %, UC SCPI -7 %." },
      { title: 'Ton portefeuille amortit le choc', triggerPercent: 50, position: 2,
        impacts: [{ asset: 'C20_ETF_MSCI_WORLD', coef: 1.05 }],
        description: "Pendant que l'immobilier souffre, les actions tiennent : ETF MSCI World +5 %. La décorrélation paie." },
      { title: 'Nouvelle vague de hausse des taux', triggerPercent: 75, position: 3,
        impacts: [
          { field: 'obligation', submarket: 'OBLIGATIONS', coef: 0.94 },
          { asset: 'C20_SCPI_DIRECTE', coef: 0.96 },
        ],
        description: "La BCE durcit encore : obligations longues -6 %, SCPI -4 %. Livrets et fonds euros restent inchangés." },
    ],
    quizTitle: 'Quiz Niveau 16 — Décorrélation et diversification',
    quizDescription: 'Corrélation, classes d\'actifs et vraie diversification.',
    questions: [
      { text: "Qu'est-ce que la corrélation entre deux actifs ?",
        explanation: "La corrélation est une mesure statistique de la tendance de deux actifs à bouger ensemble.",
        answers: [
          { text: 'Une mesure statistique de leur tendance à bouger ensemble', isCorrect: true },
          { text: 'Leur rendement combiné', isCorrect: false },
          { text: 'Leur prix moyen', isCorrect: false },
        ] },
      { text: 'Pour bien diversifier, quelle corrélation recherche-t-on ?',
        explanation: "Pour diversifier, on recherche une corrélation proche de 0 ou négative entre les actifs.",
        answers: [
          { text: 'Proche de +1 (parfaitement synchronisés)', isCorrect: false },
          { text: 'Proche de 0 ou négative (indépendants ou opposés)', isCorrect: true },
          { text: "+2 (ça n'existe pas)", isCorrect: false },
        ] },
      { text: 'Actions et obligations ont historiquement une corrélation...',
        explanation: "Actions et obligations ont une corrélation souvent faible, parfois négative, surtout en crise.",
        answers: [
          { text: 'Toujours fortement positive', isCorrect: false },
          { text: 'Souvent faible, parfois négative (surtout en crise)', isCorrect: true },
          { text: 'Toujours à +1', isCorrect: false },
        ] },
      { text: "Qu'est-ce qu'une SCPI ?",
        explanation: "Une SCPI est une société civile qui détient et loue de l'immobilier et distribue les loyers.",
        answers: [
          { text: 'Une action cotée', isCorrect: false },
          { text: "Une société civile qui détient et loue de l'immobilier, distribue les loyers", isCorrect: true },
          { text: 'Un livret', isCorrect: false },
        ] },
      { text: 'Diversifier signifie...',
        explanation: "Diversifier, c'est répartir son capital sur plusieurs classes d'actifs peu corrélées.",
        answers: [
          { text: 'Acheter plus de la même action', isCorrect: false },
          { text: "Répartir sur plusieurs classes d'actifs peu corrélées", isCorrect: true },
          { text: 'Faire plus de trades', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 17 =====================
  {
    number: 17,
    title: 'Quel investisseur es-tu ?',
    duration: 1825,
    speed: 219000,
    startBalance: 70000,
    pointsRequired: 735,
    description: "Il n'y a pas d'allocation universelle. À 25 ans, tu peux encaisser du risque. À 60 ans, tu sécurises. Apprends à ajuster ton portefeuille à ton âge, ton horizon et ta tolérance.",
    mandatoryGoal: {
      title: 'Allocation cohérente',
      description: 'Termine sans perdre de capital avec une allocation adaptée à ton profil.',
      successMessage: 'Allocation cohérente : ton portefeuille colle à ton profil.',
      failureMessage: "Ton allocation n'était pas adaptée. Calibre la part actions selon ton horizon.",
    },
    bonusGoal: {
      title: 'Performance calibrée',
      description: 'Termine avec au moins 75 600 € (~8 %).',
      successMessage: 'Performance calibrée : le bon dosage risque/sécurité a payé.',
      failureMessage: "La cible n'est pas atteinte. Ajuste le curseur actions / obligations.",
      target: 75600,
    },
    events: [
      { title: 'Marché haussier', triggerPercent: 20, position: 1,
        impacts: [
          { field: 'action_us', submarket: 'CTO', coef: 1.10 },
          { field: 'etf_monde', submarket: 'CTO', coef: 1.10 },
          { field: 'obligation', submarket: 'OBLIGATIONS', coef: 1.01 },
        ],
        description: "Marché haussier : actions +10 %, obligations +1 %. Le profil dynamique gagne davantage." },
      { title: 'Choc intermédiaire', triggerPercent: 50, position: 2,
        impacts: [
          { field: 'action_us', submarket: 'CTO', coef: 0.88 },
          { field: 'etf_monde', submarket: 'CTO', coef: 0.88 },
          { field: 'obligation', submarket: 'OBLIGATIONS', coef: 1.04 },
        ],
        description: "Choc de marché : actions -12 %, obligations +4 %. Le profil prudent souffre moins." },
      { title: 'Stabilisation', triggerPercent: 80, position: 3, impacts: [],
        description: "Retour à la moyenne : sur le long terme, le profil équilibré ressort gagnant." },
    ],
    quizTitle: 'Quiz Niveau 17 — Profil d\'investisseur',
    quizDescription: 'Allocation selon l\'âge, l\'horizon et la tolérance au risque.',
    questions: [
      { text: 'Profil prudent : quelle allocation actions typique ?',
        explanation: "Un profil prudent vise une allocation actions faible, typiquement 0 à 20 %.",
        answers: [
          { text: '0-20 %', isCorrect: true },
          { text: '50-70 %', isCorrect: false },
          { text: '100 %', isCorrect: false },
        ] },
      { text: 'Profil dynamique : quelle allocation actions ?',
        explanation: "Un profil dynamique assume une allocation actions élevée, typiquement 70 à 100 %.",
        answers: [
          { text: '0-20 %', isCorrect: false },
          { text: '70-100 %', isCorrect: true },
          { text: '30 %', isCorrect: false },
        ] },
      { text: 'La règle « 110 - âge » sert à quoi ?',
        explanation: "La règle « 110 - âge » estime la part d'actions recommandée selon l'âge de l'investisseur.",
        answers: [
          { text: "Estimer l'allocation actions recommandée selon l'âge", isCorrect: true },
          { text: "Calculer l'âge de départ à la retraite", isCorrect: false },
          { text: 'Fixer le taux du Livret A', isCorrect: false },
        ] },
      { text: 'Un jeune de 25 ans devrait avoir plutôt...',
        explanation: "Un jeune de 25 ans a un horizon long et peut donc privilégier les actions, malgré la volatilité.",
        answers: [
          { text: "Plus d'actions (horizon long, peut encaisser la volatilité)", isCorrect: true },
          { text: "Plus d'obligations", isCorrect: false },
          { text: '100 % en livrets', isCorrect: false },
        ] },
      { text: "L'allocation dépend de quoi ?",
        explanation: "L'allocation dépend de l'âge, de l'horizon, de la tolérance au risque et des objectifs patrimoniaux.",
        answers: [
          { text: "Seulement l'âge", isCorrect: false },
          { text: 'Âge + horizon + tolérance au risque + objectifs patrimoniaux', isCorrect: true },
          { text: 'Du hasard', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 18 =====================
  {
    number: 18,
    title: "Discipline > intuition : l'art du rééquilibrage",
    duration: 1825,
    speed: 219000,
    startBalance: 80000,
    pointsRequired: 825,
    description: "Ton allocation cible dérive avec le temps : la part gagnante gonfle, la perdante rétrécit. Le rééquilibrage périodique ramène le portefeuille à sa cible. Discipline > intuition.",
    mandatoryGoal: {
      title: 'Garde le cap',
      description: 'Termine sans perdre de capital en ramenant ton allocation à sa cible.',
      successMessage: 'Cap gardé : le rééquilibrage a sécurisé tes gains.',
      failureMessage: "Ton allocation a trop dérivé. Rééquilibre régulièrement vers ta cible.",
    },
    bonusGoal: {
      title: 'Rééquilibrage discipliné',
      description: 'Termine avec au moins 86 400 € (~8 %).',
      successMessage: 'Rééquilibrage discipliné et payant : tu as vendu haut et racheté bas.',
      failureMessage: "La cible n'est pas atteinte. Le rééquilibrage systématique bat l'intuition.",
      target: 86400,
    },
    events: [
      { title: 'Bulle tech : ton portefeuille gonfle', triggerPercent: 25, position: 1,
        impacts: [
          { asset: 'C20_ETF_NASDAQ', coef: 1.25 },
          { asset: 'C20_NVIDIA', coef: 1.30 },
        ],
        description: "IA, semiconducteurs, hype : ETF Nasdaq +25 %, Nvidia +30 %. La part actions US explose ton allocation cible." },
      { title: 'Le moment de vérité : rééquilibrer', triggerPercent: 50, position: 2, impacts: [],
        description: "Vends tes gagnants (tech) pour racheter le sous-pondéré (obligations). Contre-intuitif, mais c'est la discipline qui paie." },
      { title: 'La tech corrige : qui a gardé son cap ?', triggerPercent: 80, position: 3,
        impacts: [{ asset: 'C20_ETF_NASDAQ', coef: 0.85 }],
        description: "ETF Nasdaq -15 %. Ceux qui ont rééquilibré ont sécurisé leurs gains avant la chute." },
    ],
    quizTitle: 'Quiz Niveau 18 — Le rééquilibrage',
    quizDescription: 'Ramener le portefeuille à son allocation cible.',
    questions: [
      { text: "Qu'est-ce que le rééquilibrage de portefeuille ?",
        explanation: "Le rééquilibrage consiste à ramener chaque classe d'actifs à son poids cible initial.",
        answers: [
          { text: "Ramener chaque classe d'actifs à son poids cible initial", isCorrect: true },
          { text: 'Tout vendre et racheter', isCorrect: false },
          { text: 'Ne rien faire', isCorrect: false },
        ] },
      { text: 'À quelle fréquence rééquilibrer ?',
        explanation: "On rééquilibre généralement une fois par an, ou dès qu'un seuil (±5 %) est franchi.",
        answers: [
          { text: 'Tous les jours', isCorrect: false },
          { text: 'Annuellement ou quand un seuil (±5 %) est franchi', isCorrect: true },
          { text: 'Jamais', isCorrect: false },
        ] },
      { text: 'Le rééquilibrage systématique revient à...',
        explanation: "Le rééquilibrage revient à vendre les actifs qui ont monté et racheter ceux qui ont baissé.",
        answers: [
          { text: 'Acheter au plus haut et vendre au plus bas', isCorrect: false },
          { text: 'Vendre les gagnants (qui ont monté) et racheter les perdants (qui ont baissé)', isCorrect: true },
          { text: 'Ne rien changer', isCorrect: false },
        ] },
      { text: 'Dans un PEA, vendre pour rééquilibrer déclenche-t-il l\'impôt ?',
        explanation: "Non : tant que l'argent reste dans le PEA, les arbitrages ne déclenchent pas d'impôt.",
        answers: [
          { text: 'Oui, systématiquement', isCorrect: false },
          { text: "Non, tant que l'argent reste dans le PEA", isCorrect: true },
          { text: 'Parfois', isCorrect: false },
        ] },
      { text: 'Pourquoi le rééquilibrage aide psychologiquement ?',
        explanation: "Le rééquilibrage impose une règle qui aide à rester discipliné et à éviter la sur-exposition émotionnelle.",
        answers: [
          { text: 'Pour suivre la foule', isCorrect: false },
          { text: 'Pour rester discipliné et éviter le biais de sur-exposition émotionnelle', isCorrect: true },
          { text: 'Pour stresser davantage', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 19 =====================
  {
    number: 19,
    title: 'Krach, panique, sang-froid',
    duration: 1825,
    speed: 219000,
    startBalance: 90000,
    pointsRequired: 920,
    description: "Krach 2008, Covid 2020, guerre commerciale : les crises sont inévitables. Ce qui fait la différence, c'est ta réaction. Sang-froid, discipline, achat à la baisse : applique ce que tu sais.",
    mandatoryGoal: {
      title: 'Survis à la crise',
      description: 'Termine sans perdre de capital malgré un krach et sa récupération.',
      successMessage: 'Crise survécue : le sang-froid a préservé ton capital.',
      failureMessage: "La panique a coûté cher. Garde ton cap et n'encaisse pas tes pertes au pire moment.",
    },
    bonusGoal: {
      title: 'Profite du rebond',
      description: 'Termine avec au moins 99 000 € (~10 % malgré la crise).',
      successMessage: 'Rebond capturé : acheter à la baisse a payé.',
      failureMessage: "Tu n'as pas profité du rebond. Rester investi pendant la reprise est décisif.",
      target: 99000,
    },
    events: [
      { title: 'Krach boursier mondial', triggerPercent: 15, position: 1,
        impacts: [
          { field: 'action_pea', submarket: 'PEA', coef: 0.70 },
          { field: 'etf_pea', submarket: 'ETF_PEA', coef: 0.70 },
          { field: 'action_us', submarket: 'CTO', coef: 0.70 },
          { field: 'etf_monde', submarket: 'CTO', coef: 0.70 },
          { field: 'uc', submarket: 'AV', coef: 0.70 },
          { field: 'fonds_euros', submarket: 'AV', coef: 1.01 },
        ],
        description: "Krach mondial : toutes les actions et ETF actions -30 %. Le fonds euros, lui, fait refuge : +1 %." },
      { title: 'Intervention des banques centrales', triggerPercent: 35, position: 2,
        impacts: [{ asset: 'C20_OAT_30', coef: 0.95 }],
        description: "Les banques centrales interviennent : -5 % supplémentaire sur les obligations longues, puis stabilisation." },
      { title: 'Phase de rebond', triggerPercent: 65, position: 3,
        impacts: [
          { field: 'action_pea', submarket: 'PEA', coef: 1.25 },
          { field: 'etf_pea', submarket: 'ETF_PEA', coef: 1.25 },
          { field: 'action_us', submarket: 'CTO', coef: 1.25 },
          { field: 'etf_monde', submarket: 'CTO', coef: 1.25 },
          { field: 'uc', submarket: 'AV', coef: 1.25 },
        ],
        description: "Phase de rebond : actions +25 % depuis le point bas. Celui qui a acheté à la baisse gagne." },
      { title: 'Nouveau cycle haussier', triggerPercent: 90, position: 4,
        impacts: [
          { asset: 'C20_ETF_MSCI_WORLD', coef: 1.15 },
          { field: 'action_us', submarket: 'CTO', coef: 1.20 },
        ],
        description: "Un nouveau cycle haussier s'installe : ETF MSCI World +15 %, actions tech +20 %." },
    ],
    quizTitle: 'Quiz Niveau 19 — Krach et psychologie',
    quizDescription: 'Garder son sang-froid quand les marchés s\'effondrent.',
    questions: [
      { text: 'Que faut-il éviter pendant un krach ?',
        explanation: "Pendant un krach, l'erreur fatale est de tout vendre en panique et de cristalliser ses pertes.",
        answers: [
          { text: 'Tout vendre en panique et cristalliser ses pertes', isCorrect: true },
          { text: 'Garder son cap et acheter à la baisse', isCorrect: false },
          { text: 'Analyser froidement la situation', isCorrect: false },
        ] },
      { text: 'Combien de temps dure en moyenne un krach + sa récupération complète ?',
        explanation: "En moyenne, un krach et sa récupération complète prennent 1 à 3 ans sur les marchés actions.",
        answers: [
          { text: 'Quelques jours', isCorrect: false },
          { text: '1 à 3 ans en moyenne sur les marchés actions', isCorrect: true },
          { text: '20 ans', isCorrect: false },
        ] },
      { text: 'Le fonds euros pendant un krach boursier ?',
        explanation: "Le fonds euros reste stable pendant un krach grâce à la garantie de l'assureur.",
        answers: [
          { text: 'Chute avec les marchés', isCorrect: false },
          { text: "Reste stable grâce à la garantie de l'assureur", isCorrect: true },
          { text: 'Double de valeur', isCorrect: false },
        ] },
      { text: '« Buy the dip » signifie...',
        explanation: "« Buy the dip » signifie acheter quand les prix chutent fortement, pour profiter du rebond.",
        answers: [
          { text: 'Acheter quand les prix chutent fortement pour profiter du rebond', isCorrect: true },
          { text: 'Vendre au sommet', isCorrect: false },
          { text: 'Ne rien faire', isCorrect: false },
        ] },
      { text: 'Quel est le plus gros risque pendant une crise ?',
        explanation: "Le plus gros risque en crise, ce sont ses propres émotions : panique et biais cognitifs.",
        answers: [
          { text: 'Les marchés eux-mêmes', isCorrect: false },
          { text: 'Ses propres émotions (panique, biais cognitifs)', isCorrect: true },
          { text: 'Les banques centrales', isCorrect: false },
        ] },
    ],
  },

  // ===================== NIVEAU 20 =====================
  {
    number: 20,
    title: '8 ans pour bâtir ton patrimoine',
    duration: 2920,
    speed: 350400,
    startBalance: 100000,
    pointsRequired: 1020,
    description: "Tu maîtrises les enveloppes, les classes d'actifs, les stratégies, la psychologie. Reste à appliquer sur 8 ans simulés : traverser les cycles économiques complets et voir la puissance de l'intérêt composé.",
    mandatoryGoal: {
      title: 'Finir riche',
      description: 'Termine sans perdre de capital après 8 ans simulés de cycles économiques.',
      successMessage: 'Patrimoine bâti : tu as traversé 8 ans de cycles sans entamer ton capital.',
      failureMessage: "Le parcours a entamé ton capital. Investis large, diversifié, et reste dans la durée.",
    },
    bonusGoal: {
      title: 'Vraie capitalisation long terme',
      description: 'Termine avec au moins 130 000 € (+30 % sur 8 ans ≈ 3,3 %/an net).',
      successMessage: 'Vraie capitalisation : l\'intérêt composé a fait son œuvre sur 8 ans.',
      failureMessage: "La cible n'est pas atteinte. Sur le long terme, temps + diversification + frais bas font la différence.",
      target: 130000,
    },
    events: [
      { title: 'Cycle 1 — Expansion', triggerPercent: 15, position: 1,
        impacts: [
          { field: 'action_pea', submarket: 'PEA', coef: 1.12 },
          { field: 'etf_pea', submarket: 'ETF_PEA', coef: 1.12 },
          { field: 'action_us', submarket: 'CTO', coef: 1.12 },
          { field: 'etf_monde', submarket: 'CTO', coef: 1.12 },
        ],
        description: "Phase d'expansion : actions +12 %, obligations stables." },
      { title: "Cycle 2 — Pic d'inflation", triggerPercent: 30, position: 2,
        impacts: [
          { field: 'obligation', submarket: 'OBLIGATIONS', coef: 0.92 },
          { field: 'action_pea', submarket: 'PEA', coef: 1.05 },
          { field: 'etf_pea', submarket: 'ETF_PEA', coef: 1.05 },
          { field: 'action_us', submarket: 'CTO', coef: 1.05 },
          { field: 'etf_monde', submarket: 'CTO', coef: 1.05 },
          { field: 'fonds_euros', submarket: 'AV', coef: 1.02 },
        ],
        description: "Pic d'inflation : obligations longues -8 %, actions +5 %, fonds euros +2 %." },
      { title: 'Cycle 3 — Récession modérée', triggerPercent: 50, position: 3,
        impacts: [
          { field: 'action_pea', submarket: 'PEA', coef: 0.85 },
          { field: 'etf_pea', submarket: 'ETF_PEA', coef: 0.85 },
          { field: 'action_us', submarket: 'CTO', coef: 0.85 },
          { field: 'etf_monde', submarket: 'CTO', coef: 0.85 },
          { field: 'obligation', submarket: 'OBLIGATIONS', coef: 1.05 },
        ],
        description: "Récession modérée : actions -15 %, obligations +5 % (fuite vers la qualité)." },
      { title: 'Cycle 4 — Reprise durable', triggerPercent: 70, position: 4,
        impacts: [
          { field: 'action_pea', submarket: 'PEA', coef: 1.20 },
          { field: 'etf_pea', submarket: 'ETF_PEA', coef: 1.20 },
          { field: 'action_us', submarket: 'CTO', coef: 1.20 },
          { field: 'etf_monde', submarket: 'CTO', coef: 1.20 },
          { field: 'obligation', submarket: 'OBLIGATIONS', coef: 1.03 },
        ],
        description: "Reprise durable : actions +20 %, obligations +3 %." },
      { title: 'Cycle 5 — Nouveau cycle', triggerPercent: 90, position: 5,
        impacts: [
          { field: 'action_pea', submarket: 'PEA', coef: 1.10 },
          { field: 'etf_pea', submarket: 'ETF_PEA', coef: 1.10 },
          { field: 'action_us', submarket: 'CTO', coef: 1.10 },
          { field: 'etf_monde', submarket: 'CTO', coef: 1.10 },
          { field: 'obligation', submarket: 'OBLIGATIONS', coef: 1.02 },
        ],
        description: "Nouveau cycle : actions +10 %, obligations +2 %, convergence des classes d'actifs." },
    ],
    quizTitle: 'Quiz Niveau 20 — Bâtir un patrimoine',
    quizDescription: 'Intérêt composé, horizon long et formule gagnante.',
    questions: [
      { text: 'Sur 20 ans, quel actif a historiquement offert le meilleur rendement annualisé ?',
        explanation: "Sur 20 ans, les actions via un ETF World ont historiquement offert ~7-8 % annualisés.",
        answers: [
          { text: 'Livret A (2-3 %)', isCorrect: false },
          { text: 'Actions via ETF World (7-8 % historiquement)', isCorrect: true },
          { text: 'Or (4-5 %)', isCorrect: false },
        ] },
      { text: "À 7 % par an, l'intérêt composé double un capital en environ...",
        explanation: "Selon la règle des 72, à 7 % par an un capital double en environ 10 ans (72 / 7).",
        answers: [
          { text: '20 ans', isCorrect: false },
          { text: '10 ans (règle des 72)', isCorrect: true },
          { text: 'Jamais', isCorrect: false },
        ] },
      { text: "Pourquoi est-il crucial d'investir tôt ?",
        explanation: "Investir tôt laisse à l'intérêt composé le temps d'amplifier le capital de façon exponentielle.",
        answers: [
          { text: 'Parce que les marchés baissent plus tard', isCorrect: false },
          { text: "Parce que l'intérêt composé amplifie le capital de manière exponentielle avec le temps", isCorrect: true },
          { text: 'Aucune raison particulière', isCorrect: false },
        ] },
      { text: "Quelle est la plus grosse erreur d'un investisseur long terme ?",
        explanation: "La pire erreur sur le long terme est de ne pas commencer, ou de sortir à chaque crise.",
        answers: [
          { text: 'Ne pas commencer, ou sortir à chaque crise', isCorrect: true },
          { text: 'Payer trop de frais', isCorrect: false },
          { text: 'Diversifier', isCorrect: false },
        ] },
      { text: 'Pour construire un patrimoine solide sur le long terme, la formule gagnante est...',
        explanation: "La formule gagnante : investir régulièrement (DCA) + horizon long + diversification + frais bas.",
        answers: [
          { text: 'Spéculer sur les cryptos à la mode', isCorrect: false },
          { text: 'Investir régulièrement (DCA) + temps (long horizon) + diversification + frais bas', isCorrect: true },
          { text: "Travailler plus d'heures", isCorrect: false },
        ] },
    ],
  },
];

// ---------------------------------------------------------------------------
// main()
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seed des 20 niveaux Cashou (20lvlseed.ts)...\n');

  await resetSequences();

  // --- 1. Market ---
  console.log('📊 Market...');
  let market = await prisma.market.findFirst({ where: { title: MARKET_TITLE } });
  const marketDescription = "Univers d'investissement complet de la progression Cashou : livrets, assurance vie, PEA, obligations, ETF, CTO et placements alternatifs.";
  if (market) {
    market = await prisma.market.update({ where: { id: market.id }, data: { description: marketDescription } });
  } else {
    market = await prisma.market.create({ data: { title: MARKET_TITLE, description: marketDescription } });
  }
  console.log(`  ✅ ${market.title} (ID ${market.id})`);

  // --- 2. Submarkets ---
  console.log('🌐 Submarkets...');
  const submarketsByKey: Record<string, { id: number }> = {};
  for (const def of SUBMARKETS) {
    let sub = await prisma.submarket.findFirst({ where: { title: def.title, marketId: market.id } });
    if (sub) {
      sub = await prisma.submarket.update({
        where: { id: sub.id },
        data: { description: def.description, type: def.type, marketId: market.id },
      });
    } else {
      sub = await prisma.submarket.create({
        data: { title: def.title, description: def.description, type: def.type, marketId: market.id },
      });
    }
    submarketsByKey[def.key] = sub;
    console.log(`  ✅ ${def.title} (${def.type})`);
  }

  // --- 3. Fields ---
  console.log('🏭 Fields...');
  const fieldsByName: Record<string, { id: number }> = {};
  for (const name of FIELDS) {
    const field = await prisma.field.upsert({
      where: { name },
      update: { marketId: market.id },
      create: { name, marketId: market.id },
    });
    fieldsByName[name] = field;
  }
  console.log(`  ✅ ${FIELDS.length} fields`);

  // --- 4. Assets ---
  console.log('💰 Assets...');
  const assetsBySymbol: Record<string, { id: number }> = {};
  for (const def of ASSETS) {
    const asset = await prisma.asset.upsert({
      where: { symbol: def.symbol },
      update: {
        title: def.title,
        rate: def.rate,
        description: def.description,
        marketId: market.id,
        submarketId: submarketsByKey[def.submarket].id,
        fieldId: fieldsByName[def.field].id,
        maxAmount: def.maxAmount,
        minAmount: def.minAmount,
        managementFee: MANAGEMENT_FEES[def.symbol] ?? null,
      },
      create: {
        symbol: def.symbol,
        title: def.title,
        rate: def.rate,
        description: def.description,
        marketId: market.id,
        submarketId: submarketsByKey[def.submarket].id,
        fieldId: fieldsByName[def.field].id,
        maxAmount: def.maxAmount,
        minAmount: def.minAmount,
        managementFee: MANAGEMENT_FEES[def.symbol] ?? null,
      },
    });
    assetsBySymbol[def.symbol] = asset;
  }
  console.log(`  ✅ ${ASSETS.length} assets`);

  // --- 5. AssetHistory ---
  console.log(`📈 AssetHistory (${TOTAL_HISTORY_DAYS} jours/asset, sans events bakés)...`);
  let totalHistory = 0;
  for (const def of ASSETS) {
    const asset = assetsBySymbol[def.symbol];
    await prisma.assetHistory.deleteMany({ where: { assetId: asset.id } });
    // Actifs à capital garanti (livrets + fonds euros) : AUCUN historique de prix.
    // Sans historique, le moteur les valorise en mode `rate`-based déterministe
    // (intérêts toujours positifs) — leur capital ne peut jamais baisser, et les
    // events qui les visent agissent sur leur *taux* (cf. asset-history.service).
    if (def.submarket === 'LIVRETS' || def.field === 'fonds_euros') {
      continue;
    }
    const history = generatePriceHistory(asset.id, 10000, def.rate, def.volatility);
    for (let i = 0; i < history.length; i += 500) {
      await prisma.assetHistory.createMany({ data: history.slice(i, i + 500), skipDuplicates: true });
    }
    totalHistory += history.length;
  }
  console.log(`  ✅ ${totalHistory} points d'historique`);

  // --- 6. Levels ---
  console.log('📚 Niveaux...');
  let eventCount = 0;
  let impactCount = 0;
  let goalCount = 0;
  let questionCount = 0;

  for (const lvl of LEVELS) {
    // 6.1 Level
    let level = await prisma.level.findFirst({ where: { number: lvl.number } });
    const levelData = {
      title: lvl.title,
      duration: lvl.duration,
      speed: lvl.speed,
      startBalance: lvl.startBalance,
      pointsRequired: lvl.pointsRequired,
      historyStartDay: HISTORY_START_DAY,
      description: lvl.description,
    };
    if (level) {
      level = await prisma.level.update({ where: { id: level.id }, data: levelData });
    } else {
      level = await prisma.level.create({ data: { number: lvl.number, ...levelData } });
    }

    const availableAssetSymbols = getAvailableAssetSymbolsForLevel(lvl.number);
    await prisma.levelAsset.deleteMany({ where: { levelId: level.id } });
    await prisma.levelAsset.createMany({
      data: availableAssetSymbols.map((symbol) => ({
        levelId: level.id,
        assetId: assetsBySymbol[symbol].id,
      })),
      skipDuplicates: true,
    });

    // 6.2 Goals (obligatoire + bonus)
    const goalSpecs = [
      { def: lvl.mandatoryGoal, goalType: 'wallet_gte_start', goalValue: 0, isMandatory: true },
      { def: lvl.bonusGoal, goalType: 'wallet_min', goalValue: lvl.bonusGoal.target, isMandatory: false },
    ];
    for (const spec of goalSpecs) {
      let goal = await prisma.goal.findFirst({ where: { title: spec.def.title } });
      const goalData = {
        description: spec.def.description,
        successMessage: spec.def.successMessage,
        failureMessage: spec.def.failureMessage,
        goalType: spec.goalType,
        goalValue: spec.goalValue,
      };
      if (goal) {
        goal = await prisma.goal.update({ where: { id: goal.id }, data: goalData });
      } else {
        goal = await prisma.goal.create({ data: { title: spec.def.title, ...goalData } });
        goalCount++;
      }
      const existingLink = await prisma.levelGoal.findFirst({ where: { levelId: level.id, goalId: goal.id } });
      if (existingLink) {
        await prisma.levelGoal.update({ where: { id: existingLink.id }, data: { isMandatory: spec.isMandatory } });
      } else {
        await prisma.levelGoal.create({ data: { levelId: level.id, goalId: goal.id, isMandatory: spec.isMandatory } });
      }
    }

    // 6.3 Events + Impacts + LevelEvent
    for (const ev of lvl.events) {
      let event = await prisma.event.findFirst({ where: { title: ev.title } });
      const hasImpact = ev.impacts.length > 0;
      if (event) {
        event = await prisma.event.update({ where: { id: event.id }, data: { description: ev.description, hasImpact } });
      } else {
        event = await prisma.event.create({ data: { title: ev.title, description: ev.description, hasImpact } });
        eventCount++;
      }

      // Impacts : on repart de zéro pour garantir l'idempotence
      await prisma.impact.deleteMany({ where: { eventId: event.id } });
      for (const imp of ev.impacts) {
        if ('asset' in imp) {
          await prisma.impact.create({
            data: { eventId: event.id, assetId: assetsBySymbol[imp.asset].id, coef: imp.coef },
          });
        } else {
          await prisma.impact.create({
            data: {
              eventId: event.id,
              fieldId: fieldsByName[imp.field].id,
              submarketId: submarketsByKey[imp.submarket].id,
              coef: imp.coef,
            },
          });
        }
        impactCount++;
      }

      // Lien Level <-> Event
      const existingLevelEvent = await prisma.levelEvent.findFirst({ where: { levelId: level.id, eventId: event.id } });
      if (existingLevelEvent) {
        await prisma.levelEvent.update({
          where: { id: existingLevelEvent.id },
          data: { triggerPercent: ev.triggerPercent, position: ev.position },
        });
      } else {
        await prisma.levelEvent.create({
          data: { levelId: level.id, eventId: event.id, triggerPercent: ev.triggerPercent, position: ev.position },
        });
      }
    }

    // 6.4 Quiz MCQ + Questions + Answers
    let quiz = await prisma.quiz.findFirst({ where: { type: 'MCQ', levelId: level.id } });
    if (quiz) {
      quiz = await prisma.quiz.update({
        where: { id: quiz.id },
        data: { title: lvl.quizTitle, description: lvl.quizDescription },
      });
    } else {
      quiz = await prisma.quiz.create({
        data: { type: 'MCQ', title: lvl.quizTitle, description: lvl.quizDescription, levelId: level.id },
      });
    }

    for (let i = 0; i < lvl.questions.length; i++) {
      const q = lvl.questions[i];
      let question = await prisma.question.findFirst({ where: { text: q.text } });
      if (question) {
        question = await prisma.question.update({ where: { id: question.id }, data: { explanation: q.explanation } });
      } else {
        question = await prisma.question.create({ data: { text: q.text, explanation: q.explanation } });
        questionCount++;
      }
      // Réponses : recréées à neuf pour rester idempotent
      await prisma.answer.deleteMany({ where: { questionId: question.id } });
      await prisma.answer.createMany({
        data: q.answers.map(a => ({ questionId: question!.id, text: a.text, isCorrect: a.isCorrect })),
      });
      // Lien Quiz <-> Question
      const existingQQ = await prisma.quizQuestion.findFirst({ where: { quizId: quiz.id, questionId: question.id } });
      if (existingQQ) {
        await prisma.quizQuestion.update({ where: { id: existingQQ.id }, data: { position: i + 1 } });
      } else {
        await prisma.quizQuestion.create({ data: { quizId: quiz.id, questionId: question.id, position: i + 1 } });
      }
    }

    console.log(`  ✅ N°${lvl.number} — ${lvl.title} (${lvl.events.length} events, ${lvl.questions.length} questions)`);
  }

  console.log('\n✨ ========================================');
  console.log('✅ Seed des 20 niveaux terminé');
  console.log('========================================');
  console.log(`   - 1 Market, ${SUBMARKETS.length} Submarkets, ${FIELDS.length} Fields`);
  console.log(`   - ${ASSETS.length} Assets, ${totalHistory} points d'historique`);
  console.log(`   - ${LEVELS.length} Levels`);
  console.log(`   - ${eventCount} Events créés, ${impactCount} Impacts`);
  console.log(`   - ${goalCount} Goals créés (2/niveau)`);
  console.log(`   - ${questionCount} Questions créées (1 Quiz MCQ/niveau)`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed des 20 niveaux :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
