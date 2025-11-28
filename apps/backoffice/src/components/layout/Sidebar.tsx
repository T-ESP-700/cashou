import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MODULE_CONFIGS } from '@/config/modules'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import { cn } from '@/lib/utils'
import type { BackofficeModule } from '@/lib/domain'
import logo from '@/frame-39.png'

const SIDEBAR_SECTIONS: Array<{ title: string; modules: BackofficeModule[] }> = [
  {
    title: 'Game Design',
    modules: ['levels', 'goals', 'levelGoals', 'levelEvents', 'quizzes'],
  },
  {
    title: 'Trading',
    modules: ['markets', 'submarkets', 'fields', 'assets', 'events', 'assetHistory', 'eventAsset', 'impacts'],
  },
  {
    title: 'Opérations',
    modules: ['players'],
  },
]

export function Sidebar() {
  const module = useBackofficeStore((state) => state.module)
  const setModule = useBackofficeStore((state) => state.setModule)
  const sidebarCollapsed = useBackofficeStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useBackofficeStore((state) => state.toggleSidebar)
  const loadingState = useBackofficeStore((state) => state.loadingState)
  const lastRefreshed = useBackofficeStore((state) => state.lastRefreshed)

  const statusLabel = useMemo(() => {
    switch (loadingState) {
      case 'loading':
        return 'Synchronisation...'
      case 'error':
        return 'Mode dégradé'
      case 'ready':
        return 'Connecté'
      default:
        return 'Initialisation'
    }
  }, [loadingState])

  const isCollapsed = sidebarCollapsed

  return (
    <aside
      className={cn(
        'bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-72',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
            <img src={logo} alt="Cashou" className="h-8 w-8 object-contain" />
          </div>
          {!isCollapsed && (
            <div>
              <p className="text-sm font-semibold text-slate-900">Cashou Backoffice</p>
              <p className="text-xs text-slate-500">Pilotage centralisé</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? 'Déployer la navigation' : 'Réduire la navigation'}
        >
          {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {section.title}
              </p>
            )}
            {section.modules.map((key) => {
              const config = MODULE_CONFIGS[key]
              if (!config) return null
              const Icon = config.icon
              const active = module === key
              return (
                <button
                  key={key}
                  onClick={() => setModule(key)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!isCollapsed && (
                    <div className="flex flex-col text-left">
                      <span>{config.title}</span>
                      <span className="text-xs font-normal text-slate-500">{config.description}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-4 py-4 text-xs text-slate-500 space-y-2">
        <div className="flex items-center gap-2">
          <Circle
            className={cn(
              'size-2.5',
              loadingState === 'ready'
                ? 'text-emerald-500 fill-emerald-500'
                : loadingState === 'error'
                  ? 'text-amber-500 fill-amber-500'
                  : 'text-slate-300',
            )}
          />
          <span>{statusLabel}</span>
        </div>
        {!isCollapsed && lastRefreshed && (
          <p className="text-[11px] text-slate-400">Dernière sync: {new Date(lastRefreshed).toLocaleString()}</p>
        )}
      </div>
    </aside>
  )
}
