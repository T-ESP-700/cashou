import { createApiClient } from '@cashou/api'
import type {
  Asset,
  AssetHistory,
  BackofficeData,
  Event,
  EventAsset,
  Field,
  GameInstance,
  HeatmapMetric,
  Impact,
  Level,
  Market,
  MarketHeatmap,
  MarketHistory,
  MarketOverview,
  MarketSnapshot,
  Submarket,
  Goal,
  LevelGoal,
  LevelEvent,
  Quiz,
  Question,
  Answer,
  QuizQuestion,
} from '@/lib/domain'

const normalizeApiUrl = (rawUrl?: string) => {
  if (!rawUrl || rawUrl.trim() === '') {
    return 'http://localhost:3000/api/trpc'
  }

  try {
    const parsed = new URL(rawUrl)
    const cleanedPath = parsed.pathname.replace(/\/+$/, '')
    if (!cleanedPath.includes('/trpc')) {
      parsed.pathname = `${cleanedPath}/trpc`
    }
    return parsed.toString().replace(/\/+$/, '')
  } catch {
    const trimmed = rawUrl.replace(/\/+$/, '')
    if (trimmed.includes('/trpc')) {
      return trimmed
    }
    return `${trimmed}/trpc`
  }
}

const DEFAULT_API_URL = normalizeApiUrl(
  import.meta.env.VITE_TRPC_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/trpc',
)

let authToken: string | null = null
let cachedClient: ReturnType<typeof createApiClient> | null = null
let apiBaseUrl = DEFAULT_API_URL

const buildHeaders = async () => {
  const headers: Record<string, string> = {}
  if (authToken) {
    headers['authorization'] = `Bearer ${authToken}`
  }
  return headers
}

const getClient = () => {
  if (!cachedClient) {
    cachedClient = createApiClient(apiBaseUrl, buildHeaders)
  }
  return cachedClient
}

const resetClient = () => {
  cachedClient = null
}

export const setApiToken = (token: string | null) => {
  authToken = token
  resetClient()
}

export const setApiBaseUrl = (url: string) => {
  apiBaseUrl = normalizeApiUrl(url) || DEFAULT_API_URL
  resetClient()
}

const isExpectedEmptyState = (error: unknown) => {
  if (!(error instanceof Error)) return false
  const normalized = error.message.toLowerCase()
  return (
    normalized.includes('non trouvé') ||
    normalized.includes('not found') ||
    normalized.includes('no such market')
  )
}

async function callApi<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (error) {
    const message =
      error instanceof Error && /Unexpected token/.test(error.message)
        ? 'Le backend a répondu avec un payload non tRPC. Vérifiez que VITE_TRPC_URL pointe vers votre endpoint tRPC et que le backend est démarré.'
        : error instanceof Error
          ? error.message
          : 'Erreur inconnue'

    if (isExpectedEmptyState(error)) {
      console.info('[Cashou Backoffice API] Info:', message)
    } else {
      console.error('[Cashou Backoffice API] Error:', message)
    }

    throw error
  }
}

export async function fetchBackofficeDataset(): Promise<BackofficeData> {
  const client = getClient()
  const [
    levels,
    goals,
    levelGoals,
    levelEvents,
    quizzes,
    questions,
    answers,
    quizQuestions,
    markets,
    submarkets,
    fields,
    assets,
    events,
    assetHistory,
    eventAsset,
    impacts,
    users,
    gameInstances,
  ] = await Promise.all([
    callApi(() => client.level.getAll.query()) as Promise<any>,
    callApi(() => client.goal.getAll.query()) as Promise<any>,
    callApi(() => client.levelGoal.getAll.query()) as Promise<any>,
    callApi(() => client.levelEvent.getAll.query()) as Promise<any>,
    callApi(() => client.quiz.getAll.query()) as Promise<any>,
    callApi(() => client.question.getAll.query()) as Promise<any>,
    callApi(() => client.answer.getAll.query()) as Promise<any>,
    callApi(() => client.quizQuestion.getAll.query()) as Promise<any>,
    callApi(() => client.market.getAll.query()) as Promise<any>,
    callApi(() => client.submarket.getAll.query()) as Promise<any>,
    callApi(() => client.field.getAll.query()) as Promise<any>,
    callApi(() => client.asset.getAll.query()) as Promise<any>,
    callApi(() => client.event.getAll.query()) as Promise<any>,
    callApi(() => client.assetHistory.getAll.query()) as Promise<any>,
    callApi(() => client.eventAsset.getAll.query()) as Promise<any>,
    callApi(() => client.impact.getAll.query()) as Promise<any>,
    callApi(() => client.user.getAll.query()).catch(() => []) as Promise<any>,
    callApi(() => client.gameInstance.getAll.query()).catch(() => []) as Promise<any>,
  ])

  // Map users to PlayerSnapshot format
  const players = (users as any[]).map((user: any) => ({
    id: user.id,
    username: user.username || user.email,
    levelId: user.level ?? user.levelId,
    points: user.points,
    role: user.role ?? 'USER',
    lastActivity: user.updatedAt || user.createdAt,
  }))

  return {
    levels: levels as Level[],
    goals: goals as Goal[],
    levelGoals: levelGoals as LevelGoal[],
    levelEvents: levelEvents as LevelEvent[],
    quizzes: quizzes as Quiz[],
    questions: questions as Question[],
    answers: answers as Answer[],
    quizQuestions: quizQuestions as QuizQuestion[],
    markets: markets as Market[],
    submarkets: submarkets as Submarket[],
    fields: fields as Field[],
    assets: assets as Asset[],
    events: events as Event[],
    assetHistory: assetHistory as AssetHistory[],
    eventAsset: eventAsset as EventAsset[],
    impacts: impacts as Impact[],
    players,
    gameInstances: gameInstances as GameInstance[],
  }
}

