import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc'
import {
  Loader2,
  RefreshCw,
  Wallet,
  Gamepad2,
  Mail,
  Shield,
  Trophy,
  Clock,
  Calendar,
  TrendingUp,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  User,
  Sparkles
} from 'lucide-react'

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

const formatRelativeTime = (value?: string | Date | null) => {
  if (!value) return null
  try {
    const date = new Date(value)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'À l\'instant'
    if (minutes < 60) return `Il y a ${minutes}min`
    if (hours < 24) return `Il y a ${hours}h`
    if (days < 7) return `Il y a ${days}j`
    return null
  } catch {
    return null
  }
}

const getGameStatusConfig = (status?: string | null, isPaused?: boolean) => {
  if (isPaused) {
    return {
      icon: Pause,
      label: 'En pause',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
    }
  }
  switch (status) {
    case 'COMPLETED':
      return {
        icon: CheckCircle2,
        label: 'Terminée',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-100',
      }
    case 'ABANDONED':
      return {
        icon: XCircle,
        label: 'Abandonnée',
        bg: 'bg-red-50',
        text: 'text-red-600',
        border: 'border-red-200',
        iconBg: 'bg-red-100',
      }
    case 'IN_PROGRESS':
    default:
      return {
        icon: Play,
        label: 'En cours',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
      }
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
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 mb-4">
            <User className="size-8 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">Sélectionnez un joueur pour consulter les détails.</p>
        </div>
      )
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 blur-xl opacity-30 animate-pulse" />
            <Loader2 className="relative size-10 animate-spin text-blue-500" />
          </div>
          <p className="mt-4 text-sm font-medium">Chargement du profil…</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-50">
            <XCircle className="size-8 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Erreur de chargement</p>
            <p className="mt-1 text-xs text-slate-500">{error.message}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" />
            Réessayer
          </Button>
        </div>
      )
    }

    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 mb-4">
            <User className="size-8 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">Aucune donnée disponible pour ce joueur.</p>
        </div>
      )
    }

    const relativeTime = formatRelativeTime(data.lastActivity)

    return (
      <div className="space-y-5">
        {/* Player Header Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white">
          {/* Background decoration */}
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 size-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 text-2xl font-bold shadow-lg shadow-purple-500/25">
                  {data.username?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-slate-900">
                  <Sparkles className="size-3 text-white" />
                </div>
              </div>

              {/* Name & Role */}
              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  {data.username ?? 'Joueur anonyme'}
                </h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-300">
                    <Shield className="size-3" />
                    Joueur
                  </span>
                  {relativeTime && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="size-3" />
                      {relativeTime}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Points Badge */}
            <div className="text-right">
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm">
                <Trophy className="size-5 text-amber-400" />
                <div>
                  <p className="text-xs font-medium text-slate-400">Points</p>
                  <p className="text-lg font-bold tabular-nums">
                    {data.points?.toLocaleString() ?? '0'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Email */}
          <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                <Mail className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Email</p>
                <p className="truncate text-sm font-medium text-slate-900">{data.email ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Level */}
          <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                <TrendingUp className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Niveau</p>
                <p className="text-sm font-medium text-slate-900">Niveau {data.levelId ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Created At */}
          <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 transition-colors group-hover:bg-purple-100">
                <Calendar className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Inscrit le</p>
                <p className="text-sm font-medium text-slate-900">{formatDateTime(data.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Game Instances Section */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500">
                <Gamepad2 className="size-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Historique des parties</h4>
                <p className="text-xs text-slate-500">
                  {data.gameInstances?.length ?? 0} partie{(data.gameInstances?.length ?? 0) !== 1 ? 's' : ''} enregistrée{(data.gameInstances?.length ?? 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            {data.gameInstances?.length ? (
              <div className="space-y-2">
                {data.gameInstances.map((game: Record<string, unknown> & { id?: number | string; type?: string | null; isPaused?: boolean | null; createdAt?: string | Date }) => {
                  const statusConfig = getGameStatusConfig(game.type, game.isPaused ?? false)
                  const StatusIcon = statusConfig.icon

                  return (
                    <div
                      key={game.id}
                      className={`group flex items-center justify-between rounded-xl border ${statusConfig.border} ${statusConfig.bg} p-3 transition-all hover:shadow-sm`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex size-8 items-center justify-center rounded-lg ${statusConfig.iconBg}`}>
                          <StatusIcon className={`size-4 ${statusConfig.text}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {game.type ?? `Partie #${game.id}`}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(game.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 mb-3">
                  <Gamepad2 className="size-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">Aucune partie</p>
                <p className="mt-0.5 text-xs text-slate-400">Ce joueur n'a pas encore lancé de partie</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="size-5 text-slate-400" />
            Détails du joueur
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5">
          {renderContent()}
        </div>

        {isFetching && !isLoading && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            <Loader2 className="size-3 animate-spin" />
            Actualisation…
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
