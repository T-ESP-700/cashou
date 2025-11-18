import './index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/trpc';
import { Layout } from './components/layout/Layout';

// Pages
import Dashboard from './pages/dashboard';
import UiDemo from './pages/ui';
import LevelsPage from './pages/levels';
import CreateLevelPage from './pages/levels/create';
import EditLevelPage from './pages/levels/[id]/edit';
import EventsPage from './pages/events';
import CreateEventPage from './pages/events/create';
import EditEventPage from './pages/events/[id]/edit';
import GoalsPage from './pages/goals';
import CreateGoalPage from './pages/goals/create';
import EditGoalPage from './pages/goals/[id]/edit';
import QuizPage from './pages/quiz';
import CreateQuizPage from './pages/quiz/create';
import ShowQuizPage from './pages/quiz/[id]/show';
import EditQuizPage from './pages/quiz/[id]/edit';
import ShowQuestionPage from './pages/questions/[id]/show';
import EditQuestionPage from './pages/questions/[id]/edit';
import QuestionsPage from './pages/questions';
import CreateQuestionPage from './pages/questions/create';
import AnswersPage from './pages/answers';
import CreateAnswerPage from './pages/answers/create';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="ui" element={<UiDemo />} />

            {/* Game Management Routes */}
            <Route path="levels" element={<LevelsPage />} />
            <Route path="levels/create" element={<CreateLevelPage />} />
            <Route path="levels/:id/edit" element={<EditLevelPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/create" element={<CreateEventPage />} />
            <Route path="events/:id/edit" element={<EditEventPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="goals/create" element={<CreateGoalPage />} />
            <Route path="goals/:id/edit" element={<EditGoalPage />} />

            {/* Quiz System Routes */}
            <Route path="quiz" element={<QuizPage />} />
            <Route path="quiz/create" element={<CreateQuizPage />} />
            <Route path="quiz/:id" element={<ShowQuizPage />} />
            <Route path="quiz/:id/edit" element={<EditQuizPage />} />
            <Route path="questions" element={<QuestionsPage />} />
            <Route path="questions/create" element={<CreateQuestionPage />} />
            <Route path="questions/:id" element={<ShowQuestionPage />} />
            <Route path="questions/:id/edit" element={<EditQuestionPage />} />
            <Route path="answers" element={<AnswersPage />} />
            <Route path="answers/create" element={<CreateAnswerPage />} />

            {/* Profile */}
            <Route path="profile" element={<div>Profile - Coming soon</div>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
