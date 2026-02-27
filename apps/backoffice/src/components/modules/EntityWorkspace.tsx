import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Plus } from 'lucide-react'
import { MODULE_CONFIGS } from '@/config/modules'
import type { BackofficeModule, EntityField } from '@/lib/domain'
import { backofficeApi, CrudOperations } from '@/services/backoffice-api'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type {
  Level, Goal, LevelGoal, LevelEvent, Quiz, Question, Answer, QuizQuestion,
  Market, Submarket, Field, Asset, Event, AssetHistory, EventAsset, Impact, DicoEntry
} from '@/lib/domain'

// Union type for all possible entity types
type BaseEntity = Level | Goal | LevelGoal | LevelEvent | Quiz | Question | Answer | QuizQuestion |
  Market | Submarket | Field | Asset | Event | AssetHistory | EventAsset | Impact | DicoEntry

const CRUD_HANDLERS: Partial<Record<BackofficeModule, CrudOperations>> = {
  levels: backofficeApi.level,
  goals: backofficeApi.goal,
  levelGoals: backofficeApi.levelGoal,
  levelEvents: backofficeApi.levelEvent,
  markets: backofficeApi.market,
  submarkets: backofficeApi.submarket,
  fields: backofficeApi.field,
  assets: backofficeApi.asset,
  events: backofficeApi.event,
  quizzes: backofficeApi.quiz,
  questions: backofficeApi.question,
  answers: backofficeApi.answer,
  quizQuestions: backofficeApi.quizQuestion,
  assetHistory: backofficeApi.assetHistory,
  eventAsset: backofficeApi.eventAsset,
  impacts: backofficeApi.impact,
  dicoEntries: backofficeApi.dicoEntry,
}

