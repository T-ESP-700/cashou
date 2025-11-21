import { useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import { backofficeApi } from '@/services/backoffice-api'

export function QuestionAnswersPanel() {
  const module = useBackofficeStore((state) => state.module)
  const selectedRecordId = useBackofficeStore((state) => state.selectedRecordId)
  const questions = useBackofficeStore((state) => state.questions)
  const answers = useBackofficeStore((state) => state.answers)
  const refresh = useBackofficeStore((state) => state.refresh)

  const [answerText, setAnswerText] = useState('')
  const [answerIsCorrect, setAnswerIsCorrect] = useState(false)
  const [loading, setLoading] = useState<'create' | number | null>(null)

  if (module !== 'questions') return null

  const parsedSelection =
    typeof selectedRecordId === 'number' ? selectedRecordId : Number(selectedRecordId)
  const activeQuestionId =
    Number.isFinite(parsedSelection) && parsedSelection > 0
      ? parsedSelection
      : questions[0]?.id ?? null

  if (!activeQuestionId) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6">
        <p className="text-sm text-slate-500">Créez une question pour gérer ses réponses.</p>
      </section>
    )
  }

  const activeQuestion = questions.find((question) => question.id === activeQuestionId)
  const relatedAnswers = answers.filter((answer) => answer.questionId === activeQuestionId)

  const createAnswer = async () => {
    if (!answerText.trim()) return
    setLoading('create')
    try {
      await backofficeApi.answer.create({
        questionId: activeQuestionId,
        text: answerText.trim(),
        isCorrect: answerIsCorrect,
      })
      await refresh()
      setAnswerText('')
      setAnswerIsCorrect(false)
    } catch (error) {
      alert((error as Error).message ?? 'Impossible de créer la réponse')
    } finally {
      setLoading(null)
    }
  }

  const toggleCorrect = async (answerId: number, nextValue: boolean) => {
    setLoading(answerId)
    try {
      await backofficeApi.answer.update({ id: answerId, data: { isCorrect: nextValue } })
      await refresh()
    } catch (error) {
      alert((error as Error).message ?? 'Impossible de mettre à jour la réponse')
    } finally {
      setLoading(null)
    }
  }

  const deleteAnswer = async (answerId: number) => {
    if (!window.confirm('Supprimer cette réponse ?')) return
    setLoading(answerId)
    try {
      await backofficeApi.answer.delete(answerId)
      await refresh()
    } catch (error) {
      alert((error as Error).message ?? 'Impossible de supprimer la réponse')
    } finally {
      setLoading(null)
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Question builder</p>
          <h3 className="text-lg font-semibold text-slate-900">
            Réponses pour {activeQuestion?.text?.slice(0, 60) ?? `Question #${activeQuestionId}`}
          </h3>
        </div>
        <span className="text-xs text-slate-500">{relatedAnswers.length} réponses</span>
      </header>

      <div className="mt-4 space-y-3">
        {relatedAnswers.map((answer) => (
          <div
            key={answer.id}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <div>
              <p className="text-sm text-slate-900">{answer.text ?? `Réponse #${answer.id}`}</p>
              <p className="text-xs text-slate-500">
                {answer.isCorrect ? 'Bonne réponse' : 'Distracteur'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={answer.isCorrect ? 'default' : 'outline'}
                onClick={() => toggleCorrect(answer.id, !answer.isCorrect)}
                disabled={loading === answer.id}
              >
                <Check className="size-4" />
                {answer.isCorrect ? 'Bonne réponse' : 'Marquer correct'}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteAnswer(answer.id)}
                disabled={loading === answer.id}
                aria-label="Supprimer la réponse"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {!relatedAnswers.length && (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
            Aucune réponse pour cette question. Ajoutez-en ci-dessous.
          </p>
        )}
      </div>

      <div className="mt-6 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Ajouter une réponse</p>
        <textarea
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          rows={3}
          placeholder="Texte de la réponse"
          value={answerText}
          onChange={(event) => setAnswerText(event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={answerIsCorrect}
            onChange={(event) => setAnswerIsCorrect(event.target.checked)}
          />
          <span>Bonne réponse ?</span>
        </label>
        <Button onClick={createAnswer} disabled={!answerText.trim() || loading === 'create'}>
          <Plus className="size-4" />
          Ajouter cette réponse
        </Button>
      </div>
    </section>
  )
}
