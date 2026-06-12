import { useMemo, useState } from 'react'
import { Plus, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import { backofficeApi } from '@/services/backoffice-api'
import { cn } from '@/lib/utils'

export function LevelRelationsPanel() {
  const module = useBackofficeStore((state) => state.module)
  const selectedRecordId = useBackofficeStore((state) => state.selectedRecordId)
  const levels = useBackofficeStore((state) => state.levels)
  const goals = useBackofficeStore((state) => state.goals)
  const events = useBackofficeStore((state) => state.events)
  const levelGoals = useBackofficeStore((state) => state.levelGoals)
  const levelEvents = useBackofficeStore((state) => state.levelEvents)
  const refresh = useBackofficeStore((state) => state.refresh)

  const [goalToAttach, setGoalToAttach] = useState<number | ''>('')
  const [eventToAttach, setEventToAttach] = useState<number | ''>('')
  const [loading, setLoading] = useState<'goal' | 'event' | null>(null)

  const parsedSelection =
    typeof selectedRecordId === 'number' ? selectedRecordId : Number(selectedRecordId)
  const activeLevelId =
    Number.isFinite(parsedSelection) && parsedSelection > 0
      ? parsedSelection
      : levels[0]?.id ?? null

  const activeLevel = levels.find((level) => level.id === activeLevelId)
  const attachedGoals = levelGoals.filter((link) => link.levelId === activeLevelId)
  const attachedEvents = levelEvents.filter((link) => link.levelId === activeLevelId)

  const availableGoals = useMemo(
    () => goals.filter((goal) => !attachedGoals.some((link) => link.goalId === goal.id)),
    [goals, attachedGoals],
  )

  const availableEvents = useMemo(
    () => events.filter((event) => !attachedEvents.some((link) => link.eventId === event.id)),
    [events, attachedEvents],
  )

  if (module !== 'levels') {
    return null
  }

  if (!activeLevelId) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6">
        <p className="text-sm text-slate-500">
          Créez un niveau pour gérer ses objectifs et événements associés.
        </p>
      </section>
    )
  }

  const attachGoal = async (isMandatory = true) => {
    if (!goalToAttach || !activeLevelId) return
    setLoading('goal')
    try {
      await backofficeApi.levelGoal.create({
        levelId: activeLevelId,
        goalId: goalToAttach,
        isMandatory,
      })
      await refresh()
      setGoalToAttach('')
    } catch (error) {
      alert((error as Error).message ?? 'Impossible de lier cet objectif')
    } finally {
      setLoading(null)
    }
  }

  const detachGoal = async (linkId: number) => {
    setLoading('goal')
    try {
      await backofficeApi.levelGoal.delete(linkId)
      await refresh()
    } catch (error) {
      alert((error as Error).message ?? 'Impossible de supprimer ce lien')
    } finally {
      setLoading(null)
    }
  }

  const attachEvent = async () => {
    if (!eventToAttach || !activeLevelId) return
    setLoading('event')
    try {
      await backofficeApi.levelEvent.create({ levelId: activeLevelId, eventId: eventToAttach })
      await refresh()
      setEventToAttach('')
    } catch (error) {
      alert((error as Error).message ?? 'Impossible de lier cet événement')
    } finally {
      setLoading(null)
    }
  }

  const detachEvent = async (linkId: number) => {
    setLoading('event')
    try {
      await backofficeApi.levelEvent.delete(linkId)
      await refresh()
    } catch (error) {
      alert((error as Error).message ?? 'Impossible de supprimer ce lien')
    } finally {
      setLoading(null)
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Design du niveau</p>
          <h3 className="text-lg font-semibold text-slate-900">
            Relations pour {activeLevel?.title ?? `Niveau ${activeLevelId}`}
          </h3>
        </div>
      </header>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">Objectifs associés</h4>
            <span className="text-xs text-slate-500">{attachedGoals.length} objectifs</span>
          </div>
          <ul className="mt-3 space-y-2">
            {attachedGoals.map((link) => {
              const goal = goals.find((item) => item.id === link.goalId)
              const isMandatory = link.isMandatory !== false
              return (
                <li
                  key={link.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">{goal?.title ?? `Objectif #${link.goalId}`}</p>
                    <p className="text-xs text-slate-500">
                      {goal?.description}
                      {goal?.description ? ' · ' : ''}
                      <span className={isMandatory ? 'text-amber-600' : 'text-slate-500'}>
                        {isMandatory ? 'Obligatoire' : 'Bonus'}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        setLoading('goal')
                        try {
                          await backofficeApi.levelGoal.update({
                            id: link.id,
                            data: {
                              levelId: link.levelId,
                              goalId: link.goalId,
                              isMandatory: !isMandatory,
                            },
                          })
                          await refresh()
                        } catch (e) {
                          alert((e as Error).message)
                        } finally {
                          setLoading(null)
                        }
                      }}
                      disabled={loading === 'goal'}
                      aria-label={isMandatory ? 'Passer en bonus' : "Passer en obligatoire"}
                    >
                      {isMandatory ? 'Bonus' : 'Oblig.'}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => detachGoal(link.id)}
                      disabled={loading === 'goal'}
                      aria-label="Détacher l'objectif"
                    >
                      <Unlink className="size-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
            {!attachedGoals.length && (
              <li className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-500">
                Aucun objectif pour ce niveau.
              </li>
            )}
          </ul>
          {availableGoals.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <select
                className="flex-1 min-w-[160px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={goalToAttach}
                onChange={(event) => setGoalToAttach(event.target.value === '' ? '' : Number(event.target.value))}
              >
                <option value="">Associer un objectif…</option>
                {availableGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title ?? `Objectif #${goal.id}`}
                  </option>
                ))}
              </select>
              <Button onClick={() => attachGoal(true)} disabled={!goalToAttach || loading === 'goal'}>
                <Plus className="size-4" />
                Lier (obligatoire)
              </Button>
              <Button variant="outline" onClick={() => attachGoal(false)} disabled={!goalToAttach || loading === 'goal'}>
                <Plus className="size-4" />
                Lier (bonus)
              </Button>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">Événements déclenchés</h4>
            <span className="text-xs text-slate-500">{attachedEvents.length} événements</span>
          </div>
          <ul className="mt-3 space-y-2">
            {attachedEvents.map((link) => {
              const event = events.find((item) => item.id === link.eventId)
              return (
                <li
                  key={link.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">{event?.title ?? `Événement #${link.eventId}`}</p>
                    <p className="text-xs text-slate-500">{event?.description}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => detachEvent(link.id)}
                    disabled={loading === 'event'}
                    aria-label="Détacher l'événement"
                  >
                    <Unlink className="size-4" />
                  </Button>
                </li>
              )
            })}
            {!attachedEvents.length && (
              <li className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-500">
                Aucun événement lié à ce niveau.
              </li>
            )}
          </ul>
          {availableEvents.length > 0 && (
            <div className="mt-3 flex gap-2">
              <select
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={eventToAttach}
                onChange={(event) =>
                  setEventToAttach(event.target.value === '' ? '' : Number(event.target.value))
                }
              >
                <option value="">Associer un événement…</option>
                {availableEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title ?? `Événement #${event.id}`}
                  </option>
                ))}
              </select>
              <Button onClick={attachEvent} disabled={!eventToAttach || loading === 'event'}>
                <Plus className="size-4" />
                Lier
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
