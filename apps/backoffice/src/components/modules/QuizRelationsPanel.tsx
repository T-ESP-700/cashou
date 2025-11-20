import { useState } from 'react'
import { ListPlus, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import { backofficeApi } from '@/services/backoffice-api'

export function QuizRelationsPanel() {
  const module = useBackofficeStore((state) => state.module)
  const selectedRecordId = useBackofficeStore((state) => state.selectedRecordId)
  const quizzes = useBackofficeStore((state) => state.quizzes)
  const questions = useBackofficeStore((state) => state.questions)
  const quizQuestions = useBackofficeStore((state) => state.quizQuestions)
  const refresh = useBackofficeStore((state) => state.refresh)
  const [questionChoice, setQuestionChoice] = useState<number | ''>('')
  const [orderValue, setOrderValue] = useState<number | ''>('')
  const [loading, setLoading] = useState<boolean>(false)

  if (module !== 'quizzes') return null

  const parsedId =
    typeof selectedRecordId === 'number' ? selectedRecordId : Number(selectedRecordId)
  const activeQuizId =
    Number.isFinite(parsedId) && parsedId > 0 ? parsedId : quizzes[0]?.id ?? null

  if (!activeQuizId) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6">
        <p className="text-sm text-slate-500">Ajoutez d’abord un quiz pour gérer son questionnaire.</p>
      </section>
    )
  }

  const activeQuiz = quizzes.find((quiz) => quiz.id === activeQuizId)
  const attached = quizQuestions.filter((link) => link.quizId === activeQuizId)
  const available = questions.filter(
    (question) => !attached.some((link) => link.questionId === question.id),
  )

  const attachQuestion = async () => {
    if (!questionChoice || !activeQuizId) return
    setLoading(true)
    try {
      await backofficeApi.quizQuestion.create({
        quizId: activeQuizId,
        questionId: questionChoice,
        order: orderValue || undefined,
      })
      await refresh()
      setQuestionChoice('')
      setOrderValue('')
    } catch (error) {
      alert((error as Error).message ?? 'Impossible de lier la question')
    } finally {
      setLoading(false)
    }
  }

  const detachQuestion = async (linkId: number) => {
    setLoading(true)
    try {
      await backofficeApi.quizQuestion.delete(linkId)
      await refresh()
    } catch (error) {
      alert((error as Error).message ?? 'Impossible de supprimer ce lien')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Quiz builder</p>
          <h3 className="text-lg font-semibold text-slate-900">
            {activeQuiz?.title ?? `Quiz #${activeQuizId}`}
          </h3>
        </div>
        <span className="text-xs text-slate-500">{attached.length} questions liées</span>
      </header>

      <div className="mt-4 space-y-3">
        {attached
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((link) => {
            const question = questions.find((item) => item.id === link.questionId)
            return (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {link.order ? `${link.order}. ` : ''}{question?.text ?? `Question #${link.questionId}`}
                  </p>
                  <p className="text-xs text-slate-500">{question?.difficulty ?? '—'}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => detachQuestion(link.id)}
                  disabled={loading}
                  aria-label="Retirer la question"
                >
                  <Unlink className="size-4" />
                </Button>
              </div>
            )
          })}
        {!attached.length && (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
            Aucune question associée à ce quiz.
          </p>
        )}
      </div>

      {available.length > 0 && (
        <div className="mt-6 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Ajouter une question</p>
          <div className="flex flex-col gap-2 md:flex-row">
            <select
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={questionChoice}
              onChange={(event) =>
                setQuestionChoice(event.target.value === '' ? '' : Number(event.target.value))
              }
            >
              <option value="">Choisir une question…</option>
              {available.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.text?.slice(0, 60) ?? `Question #${question.id}`}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Ordre"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={orderValue}
              onChange={(event) =>
                setOrderValue(event.target.value === '' ? '' : Number(event.target.value))
              }
            />
            <Button onClick={attachQuestion} disabled={!questionChoice || loading}>
              <ListPlus className="size-4" />
              Ajouter
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
