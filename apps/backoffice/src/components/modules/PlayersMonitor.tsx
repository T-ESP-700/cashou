import { Users, Gamepad2 } from 'lucide-react'
import { useBackofficeStore } from '@/store/useBackofficeStore'

export function PlayersMonitor() {
  const players = useBackofficeStore((state) => state.players ?? [])
  const gameInstances = useBackofficeStore((state) => state.gameInstances ?? [])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex items-center gap-2">
          <Users className="size-5 text-blue-600" />
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Joueurs</p>
            <h2 className="text-lg font-semibold text-slate-900">Liste des profils</h2>
          </div>
        </header>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Utilisateur</th>
                <th className="px-4 py-2">Niveau</th>
                <th className="px-4 py-2">Points</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-900">{player.username}</td>
                  <td className="px-4 py-2">{player.levelId ?? '—'}</td>
                  <td className="px-4 py-2">{player.points ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {player.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {player.lastActivity ? new Date(player.lastActivity).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {!players.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    Aucun joueur mock. Branchez l’API.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex items-center gap-2">
          <Gamepad2 className="size-5 text-emerald-600" />
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Parties</p>
            <h2 className="text-lg font-semibold text-slate-900">Games instances</h2>
          </div>
        </header>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Session</th>
                <th className="px-4 py-2">Marché</th>
                <th className="px-4 py-2">Niveau</th>
                <th className="px-4 py-2">Joueur</th>
                <th className="px-4 py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {gameInstances.map((game) => (
                <tr key={game.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-900">{game.title ?? `Game #${game.id}`}</td>
                  <td className="px-4 py-2">{game.marketId ?? '—'}</td>
                  <td className="px-4 py-2">{game.levelId ?? '—'}</td>
                  <td className="px-4 py-2">{game.userId ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {game.status ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
              {!gameInstances.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    Aucune partie mock. Branchez l’API.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
