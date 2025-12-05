import { useState, useMemo } from 'react'
import { Users, Gamepad2, Search, RefreshCw, ChevronDown, Play, Pause, Circle } from 'lucide-react'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import { PlayerDetailsDialog } from '@/components/modals/PlayerDetailsDialog'

type StatusFilter = 'all' | 'USER' | 'ADMIN'
type GameStatusFilter = 'all' | 'IN_PROGRESS' | 'PAUSED'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  USER: { bg: 'bg-blue-50', text: 'text-blue-700' },
  ADMIN: { bg: 'bg-purple-50', text: 'text-purple-700' },
  IN_PROGRESS: { bg: 'bg-green-50', text: 'text-green-700' },
  PAUSED: { bg: 'bg-amber-50', text: 'text-amber-700' },
  COMPLETED: { bg: 'bg-slate-100', text: 'text-slate-600' },
  ABANDONED: { bg: 'bg-red-50', text: 'text-red-600' },
}

const getStatusIcon = (status: string | null | undefined) => {
  switch (status) {
    case 'IN_PROGRESS':
      return <Play className="size-3" />
    case 'PAUSED':
      return <Pause className="size-3" />
    default:
      return <Circle className="size-3" />
  }
}

type StatusFilter = 'all' | 'USER' | 'ADMIN'
type GameStatusFilter = 'all' | 'IN_PROGRESS' | 'PAUSED'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  USER: { bg: 'bg-blue-50', text: 'text-blue-700' },
  ADMIN: { bg: 'bg-purple-50', text: 'text-purple-700' },
  IN_PROGRESS: { bg: 'bg-green-50', text: 'text-green-700' },
  PAUSED: { bg: 'bg-amber-50', text: 'text-amber-700' },
  COMPLETED: { bg: 'bg-slate-100', text: 'text-slate-600' },
  ABANDONED: { bg: 'bg-red-50', text: 'text-red-600' },
}

const getStatusIcon = (status: string | null | undefined) => {
  switch (status) {
    case 'IN_PROGRESS':
      return <Play className="size-3" />
    case 'PAUSED':
      return <Pause className="size-3" />
    default:
      return <Circle className="size-3" />
  }
}

