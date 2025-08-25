export interface Market {
  id: number;
  name: string | null;
  description: string | null;
  currentTrends: string | null;
  dataSource: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMarketDto {
  name?: string;
  description?: string;
  currentTrends?: string;
  dataSource?: string;
}

export interface UpdateMarketDto {
  name?: string;
  description?: string;
  currentTrends?: string;
  dataSource?: string;
}

export interface MarketWithRelations extends Market {
  submarkets?: {
    id: number;
    name: string | null;
    description: string | null;
  }[];
  assets?: {
    id: number;
    title: string | null;
    symbol: string | null;
  }[];
  fields?: {
    id: number;
    title: string | null;
  }[];
}

export interface MarketQuery {
  id?: number;
  name?: string;
  includeSubmarkets?: boolean;
  includeAssets?: boolean;
  includeFields?: boolean;
  page?: number;
  limit?: number;
}
