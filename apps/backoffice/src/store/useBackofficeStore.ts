import { create } from 'zustand'
import type {
  BackofficeData,
  BackofficeModule,
  EntityIdentifier,
  HeatmapMetric,
  QuizType,
} from '@/lib/domain'
import { mockBackofficeData } from '@/lib/mock-data'
import { fetchBackofficeDataset } from '@/services/backoffice-api'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

const emptyData: BackofficeData = {
  levels: [],
  goals: [],
  levelGoals: [],
  levelEvents: [],
  quizzes: [],
  questions: [],
  answers: [],
  quizQuestions: [],
  markets: [],
  submarkets: [],
  fields: [],
  assets: [],
  events: [],
  assetHistory: [],
  eventAsset: [],
  impacts: [],
  players: [],
  gameInstances: [],
}

const defaultRange = () => {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - 30)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export interface BackofficeStore extends BackofficeData {
  module: BackofficeModule
  searchTerm: string
  sidebarCollapsed: boolean
  selectedRecordId: EntityIdentifier | null
  loadingState: LoadState
  error: string | null
  lastRefreshed?: string
  selectedMarketId: number | null
  insightsMetric: HeatmapMetric
  dateRange: { from: string; to: string }
  hasInitialized: boolean
  quizTypeFilter: QuizType | 'ALL'
  initialize: () => Promise<void>
  refresh: () => Promise<void>
  setModule: (module: BackofficeModule) => void
  setSearchTerm: (term: string) => void
  selectRecord: (recordId: EntityIdentifier | null) => void
  toggleSidebar: () => void
  setSelectedMarketId: (marketId: number | null) => void
  setInsightsMetric: (metric: HeatmapMetric) => void
  setDateRange: (range: { from: string; to: string }) => void
  setQuizTypeFilter: (filter: QuizType | 'ALL') => void
}

export const useBackofficeStore = create<BackofficeStore>((set, get) => ({
  ...emptyData,
  ...mockBackofficeData,
  module: 'levels',
  searchTerm: '',
  sidebarCollapsed: false,
  selectedRecordId: null,
  loadingState: 'idle',
  error: null,
  lastRefreshed: undefined,
  selectedMarketId: mockBackofficeData.markets[0]?.id ?? null,
  insightsMetric: 'performance',
  dateRange: defaultRange(),
  hasInitialized: false,
  quizTypeFilter: 'ALL',
  initialize: async () => {
    const state = get()
    if (state.hasInitialized || state.loadingState === 'loading') {
      return
    }
    set({ loadingState: 'loading', error: null, hasInitialized: true })
    try {
      const dataset = await fetchBackofficeDataset()
      set({
        ...dataset,
        loadingState: 'ready',
        error: null,
        lastRefreshed: new Date().toISOString(),
        selectedMarketId: dataset.markets[0]?.id ?? null,
        hasInitialized: true,
      })
    } catch (error) {
      console.warn('Falling back to mock data for backoffice', error)
      set({
        ...mockBackofficeData,
        loadingState: 'error',
        error: (error as Error).message ?? 'API Cashou indisponible',
        hasInitialized: true,
      })
    }
  },
  refresh: async () => {
    set({ loadingState: 'loading', error: null })
    try {
      const dataset = await fetchBackofficeDataset()
      set({
        ...dataset,
        loadingState: 'ready',
        error: null,
        lastRefreshed: new Date().toISOString(),
        selectedMarketId: dataset.markets[0]?.id ?? null,
        hasInitialized: true,
      })
    } catch (error) {
      set({
        loadingState: 'error',
        error: (error as Error).message ?? 'API Cashou indisponible',
        hasInitialized: true,
      })
    }
  },
  setModule: (module) => set({ module, selectedRecordId: null }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  selectRecord: (selectedRecordId) => set({ selectedRecordId }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSelectedMarketId: (selectedMarketId) => set({ selectedMarketId }),
  setInsightsMetric: (insightsMetric) => set({ insightsMetric }),
  setDateRange: (dateRange) => set({ dateRange }),
  setQuizTypeFilter: (quizTypeFilter) => set({ quizTypeFilter }),
}))
