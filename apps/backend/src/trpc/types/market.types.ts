import type { Market, Submarket, Asset, AssetHistory, Field, Prisma } from "@prisma/client";

// ============================================
// Types composés Prisma pour les relations
// ============================================

export type AssetWithHistory = Asset & {
  assetHistories: AssetHistory[];
  field?: Field | null;
};

export type SubmarketWithAssets = Submarket & {
  assets: AssetWithHistory[];
  _count?: { assets: number };
};

export type SubmarketWithCount = Submarket & {
  _count: { assets: number };
};

export type MarketWithRelations = Market & {
  assets: AssetWithHistory[];
  submarkets: SubmarketWithAssets[];
  fields?: Field[];
};

export type MarketWithCount = Market & {
  _count: { assets: number; submarkets: number };
};

// ============================================
// Types pour les KPIs et métriques
// ============================================

export interface MarketKPIs {
  total_assets: number;
  total_submarkets: number;
  diversity_score: number;
  estimated_market_cap: string;
  volatility_estimate: string;
  liquidity_score: string;
}

export interface RealTimeMetrics {
  total_market_value: number;
  total_volume: number;
  total_assets: number;
  average_asset_value: number;
  market_depth: string;
  last_update: string;
}

// ============================================
// Types pour les alertes
// ============================================

export interface MarketAlert {
  type: string;
  severity: string;
  message: string;
  details?: Array<{ id: number; title: string | null }>;
}

// ============================================
// Types pour le snapshot temps réel
// ============================================

export interface MarketSnapshot {
  market_id: number;
  market_name: string | null;
  timestamp: string;
  real_time_metrics: RealTimeMetrics;
  alerts: MarketAlert[];
  trends: MarketTrends;
  market_status: string;
}

export interface MarketTrends {
  market_summary: MarketSummary;
}

export interface MarketSummary {
  total_assets: number;
  total_submarkets: number;
  average_assets_per_submarket: number;
  market_structure: string;
}

// ============================================
// Types pour les top assets
// ============================================

export interface TopAsset {
  id: number;
  symbol: string | null;
  title: string | null;
  market_cap: number;
  current_value: number;
  current_volume: number;
  performance_score: number;
  category: string;
  risk_level: string;
}

// ============================================
// Types pour la rotation sectorielle
// ============================================

export interface SectorAnalysis {
  sector_name: string;
  sector_type: string;
  asset_count: number;
  total_value: number;
  total_volume: number;
  average_value: number;
  average_volume: number;
  market_share: number;
  momentum: number;
  rotation_signal: string;
}

export interface RotationInsights {
  growth_momentum: number;
  cyclical_momentum: number;
  defensive_momentum: number;
  rotation_trend: string;
  leading_sector: string;
  lagging_sector: string;
}

export interface SectorRotation {
  sectors: SectorAnalysis[];
  rotation_insights: RotationInsights;
  market_phase: string;
  recommended_actions: string[];
}

// ============================================
// Types pour l'historique agrégé
// ============================================

export interface DailyAggregatedData {
  date: string;
  total_value: number;
  total_volume: number;
  asset_count: number;
  transactions: Array<{
    asset_id: number;
    asset_symbol: string | null;
    value: number;
    volume: number;
  }>;
}

export interface TemporalStatistics {
  total_periods: number;
  average_daily_value: number;
  average_daily_volume: number;
  volatility: number;
  trend_direction: string;
}

export interface MarketHistory {
  market_id: number;
  market_name: string | null;
  period: {
    from: string;
    to: string;
  };
  aggregated_data: DailyAggregatedData[];
  temporal_statistics: TemporalStatistics;
  data_points_count: number;
}

// ============================================
// Types pour la heatmap
// ============================================

export interface HeatmapAsset {
  asset_id: number;
  asset_symbol: string | null;
  intensity: number;
  value: number;
  volume: number;
}

export interface SubmarketHeatmap {
  submarket_id: number;
  submarket_name: string | null;
  intensity: number;
  assets: HeatmapAsset[];
}

export interface ColorScale {
  low: string;
  medium: string;
  high: string;
}

export interface MarketHeatmap {
  market_id: number;
  market_name: string | null;
  metric: string;
  generated_at: string;
  heatmap_data: SubmarketHeatmap[];
  color_scale: ColorScale;
  interpretation: string;
}

// ============================================
// Types pour l'overview
// ============================================

export interface MarketOverview extends Market {
  kpis: MarketKPIs;
  topAssets: TopAsset[];
  submarkets: Submarket[];
}

// ============================================
// Types pour le tree
// ============================================

export interface MarketTree extends Market {
  submarkets: Array<Submarket & { assets_count: number }>;
}

// ============================================
// Types pour les filtres Prisma
// ============================================

export type MarketWhereInput = Prisma.MarketWhereInput;

// ============================================
// Types pour AssetHistory avec relations
// ============================================

export type AssetHistoryWithAsset = AssetHistory & {
  asset: {
    id: number;
    title: string | null;
    symbol: string | null;
    field: Field | null;
  };
};