export const backofficeApi = {
  level: {
    list: async () => callApi(() => getClient().level.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().level.create.mutate(payload)),
    update: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().level.update.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().level.delete.mutate({ id })),
  },
  goal: {
    list: async () => callApi(() => getClient().goal.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().goal.create.mutate(payload)),
    update: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().goal.update.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().goal.delete.mutate({ id })),
  },
  levelGoal: {
    list: async () => callApi(() => getClient().levelGoal.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().levelGoal.create.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().levelGoal.delete.mutate({ id })),
  },
  levelEvent: {
    list: async () => callApi(() => getClient().levelEvent.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().levelEvent.create.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().levelEvent.delete.mutate({ id })),
  },
  market: {
    list: async () => callApi(() => getClient().market.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().market.create.mutate(payload)),
    update: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().market.update.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().market.delete.mutate({ id })),
    overview: async (marketId: number) =>
      (await callApi(() => getClient().market.getOverview.query({ marketId }))) as MarketOverview,
    snapshot: async (marketId: number) =>
      (await callApi(() => getClient().market.getSnapshot.query({ marketId }))) as MarketSnapshot,
    history: async (marketId: number, from: string, to: string) =>
      (await callApi(() =>
        getClient().market.getHistory.query({ marketId, from, to }),
      )) as MarketHistory,
    heatmap: async (marketId: number, metric: HeatmapMetric) =>
      (await callApi(() =>
        getClient().market.getHeatmap.query({ marketId, metric }),
      )) as MarketHeatmap,
    tree: async (marketId: number) =>
      callApi(() => getClient().market.getTree.query({ marketId })),
    search: async (query: string) =>
      callApi(() => getClient().market.search.query({ query, tag: undefined, trend: undefined })),
  },
  submarket: {
    list: async () => callApi(() => getClient().submarket.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().submarket.create.mutate(payload)),
    update: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().submarket.update.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().submarket.delete.mutate({ id })),
  },
  field: {
    list: async () => callApi(() => getClient().field.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().field.create.mutate(payload)),
    update: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().field.update.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().field.delete.mutate({ id })),
  },
  asset: {
    list: async () => callApi(() => getClient().asset.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().asset.create.mutate(payload)),
    update: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().asset.update.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().asset.delete.mutate({ id })),
  },
  event: {
    list: async () => callApi(() => getClient().event.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().event.create.mutate(payload)),
    update: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().event.update.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().event.delete.mutate({ id })),
  },
  assetHistory: {
    list: async () => callApi(() => getClient().assetHistory.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().assetHistory.create.mutate(payload)),
    update: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().assetHistory.update.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().assetHistory.delete.mutate({ id })),
  },
  eventAsset: {
    list: async () => callApi(() => getClient().eventAsset.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().eventAsset.create.mutate(payload)),
    update: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().eventAsset.update.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().eventAsset.delete.mutate({ id })),
  },
  impact: {
    list: async () => callApi(() => getClient().impact.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().impact.create.mutate(payload)),
    update: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().impact.update.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().impact.delete.mutate({ id })),
  },
  quiz: {
    list: async () => callApi(() => getClient().quiz.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().quiz.create.mutate(payload)),
    update: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().quiz.update.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().quiz.delete.mutate({ id })),
    dailyQuizExists: async (date: string) =>
      callApi(() => getClient().quiz.dailyQuizExists.query({ date })),
  },
  question: {
    list: async () => callApi(() => getClient().question.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().question.create.mutate(payload)),
    update: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().question.update.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().question.delete.mutate({ id })),
  },
  answer: {
    list: async () => callApi(() => getClient().answer.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().answer.create.mutate(payload)),
    update: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().answer.update.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().answer.delete.mutate({ id })),
  },
  quizQuestion: {
    list: async () => callApi(() => getClient().quizQuestion.getAll.query()),
    create: async (payload: Record<string, unknown>) =>
      callApi(() => getClient().quizQuestion.create.mutate(payload)),
    delete: async (id: number) => callApi(() => getClient().quizQuestion.delete.mutate({ id })),
  },
}
export interface MarketInsightsPayload {
  marketId: number
  from: string
  to: string
  metric: HeatmapMetric
}

export async function fetchMarketInsights({
  marketId,
  from,
  to,
  metric,
}: MarketInsightsPayload): Promise<{
  overview: MarketOverview
  snapshot: MarketSnapshot
  history: MarketHistory
  heatmap: MarketHeatmap
}> {
  const [overview, snapshot, history, heatmap] = await Promise.all([
    backofficeApi.market.overview(marketId),
    backofficeApi.market.snapshot(marketId),
    backofficeApi.market.history(marketId, from, to),
    backofficeApi.market.heatmap(marketId, metric),
  ])

  return {
    overview,
    snapshot,
    history,
    heatmap,
  }
}
