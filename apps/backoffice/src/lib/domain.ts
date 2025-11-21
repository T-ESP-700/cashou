import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type BackofficeModule =
  | 'levels'
  | 'goals'
  | 'markets'
  | 'submarkets'
  | 'fields'
  | 'assets'
  | 'events'
  | 'quizzes'
  | 'questions'
  | 'answers'
  | 'levelGoals'
  | 'levelEvents'
  | 'quizQuestions'
  | 'assetHistory'
  | 'eventAsset'
  | 'impacts'
  | 'players'

export type EntityIdentifier = number | string

export interface Level {
  id: number
  title?: string | null
  number?: number | null
  duration?: number | null
  speed?: number | null
  startBalance?: number | null
  pointsRequired?: number | null
  description?: string | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

export interface Goal {
  id: number
  title?: string | null
  description?: string | null
  type?: string | null
  kpi?: string | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

export interface Market {
  id: number
  title?: string | null
  description?: string | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  submarkets?: Submarket[]
  fields?: Field[]
  assets?: Asset[]
}

export interface Submarket {
  id: number
  title?: string | null
  description?: string | null
  marketId?: number | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  assets?: Asset[]
}

export interface Field {
  id: number
  name?: string | null
  marketId?: number | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

export interface Asset {
  id: number
  title?: string | null
  symbol?: string | null
  fieldId?: number | null
  field?: Field | null
  description?: string | null
  marketId?: number | null
  submarketId?: number | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  assetHistories?: AssetHistory[]
}

export interface AssetHistory {
  id: number
  assetId?: number | null
  timestamp?: string | Date | null
  value?: number | null
  volume?: number | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

export interface Event {
  id: number
  title?: string | null
  description?: string | null
  hasImpact?: boolean | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

export interface EventAsset {
  id: number
  assetId?: number | null
  eventId?: number | null
  date?: string | Date | null
  value?: number | null
  volume?: number | null
}

export interface Impact {
  id: number
  eventId?: number | null
  fieldId?: number | null
  submarketId?: number | null
  coef?: number | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  event?: Event | null
  field?: Field | null
  submarket?: Submarket | null
}

export interface LevelGoal {
  id: number
  levelId: number
  goalId: number
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  goal?: Goal | null
}

export interface LevelEvent {
  id: number
  levelId: number
  eventId: number
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  event?: Event | null
}

export type QuizType = 'DAILY' | 'MCQ'

export interface Quiz {
  id: number
  title?: string | null
  description?: string | null
  type?: QuizType | null
  levelId?: number | null
  date?: string | Date | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

export interface Question {
  id: number
  text?: string | null
  difficulty?: string | null
  category?: string | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  answers?: Answer[]
}

export interface Answer {
  id: number
  questionId: number
  text?: string | null
  isCorrect?: boolean | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

export interface QuizQuestion {
  id: number
  quizId: number
  questionId: number
  order?: number | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

export interface PlayerSnapshot {
  id: string
  username?: string | null
  levelId?: number | null
  points?: number | null
  activeGame?: string | null
  walletAmount?: number | null
  status?: string
  lastActivity?: string
}

export interface GameInstance {
  id: number
  title?: string | null
  status?: string | null
  marketId?: number | null
  levelId?: number | null
  userId?: string | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

export interface MarketKpis {
  total_assets?: number
  total_submarkets?: number
  diversity_score?: number
  estimated_market_cap?: string
  volatility_estimate?: string
  liquidity_score?: string
}

export interface MarketTopAsset {
  id: number
  symbol?: string | null
  title?: string | null
  market_cap?: number
  current_value?: number
  current_volume?: number
  performance_score?: number
  category?: string | null
  risk_level?: string
}

export interface MarketOverview {
  id: number
  title?: string | null
  description?: string | null
  kpis?: MarketKpis
  topAssets?: MarketTopAsset[]
  submarkets?: Submarket[]
}

export interface MarketSnapshot {
  market_id: number
  market_name?: string | null
  timestamp: string
  real_time_metrics: {
    total_market_value: number
    total_volume: number
    total_assets: number
    average_asset_value: number
    market_depth?: number
    last_update?: string
  }
  alerts: Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
    message: string
    details?: unknown
  }>
  trends?: Record<string, unknown>
  market_status?: string
}

export interface MarketHistoryPoint {
  period_label: string
  total_value: number
  total_volume: number
  volatility: number
}

export interface MarketHistory {
  market_id: number
  market_name?: string | null
  period: {
    from: string
    to: string
  }
  aggregated_data: MarketHistoryPoint[]
  temporal_statistics: Record<string, unknown>
  data_points_count: number
}

export interface HeatmapCell {
  id: number
  label: string
  metric_value: number
  score: number
  color: string
  meta?: Record<string, string | number>
}

export interface MarketHeatmap {
  market_id: number
  market_name?: string | null
  metric: HeatmapMetric
  generated_at: string
  heatmap_data: HeatmapCell[]
  color_scale: Array<{ stop: number; color: string; label: string }>
  interpretation?: Record<string, string>
}

export type HeatmapMetric = 'performance' | 'volume' | 'volatility' | 'risk'

export interface EntityColumn {
  key: string
  label: string
  width?: string
  render?: (record: Record<string, unknown>) => ReactNode
}

export interface EntityField {
  key: string
  label: string
  type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date'
  placeholder?: string
  helperText?: string
  options?: Array<{ label: string; value: string | number }>
  required?: boolean
  valueType?: 'string' | 'number'
}

export interface ModuleConfig {
  key: BackofficeModule
  title: string
  description: string
  badge?: string
  accent?: string
  icon: LucideIcon
  entityName?: string
  columns?: EntityColumn[]
  fields?: EntityField[]
  relations?: Array<{
    label: string
    map: (record: Record<string, unknown>) => Array<{ label: string; value: string | number }>
  }>
  extraActions?: Array<{
    label: string
    action: (record: Record<string, unknown>) => void
  }>
}

export interface BackofficeData {
  levels: Level[]
  goals: Goal[]
  levelGoals: LevelGoal[]
  levelEvents: LevelEvent[]
  quizzes: Quiz[]
  questions: Question[]
  answers: Answer[]
  quizQuestions: QuizQuestion[]
  markets: Market[]
  submarkets: Submarket[]
  fields: Field[]
  assets: Asset[]
  events: Event[]
  assetHistory: AssetHistory[]
  eventAsset: EventAsset[]
  impacts: Impact[]
  players?: PlayerSnapshot[]
  gameInstances?: GameInstance[]
}
