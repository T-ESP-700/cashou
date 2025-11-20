import type { ReactNode } from 'react'
import { Coins, Gamepad2, Users } from 'lucide-react'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import { Button } from '@/components/ui/button'

export function PlayersMonitor() {
  const players = useBackofficeStore((state) => state.players ?? [])
  const loadingState = useBackofficeStore((state) => state.loadingState)
  const refresh = useBackofficeStore((state) => state.refresh)

  const totalWallet = players.reduce((sum, player) => sum + (player.walletAmount ?? 0), 0)
  const activePlayers = players.filter((player) => player.status === 'en partie').length

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Operations</p>
          <h2 className="text-xl font-semibold text-slate-900">Suivi des joueurs & parties</h2>
          <p className="text-sm text-slate-500">
            Vue d’ensemble des sessions actives. Connectez l’API utilisateur pour afficher les données live.
          </p>
        </div>
        <Button variant="outline" onClick={() => refresh()} disabled={loadingState === 'loading'}>
          Rafraîchir
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <MonitorCard
          title="Joueurs suivis"
          icon={<Users className="size-5 text-blue-600" />}
          value={players.length}
          helper="Mock data tant que l’API auth n’est pas branchée"
        />
        <MonitorCard
          title="En partie"
          icon={<Gamepad2 className="size-5 text-emerald-600" />}
          value={activePlayers}
          helper="Sessions actives"
        />
        <MonitorCard
          title="Portefeuilles"
          icon={<Coins className="size-5 text-amber-600" />}
          value={`${totalWallet.toLocaleString('fr-FR')} €`}
          helper="Capital cumulé"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Joueur</th>
              <th className="px-4 py-3">Niveau</th>
              <th className="px-4 py-3">Points</th>
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Dernière activité</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-900 font-medium">{player.username}</td>
                <td className="px-4 py-3">{player.levelId ?? '—'}</td>
                <td className="px-4 py-3">{player.points ?? '—'}</td>
                <td className="px-4 py-3">{player.walletAmount?.toLocaleString('fr-FR')} €</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {player.status ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {player.lastActivity ? new Date(player.lastActivity).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
            {!players.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  Aucune donnée live. Branchez l’API auth ou conservez ce mock pour vos démos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function MonitorCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string
  value: number | string
  helper?: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
        {icon}
      </div>
      <p className="mt-4 text-2xl font-semibold text-slate-900">{value}</p>
      {helper && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
  )
}