export function PlayersMonitor() {
  const players = useBackofficeStore((state) => state.players ?? [])
  const gameInstances = useBackofficeStore((state) => state.gameInstances ?? [])
  const levels = useBackofficeStore((state) => state.levels ?? [])
  const markets = useBackofficeStore((state) => state.markets ?? [])
  const loadingState = useBackofficeStore((state) => state.loadingState)
  const refresh = useBackofficeStore((state) => state.refresh)

  const [playerSearch, setPlayerSearch] = useState('')
  const [playerStatusFilter, setPlayerStatusFilter] = useState<StatusFilter>('all')
  const [gameSearch, setGameSearch] = useState('')
  const [gameStatusFilter, setGameStatusFilter] = useState<GameStatusFilter>('all')

  const isLoading = loadingState === 'loading'

  // Filtered players
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesSearch =
        !playerSearch ||
        player.username?.toLowerCase().includes(playerSearch.toLowerCase()) ||
        player.id?.toString().includes(playerSearch)
      const matchesStatus = playerStatusFilter === 'all' || player.status === playerStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [players, playerSearch, playerStatusFilter])

  // Filtered games with enriched data
  const filteredGames = useMemo(() => {
    return gameInstances
      .map((game) => {
        const level = levels.find((l) => l.id === game.levelId)
        const market = markets.find((m) => m.id === game.marketId)
        const player = players.find((p) => p.id === game.userId)
        const isPaused = Boolean(game.isPaused)
        const displayStatusKey: GameStatusFilter = isPaused ? 'PAUSED' : 'IN_PROGRESS'
        const displayStatusLabel = isPaused ? 'En pause' : 'En cours'
        return {
          ...game,
          levelTitle: level?.title ?? `Niveau ${game.levelId}`,
          marketTitle: market?.title ?? `Marché ${game.marketId}`,
          playerUsername: player?.username ?? game.userId ?? '—',
          displayStatusKey,
          displayStatusLabel,
        }
      })
      .filter((game) => {
        const matchesSearch =
          !gameSearch ||
          game.levelTitle?.toLowerCase().includes(gameSearch.toLowerCase()) ||
          game.marketTitle?.toLowerCase().includes(gameSearch.toLowerCase()) ||
          game.playerUsername?.toLowerCase().includes(gameSearch.toLowerCase())
        const matchesStatus = gameStatusFilter === 'all' || game.displayStatusKey === gameStatusFilter
        return matchesSearch && matchesStatus
      })
  }, [gameInstances, levels, markets, players, gameSearch, gameStatusFilter])

  // Stats
  const playerStats = useMemo(() => ({
    total: players.length,
    admins: players.filter((p) => p.status === 'ADMIN').length,
    users: players.filter((p) => p.status === 'USER').length,
  }), [players])

  const gameStats = useMemo(() => {
    return gameInstances.reduce(
      (acc, game) => {
        acc.total += 1
        if (game.status === 'COMPLETED') {
          acc.completed += 1
          return acc
        }
        if (game.isPaused) {
          acc.paused += 1
        } else {
          acc.inProgress += 1
        }
        return acc
      },
      { total: 0, inProgress: 0, paused: 0, completed: 0 },
    )
  }, [gameInstances])

  return (
    <div className="space-y-6">
      {/* Players Section */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100">
              <Users className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Joueurs</p>
              <h2 className="text-lg font-semibold text-slate-900">Liste des profils</h2>
            </div>
          </div>

          {/* Stats badges */}
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {playerStats.total} total
            </span>
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
              {playerStats.admins} admins
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {playerStats.users} users
            </span>
          </div>
        </header>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un joueur..."
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="relative">
          </div>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Utilisateur</th>
                <th className="px-4 py-3 font-medium">Niveau</th>
                <th className="px-4 py-3 font-medium">Points</th>
                <th className="px-4 py-3 font-medium">Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => {
                const statusStyle = STATUS_COLORS[player.status ?? 'USER'] ?? STATUS_COLORS.USER
                return (
                  <tr key={player.id} className="border-t border-slate-100 transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-bold text-white">
                          {player.username?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span className="font-medium text-slate-900">{player.username ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        Niv. {player.levelId ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">{player.points?.toLocaleString() ?? '—'}</span>
                      <span className="ml-1 text-xs text-slate-400">pts</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {player.lastActivity ? new Date(player.lastActivity).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : '—'}
                    </td>
                  </tr>
                )
              })}
              {!filteredPlayers.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="size-8 text-slate-300" />
                      <p className="text-sm text-slate-500">
                        {players.length === 0 ? 'Aucun joueur trouvé. Vérifiez la connexion au backend.' : 'Aucun résultat pour ce filtre.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Game Instances Section */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100">
              <Gamepad2 className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Parties</p>
              <h2 className="text-lg font-semibold text-slate-900">Game Instances</h2>
            </div>
          </div>

          {/* Stats badges */}
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {gameStats.total} total
            </span>
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              {gameStats.inProgress} en cours
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              {gameStats.paused} en pause
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {gameStats.completed} terminées
            </span>
          </div>
        </header>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une partie..."
              value={gameSearch}
              onChange={(e) => setGameSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div className="relative">
            <select
              value={gameStatusFilter}
              onChange={(e) => setGameStatusFilter(e.target.value as GameStatusFilter)}
              className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-4 pr-10 text-sm focus:border-emerald-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">Tous les statuts</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="PAUSED">En pause</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Session</th>
                <th className="px-4 py-3 font-medium">Niveau</th>
                <th className="px-4 py-3 font-medium">Joueur</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map((game) => {
                const statusStyle = STATUS_COLORS[game.displayStatusKey] ?? STATUS_COLORS.IN_PROGRESS
                return (
                  <tr key={game.id} className="border-t border-slate-100 transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{game.title ?? `Game #${game.id}`}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {game.levelTitle}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white">
                          {game.playerUsername?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span className="text-slate-700">{game.playerUsername}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                        {getStatusIcon(game.displayStatusKey)}
                        {game.displayStatusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {game.createdAt ? new Date(game.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }) : '—'}
                    </td>
                  </tr>
                )
              })}
              {!filteredGames.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Gamepad2 className="size-8 text-slate-300" />
                      <p className="text-sm text-slate-500">
                        {gameInstances.length === 0 ? 'Aucune partie trouvée. Vérifiez la connexion au backend.' : 'Aucun résultat pour ce filtre.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <PlayerDetailsDialog
        userId={selectedPlayerId}
        open={isPlayerDialogOpen}
        onOpenChange={handleDialogOpenChange}
      />
    </div>
  )
}
