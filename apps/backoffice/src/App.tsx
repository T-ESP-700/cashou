import { ReactNode, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { EntityWorkspace } from '@/components/modules/EntityWorkspace'
import { LevelsModule } from '@/components/modules/LevelsModule'
import { QuizzesModule } from '@/components/modules/QuizzesModule'
import { QuestionsModule } from '@/components/modules/QuestionsModule'
import { PlayersMonitor } from '@/components/modules/PlayersMonitor'
import { DicoModule } from '@/components/modules/DicoModule'
import { LocalAuthGate } from '@/components/auth/LocalAuthGate'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import type { BackofficeModule } from '@/lib/domain'
import CreateQuestionPage from '@/pages/questions/create'
import CreateQuizPage from '@/pages/quiz/create'

function App() {
  return (
    <LocalAuthGate>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BackofficeLayout />} />
          <Route path="/questions" element={<BackofficeLayout initialModule="questions" />} />
          <Route path="/quiz" element={<BackofficeLayout initialModule="quizzes" />} />
          <Route
            path="/quiz/create"
            element={
              <BackofficeLayout initialModule="quizzes">
                <CreateQuizPage />
              </BackofficeLayout>
            }
          />
          <Route
            path="/questions/create"
            element={
              <BackofficeLayout initialModule="questions">
                <CreateQuestionPage />
              </BackofficeLayout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LocalAuthGate>
  )
}

function BackofficeLayout({
  children,
  initialModule,
}: {
  children?: ReactNode
  initialModule?: BackofficeModule
}) {
  const module = useBackofficeStore((state) => state.module)
  const setModule = useBackofficeStore((state) => state.setModule)

  useEffect(() => {
    useBackofficeStore.getState().initialize()
  }, [])

  useEffect(() => {
    if (initialModule && module !== initialModule) {
      setModule(initialModule)
    }
  }, [initialModule, module, setModule])

  return (
    <div className="flex min-h-[calc(100vh-36px)] bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100 p-6">
          {children ?? renderModule(module)}
        </main>
      </div>
    </div>
  )
}

function renderModule(module: BackofficeModule) {
  switch (module) {
    case 'levels':
      return <LevelsModule />
    case 'quizzes':
      return <QuizzesModule />
    case 'questions':
      return <QuestionsModule />
    case 'players':
      return <PlayersMonitor />
    case 'dicoEntries':
      return <DicoModule />
    default:
      return <EntityWorkspace />
  }
}

export default App
