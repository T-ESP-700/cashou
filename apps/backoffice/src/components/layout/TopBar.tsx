import { useMemo } from 'react'
import { RefreshCw, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MODULE_CONFIGS } from '@/config/modules'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import { cn } from '@/lib/utils'

export function TopBar() {
  const module = useBackofficeStore((state) => state.module)
  const searchTerm = useBackofficeStore((state) => state.searchTerm)
  const setSearchTerm = useBackofficeStore((state) => state.setSearchTerm)
  const refresh = useBackofficeStore((state) => state.refresh)
  const loadingState = useBackofficeStore((state) => state.loadingState)
  const selectRecord = useBackofficeStore((state) => state.selectRecord)

  const config = MODULE_CONFIGS[module]

  const placeholder = useMemo(() => {
    return `Rechercher dans ${config?.title?.toLowerCase() ?? 'le module'}...`
  }, [config?.title])

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-900">
            {config?.icon && <config.icon className="size-4 text-slate-500" />}
            <p className="text-base font-semibold">{config?.title ?? 'Backoffice'}</p>
            {config?.badge && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {config.badge}
              </span>
            )}
          </div>
          {config?.description && <p className="text-xs text-slate-500">{config.description}</p>}
        </div>
      </div>
    </header>
  )
}