export function EntityWorkspace({ moduleKey }: { moduleKey?: BackofficeModule } = {}) {
  const currentModule = useBackofficeStore((state) => state.module)
  const module = moduleKey ?? currentModule
  const searchTerm = useBackofficeStore((state) => state.searchTerm)
  const selectRecord = useBackofficeStore((state) => state.selectRecord)
  const selectedRecordId = useBackofficeStore((state) => state.selectedRecordId)
  const refresh = useBackofficeStore((state) => state.refresh)
  const levels = useBackofficeStore((state) => state.levels)
  const goals = useBackofficeStore((state) => state.goals)
  const levelGoals = useBackofficeStore((state) => state.levelGoals)
  const levelEvents = useBackofficeStore((state) => state.levelEvents)
  const quizzes = useBackofficeStore((state) => state.quizzes)
  const questions = useBackofficeStore((state) => state.questions)
  const answers = useBackofficeStore((state) => state.answers)
  const quizQuestions = useBackofficeStore((state) => state.quizQuestions)
  const markets = useBackofficeStore((state) => state.markets)
  const submarkets = useBackofficeStore((state) => state.submarkets)
  const fields = useBackofficeStore((state) => state.fields)
  const assets = useBackofficeStore((state) => state.assets)
  const events = useBackofficeStore((state) => state.events)
  const assetHistory = useBackofficeStore((state) => state.assetHistory)
  const eventAsset = useBackofficeStore((state) => state.eventAsset)
  const impacts = useBackofficeStore((state) => state.impacts)
  const dicoEntries = useBackofficeStore((state) => state.dicoEntries)
  const quizTypeFilter = useBackofficeStore((state) => state.quizTypeFilter)

  const config = MODULE_CONFIGS[module]
  if (!config || module === 'players') return null

  const records = useMemo(
    () =>
      getRecordsForModule(module, {
        levels,
        goals,
        levelGoals,
        levelEvents,
        quizzes,
        questions,
        answers,
        quizQuestions,
        markets,
        submarkets,
        fields,
        assets,
        events,
        assetHistory,
        eventAsset,
        impacts,
        dicoEntries: dicoEntries ?? [],
      }),
    [
      module,
      levels,
      goals,
      levelGoals,
      levelEvents,
      quizzes,
      questions,
      answers,
      quizQuestions,
      markets,
      submarkets,
      fields,
      assets,
      events,
      assetHistory,
      eventAsset,
      impacts,
      dicoEntries,
    ],
  )

  const moduleFilteredRecords = useMemo(() => {
    if (module === 'quizzes' && quizTypeFilter !== 'ALL') {
      return records.filter((record) => 'type' in record && record.type === quizTypeFilter)
    }
    return records
  }, [records, module, quizTypeFilter])

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return moduleFilteredRecords
    const term = searchTerm.toLowerCase()
    return moduleFilteredRecords.filter((record) =>
      Object.values(record)
        .filter((value) => ['string', 'number'].includes(typeof value))
        .some((value) => value?.toString().toLowerCase().includes(term)),
    )
  }, [moduleFilteredRecords, searchTerm])

  const selectedRecord =
    selectedRecordId && selectedRecordId !== '__new__'
      ? records.find((record) => record.id === selectedRecordId)
      : null

  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (selectedRecord && selectedRecordId !== '__new__') {
      setFormValues(selectedRecord as unknown as Record<string, unknown>)
    } else {
      setFormValues({})
    }
  }, [selectedRecord, selectedRecordId])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!config.fields?.length) return
    const handler = CRUD_HANDLERS[module]
    if (!handler) return
    setIsSubmitting(true)
    setStatus(null)
    const payload = sanitizePayload(config.fields, formValues)
    const isEditing = Boolean(selectedRecord && selectedRecordId !== '__new__')
    try {
      if (selectedRecord && selectedRecordId !== '__new__') {
        if (typeof handler.update !== 'function') {
          setStatus({
            type: 'error',
            message: 'Ce module ne permet pas encore la modification. Supprimez puis recréez la liaison.',
          })
          return
        }
        await handler.update({ id: selectedRecord.id, data: payload })
      } else {
        await handler.create(payload)
      }
      setStatus({ type: 'success', message: 'Synchronisé avec succès' })
      await refresh()
      selectRecord(null)
      if (!isEditing) {
        setFormValues({})
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: (error as Error).message ?? 'Erreur lors de la synchronisation',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRecord) return
    const handler = CRUD_HANDLERS[module]
    if (!handler) return
    if (!window.confirm('Supprimer définitivement cette entrée ?')) return
    setIsDeleting(true)
    setStatus(null)
    try {
      await handler.delete(selectedRecord.id as number)
      setStatus({ type: 'success', message: 'Entrée supprimée' })
      await refresh()
      selectRecord(null)
    } catch (error) {
      setStatus({
        type: 'error',
        message: (error as Error).message ?? 'Impossible de supprimer cet élément',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const dynamicOptions = buildDynamicOptions({
    markets,
    submarkets,
    fields,
    assets,
    events,
    levels,
    goals,
    quizzes,
    questions,
  })

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {config.entityName ?? config.title}
          </p>
          <h2 className="text-xl font-semibold text-slate-900">{config.title}</h2>
          <p className="text-sm text-slate-500">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => selectRecord('__new__')}>
            <Plus className="size-4" />
            Ajouter
          </Button>

        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between px-2 py-3">
            <div>
              <p className="text-xs uppercase text-slate-500">Enregistrements</p>
              <p className="text-sm text-slate-600">{filteredRecords.length} éléments filtrés</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectRecord(filteredRecords[0]?.id ?? null)}
              disabled={!filteredRecords.length}
            >
              Sélectionner le premier
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  {config.columns?.map((column) => (
                    <th key={column.key} className="px-4 py-3 font-medium" style={{ width: column.width }}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => selectRecord(record.id)}
                    className={cn(
                      'cursor-pointer border-t border-slate-100 transition hover:bg-slate-50/80',
                      selectedRecord?.id === record.id && 'bg-slate-900/5',
                    )}
                  >
                    {config.columns?.map((column) => (
                      <td key={`${record.id}-${column.key}`} className="px-4 py-3 text-slate-700">
                        {column.render
                          ? column.render(record as unknown as Record<string, unknown>)
                          : formatValue(record[column.key as keyof typeof record])}
                      </td>
                    ))}
                  </tr>
                ))}
                {!filteredRecords.length && (
                  <tr>
                    <td colSpan={config.columns?.length ?? 1} className="px-4 py-8 text-center text-sm text-slate-500">
                      Aucun résultat pour la recherche en cours.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <header>
            <p className="text-xs uppercase tracking-wide text-slate-500">Détail & actions</p>
            <h3 className="text-lg font-semibold text-slate-900">
              {selectedRecord ? `${config.entityName ?? 'Entrée'} #${selectedRecord.id}` : 'Nouvelle entrée'}
            </h3>
          </header>
          {status && (
            <div
              className={cn(
                'mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm',
                status.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-800',
              )}
            >
              {status.type === 'success' ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
              <span>{status.message}</span>
            </div>
          )}

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            {config.fields?.map((field) => (
              <FieldControl
                key={field.key}
                field={field}
                value={formValues[field.key]}
                onChange={(value) => setFormValues((prev) => ({ ...prev, [field.key]: value }))}
                options={dynamicOptions[field.key] ?? field.options}
              />
            ))}

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sauvegarde...' : 'Enregistrer'}
              </Button>
              {selectedRecord && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer'}
                </Button>
              )}
            </div>
          </form>

        </section>
      </div>
    </div>
  )
}

function FieldControl({
  field,
  value,
  onChange,
  options,
}: {
  field: EntityField
  value: unknown
  onChange: (value: unknown) => void
  options?: Array<{ value: string | number; label: string }>
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span>{field.label}</span>
      {field.type === 'textarea' && (
        <textarea
          value={(value as string) ?? ''}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
          placeholder={field.placeholder}
        />
      )}
      {field.type === 'text' && (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
          placeholder={field.placeholder}
        />
      )}
      {field.type === 'number' && (
        <input
          type="number"
          value={(value as string | number | undefined) ?? ''}
          onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
          placeholder={field.placeholder}
        />
      )}
      {field.type === 'checkbox' && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span className="text-sm text-slate-600">{field.helperText ?? 'Activer'}</span>
        </div>
      )}
      {field.type === 'date' && (
        <input
          type="date"
          value={(value as string) ?? ''}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
        />
      )}
      {field.type === 'select' && (
        <select
          value={(value as string | number | undefined) ?? ''}
          onChange={(event) => {
            const nextValue = event.target.value
            if (nextValue === '') {
              onChange('')
              return
            }
            if (field.valueType === 'string') {
              onChange(nextValue)
            } else {
              onChange(Number(nextValue))
            }
          }}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
        >
          <option value="">Choisir...</option>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {field.helperText && (
        <span className="mt-1 block text-xs text-slate-500">{field.helperText}</span>
      )}
    </label>
  )
}

function sanitizePayload(fields: EntityField[], values: Record<string, unknown>) {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    const value = values[field.key]
    if (value === undefined || value === '') return acc
    acc[field.key] = value
    return acc
  }, {})
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') return value.toLocaleString('fr-FR')
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (value instanceof Date) return value.toLocaleString()
  return String(value)
}

