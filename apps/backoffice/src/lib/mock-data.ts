import type {
  Answer,
  Asset,
  AssetHistory,
  BackofficeData,
  Event,
  EventAsset,
  Field,
  Goal,
  Impact,
  Level,
  LevelEvent,
  LevelGoal,
  Market,
  PlayerSnapshot,
  Question,
  Quiz,
  QuizQuestion,
  Submarket,
  GameInstance,
} from './domain'

const sampleLevels: Level[] = [
  {
    id: 1,
    title: 'Onboarding',
    number: 1,
    duration: 7,
    speed: 1,
    startBalance: 10000,
    pointsRequired: 0,
    description: 'Introduction aux mécaniques Cashou',
  },
  {
    id: 2,
    title: 'Accélération',
    number: 2,
    duration: 14,
    speed: 2,
    startBalance: 25000,
    pointsRequired: 1200,
    description: 'Débloque les projections avancées',
  },
]

const sampleMarkets: Market[] = [
  {
    id: 1,
    title: 'Tech & IA',
    description: 'SaaS, Data & Intelligence Artificielle',
  },
  {
    id: 2,
    title: 'Energie Durable',
    description: 'Transition énergétique & neutralité carbone',
  },
]

const sampleSubmarkets: Submarket[] = [
  {
    id: 11,
    marketId: 1,
    title: 'AI Infrastructure',
    description: 'GPU providers & data infrastructure',
  },
  {
    id: 12,
    marketId: 1,
    title: 'Vertical SaaS',
    description: 'Solutions spécialisées par industrie',
  },
]

const sampleFields: Field[] = [
  {
    id: 21,
    marketId: 1,
    name: 'SaaS',
  },
  {
    id: 22,
    marketId: 1,
    name: 'Generative AI',
  },
  {
    id: 23,
    marketId: 2,
    name: 'Hydrogène',
  },
]

const sampleAssets: Asset[] = [
  {
    id: 31,
    marketId: 1,
    submarketId: 11,
    title: 'ComputeForge',
    symbol: 'CFOR',
    fieldId: 22,
    field: sampleFields[1],
    description: 'Plates-formes GPU européennes souveraines',
  },
  {
    id: 32,
    marketId: 1,
    submarketId: 12,
    title: 'ClinicOS',
    symbol: 'CLIN',
    fieldId: 21,
    field: sampleFields[0],
    description: 'SaaS vertical santé augmenté par IA',
  },
]

const sampleAssetHistory: AssetHistory[] = [
  {
    id: 41,
    assetId: 31,
    timestamp: new Date().toISOString(),
    value: 128000,
    volume: 320,
  },
  {
    id: 42,
    assetId: 32,
    timestamp: new Date().toISOString(),
    value: 82000,
    volume: 210,
  },
]

const sampleEvents: Event[] = [
  {
    id: 51,
    title: 'Banque européenne: cadre régulatoire IA',
    description: 'Nouveau cadre régulatoire favorisant l’adoption',
    hasImpact: true,
  },
  {
    id: 52,
    title: 'Subvention hydrogène France 2030',
    description: 'Budget supplémentaire de 500M€ annoncé',
    hasImpact: true,
  },
]

const sampleEventAssets: EventAsset[] = [
  {
    id: 61,
    assetId: 31,
    eventId: 51,
    date: new Date().toISOString(),
    value: 130000,
    volume: 380,
  },
]

const sampleImpacts: Impact[] = [
  {
    id: 71,
    eventId: 51,
    submarketId: 11,
    coef: 12,
  },
  {
    id: 72,
    eventId: 52,
    fieldId: 23,
    coef: 8,
  },
]

const sampleGameInstances: GameInstance[] = [
  {
    id: 501,
    title: 'Session Alpha',
    status: 'en cours',
    marketId: 1,
    levelId: 2,
    userId: 'user-1',
  },
  {
    id: 502,
    title: 'Session Beta',
    status: 'en préparation',
    marketId: 2,
    levelId: 1,
    userId: 'user-2',
  },
]

export const mockBackofficeData: BackofficeData = {
  levels: sampleLevels,
  goals: [
    { id: 81, title: 'Débloquer le quiz avancé', description: 'Obtenir 80% de bonnes réponses' },
    { id: 82, title: 'Survivre au stress test', description: 'Rester solvable après 3 événements' },
  ],
  levelGoals: [
    { id: 91, levelId: 1, goalId: 81 },
    { id: 92, levelId: 2, goalId: 82 },
  ],
  levelEvents: [
    { id: 101, levelId: 1, eventId: 51 },
    { id: 102, levelId: 2, eventId: 52 },
  ],
  quizzes: [
    { id: 111, title: 'Quiz onboarding', description: 'Valide les bases', type: 'MCQ', levelId: 1 },
    { id: 112, title: 'Daily #42', description: 'Quiz du jour', type: 'DAILY' },
  ],
  questions: [
    { id: 121, text: 'Quel est le levier max autorisé au niveau 1 ?', difficulty: 'easy' },
    { id: 122, text: 'Quel KPI surveiller pour la liquidité ?', difficulty: 'medium' },
  ],
  answers: [
    { id: 131, questionId: 121, text: 'x2', isCorrect: true },
    { id: 132, questionId: 121, text: 'x10', isCorrect: false },
    { id: 133, questionId: 122, text: 'Liquidity score', isCorrect: true },
    { id: 134, questionId: 122, text: 'Speed index', isCorrect: false },
  ],
  quizQuestions: [
    { id: 141, quizId: 111, questionId: 121, order: 1 },
    { id: 142, quizId: 111, questionId: 122, order: 2 },
  ],
  markets: sampleMarkets,
  submarkets: sampleSubmarkets,
  fields: sampleFields,
  assets: sampleAssets,
  events: sampleEvents,
  assetHistory: sampleAssetHistory,
  eventAsset: sampleEventAssets,
  impacts: sampleImpacts,
  players: [
    {
      id: 'user-1',
      username: 'alice_crypto',
      levelId: 2,
      points: 1280,
      activeGame: 'Game #54',
      walletAmount: 45200,
      status: 'en partie',
      lastActivity: new Date().toISOString(),
    },
    {
      id: 'user-2',
      username: 'bob_trader',
      levelId: 1,
      points: 420,
      walletAmount: 18750,
      status: 'disponible',
      lastActivity: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  ],
  gameInstances: sampleGameInstances,
  dicoEntries: [],
}
export const mockUpdatedAt = () => new Date().toISOString()
