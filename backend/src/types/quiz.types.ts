export interface Quiz {
  id: number;
  type: 'daily' | 'MCQ' | null;
  title: string | null;
  date: Date | null;
  levelId: number | null;
  context: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizWithRelations extends Quiz {
  level?: {
    id: number;
    title: string | null;
    number: number | null;
  } | null;
  userQuiz?: {
    id: number;
    userId: number | null;
    completedAt: Date | null;
    isCorrect: boolean | null;
  }[];
  quizQuestions?: {
    id: number;
    questionId: number | null;
    position: number | null;
    question?: {
      id: number;
      text: string | null;
    } | null;
  }[];
}

export interface QuizQuery {
  type?: 'daily' | 'MCQ';
  levelId?: number;
  includeLevel?: boolean;
  includeUserQuiz?: boolean;
  includeQuestions?: boolean;
  page?: number;
  limit?: number;
}
