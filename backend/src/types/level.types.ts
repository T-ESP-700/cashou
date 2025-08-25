export interface Level {
  id: number;
  title: string | null;
  number: number | null;
  duration: number | null;
  speed: number | null;
  startBalance: number | null;
  pointsRequired: number | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LevelWithRelations extends Level {
  users?: {
    id: number;
    username: string | null;
    email: string | null;
  }[];
  gameInstances?: {
    id: number;
    type: string | null;
    isPaused: boolean | null;
  }[];
  quiz?: {
    id: number;
    type: 'daily' | 'MCQ' | null;
    title: string | null;
  }[];
  levelGoals?: {
    id: number;
    goal: {
      id: number;
      title: string | null;
      description: string | null;
    };
  }[];
}

export interface LevelQuery {
  number?: number;
  includeUsers?: boolean;
  includeGameInstances?: boolean;
  includeQuiz?: boolean;
  includeGoals?: boolean;
  page?: number;
  limit?: number;
}
