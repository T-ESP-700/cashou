import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc'
import { Loader2, RefreshCw, Wallet, Gamepad2, Mail, Shield } from 'lucide-react'
import { useMemo } from 'react'

interface PlayerDetailsDialogProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(value)
  }
}

export function PlayerDetailsDialog({ userId, open, onOpenChange }: PlayerDetailsDialogProps) {
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = trpc.user.getById.useQuery(userId ?? '', {
    enabled: open && Boolean(userId),
    staleTime: 1000 * 30,
  })

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      onOpenChange(false)
      return
    }
    onOpenChange(true)
  }

  const renderContent = () => {
    if (!userId) {
      return <p className="text-sm text-slate-500">Sélectionnez un joueur pour consulter les détails.</p>
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Chargement du profil…
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-slate-500">Impossible de charger ce joueur : {error.message}</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" />
            Réessayer
          </Button>
        </div>
      )
    }

    if (!data) {
      return <p className="text-sm text-slate-500">Aucune donnée disponible pour ce joueur.</p>
    }

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Joueur</p>
              <h3 className="text-xl font-semibold text-slate-900">{data.username ?? data.email ?? data.id}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1">
                <Mail className="size-4 text-slate-400" />
                {data.email ?? '—'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1">
                <Shield className="size-4 text-slate-400" />
                {data.role ?? 'USER'}
              </span>
            </div>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Dernière activité</dt>
              <dd className="text-sm font-medium text-slate-900">{formatDateTime(data.lastActivity)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Points</dt>
              <dd className="text-sm font-medium text-slate-900">{data.points ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Niveau</dt>
              <dd className="text-sm font-medium text-slate-900">{data.levelId ?? data.level ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Créé le</dt>
              <dd className="text-sm font-medium text-slate-900">{formatDateTime(data.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 pb-3">
            <Gamepad2 className="size-5 text-blue-500" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Dernières parties</p>
              <p className="text-sm font-medium text-slate-900">
                {data.gameInstances?.length ? 'Historiques récents' : 'Aucune partie récente'}
              </p>
            </div>
          </div>
          {data.gameInstances?.length ? (
            <div className="space-y-3">
              {data.gameInstances.map((game) => (
                <div key={game.id} className="rounded-xl border border-slate-100 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900">{game.title ?? `Game #${game.id}`}</p>
                  <p className="text-xs text-slate-500">
                    Status: {game.status ?? '—'} · {formatDateTime(game.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucune instance de jeu à afficher.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails du joueur</DialogTitle>
        </DialogHeader>
        {renderContent()}
        {isFetching && !isLoading && (
          <p className="mt-4 flex items-center text-xs text-slate-400">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Actualisation…
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