function getRecordsForModule(
  module: BackofficeModule,
  data: {
    levels: Level[]
    goals: Goal[]
    levelGoals: LevelGoal[]
    levelEvents: LevelEvent[]
    quizzes: Quiz[]
    questions: Question[]
    answers: Answer[]
    quizQuestions: QuizQuestion[]
    markets: Market[]
    submarkets: Submarket[]
    fields: Field[]
    assets: Asset[]
    events: Event[]
    assetHistory: AssetHistory[]
    eventAsset: EventAsset[]
    impacts: Impact[]
    dicoEntries: DicoEntry[]
  },
): BaseEntity[] {
  switch (module) {
    case 'levels':
      return data.levels
    case 'goals':
      return data.goals
    case 'levelGoals':
      return data.levelGoals
    case 'levelEvents':
      return data.levelEvents
    case 'quizzes':
      return data.quizzes
    case 'questions':
      return data.questions
    case 'answers':
      return data.answers
    case 'quizQuestions':
      return data.quizQuestions
    case 'markets':
      return data.markets
    case 'submarkets':
      return data.submarkets
    case 'fields':
      return data.fields
    case 'assets':
      return data.assets
    case 'events':
      return data.events
    case 'assetHistory':
      return data.assetHistory
    case 'eventAsset':
      return data.eventAsset
    case 'impacts':
      return data.impacts
    case 'dicoEntries':
      return data.dicoEntries
    default:
      return []
  }
}

function buildDynamicOptions({
  markets,
  submarkets,
  fields,
  assets,
  events,
  levels,
  goals,
  quizzes,
  questions,
}: {
  markets: Market[]
  submarkets: Submarket[]
  fields: Field[]
  assets: Asset[]
  events: Event[]
  levels: Level[]
  goals: Goal[]
  quizzes: Quiz[]
  questions: Question[]
}): Record<string, Array<{ value: number; label: string }>> {
  return {
    marketId: markets.map((market) => ({
      value: market.id,
      label: market.title ?? `Marché ${market.id}`,
    })),
    submarketId: submarkets.map((submarket) => ({
      value: submarket.id,
      label: submarket.title ?? `Sous-marché ${submarket.id}`,
    })),
    fieldId: fields.map((field) => ({
      value: field.id,
      label: field.name ?? `Champ ${field.id}`,
    })),
    assetId: assets.map((asset) => ({
      value: asset.id,
      label: asset.title ?? `Actif ${asset.id}`,
    })),
    eventId: events.map((event) => ({
      value: event.id,
      label: event.title ?? `Event ${event.id}`,
    })),
    levelId: levels.map((level) => ({
      value: level.id,
      label: level.title ?? `Niveau ${level.id}`,
    })),
    goalId: goals.map((goal) => ({
      value: goal.id,
      label: goal.title ?? `Objectif ${goal.id}`,
    })),
    quizId: quizzes.map((quiz) => ({
      value: quiz.id,
      label: quiz.title ?? `Quiz ${quiz.id}`,
    })),
    questionId: questions.map((question) => ({
      value: question.id,
      label: question.text?.slice(0, 42) ?? `Question ${question.id}`,
    })),
  }
}
