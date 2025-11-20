import { useEffect } from 'react'
import './index.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { EntityWorkspace } from '@/components/modules/EntityWorkspace'
import { LevelsModule } from '@/components/modules/LevelsModule'
import { QuizzesModule } from '@/components/modules/QuizzesModule'
import { PlayersMonitor } from '@/components/modules/PlayersMonitor'
import { AuthGate } from '@/components/auth/AuthGate'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import type { BackofficeModule } from '@/lib/domain'

function App() {
  const module = useBackofficeStore((state) => state.module)

  useEffect(() => {
    useBackofficeStore.getState().initialize()
  }, [])

  return (
    <AuthGate>
      <div className="flex min-h-[calc(100vh-36px)] bg-slate-50 text-slate-900">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100 p-6">
            {renderModule(module)}
          </main>
        </div>
      </div>
    </AuthGate>
  )
}

function renderModule(module: BackofficeModule) {
  switch (module) {
    case 'levels':
      return <LevelsModule />
    case 'quizzes':
      return <QuizzesModule />
    case 'players':
      return <PlayersMonitor />
    default:
      return <EntityWorkspace />
  }
}

export default App
