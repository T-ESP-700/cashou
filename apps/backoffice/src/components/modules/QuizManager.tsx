import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import type { Quiz } from '@/lib/domain'
import { QuizEditorDialog } from '@/components/modals/QuizEditorDialog.tsx'
import { backofficeApi } from '@/services/backoffice-api'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

export function QuizManager() {
  const quizzes = useBackofficeStore((state) => state.quizzes)
  const quizQuestions = useBackofficeStore((state) => state.quizQuestions)
  const quizTypeFilter = useBackofficeStore((state) => state.quizTypeFilter)
  const [editorOpen, setEditorOpen] = useState(false)
  const [activeQuizId, setActiveQuizId] = useState<number | null>(null)

  const rows = useMemo(() => {
    const filtered =
      quizTypeFilter === 'ALL'
        ? quizzes
        : quizzes.filter((quiz) => quiz.type === quizTypeFilter)
    return filtered
      .slice()
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      .map((quiz) => ({
        quiz,
        questionCount: quizQuestions.filter((link) => link.quizId === quiz.id).length,
      }))
  }, [quizzes, quizQuestions, quizTypeFilter])

  const openEditor = (quiz: Quiz | null) => {
    setActiveQuizId(quiz?.id ?? null)
    setEditorOpen(true)
  }

  const handleDeleteQuiz = async (quiz: Quiz) => {
    if (!quiz.id) return
    if (!window.confirm(`Supprimer définitivement "${quiz.title ?? `Quiz #${quiz.id}`}" ?`)) {
      return
    }
    try {
      await backofficeApi.quiz.delete(quiz.id)
      toast.success('Quiz supprimé')
      await useBackofficeStore.getState().refresh()
    } catch (error) {
      toast.error((error as Error).message ?? 'Impossible de supprimer ce quiz')
    }
  }

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Banque des quizz</p>
            <p className="text-xs text-slate-500">
              Double-cliquez sur une ligne pour ouvrir l’éditeur dédié.
            </p>
          </div>
          <Button onClick={() => openEditor(null)}>Nouveau quiz</Button>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-3 font-medium">Titre</th>
                <th className="px-4 py-3 font-medium" style={{ width: '110px' }}>
                  Type
                </th>
                <th className="px-4 py-3 font-medium" style={{ width: '140px' }}>
                  Date
                </th>
                <th className="px-4 py-3 font-medium" style={{ width: '140px' }}>
                  Niveau
                </th>
                <th className="px-4 py-3 font-medium" style={{ width: '110px' }}>
                  Questions
                </th>
                <th className="px-4 py-3 font-medium text-right" style={{ width: '64px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ quiz, questionCount }) => (
                <tr
                  key={quiz.id}
                  className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70 cursor-pointer"
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest('button')) return
                    openEditor(quiz)
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openEditor(quiz)
                    }
                  }}
                >
                  <td className="px-4 py-3 font-medium">{quiz.title ?? `Quiz #${quiz.id}`}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{quiz.type}</td>
                  <td className="px-4 py-3">{formatDate(quiz.date)}</td>
                  <td className="px-4 py-3">{quiz.levelId ?? '—'}</td>
                  <td className="px-4 py-3">{questionCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDeleteQuiz(quiz)}
                      aria-label={`Supprimer ${quiz.title ?? `Quiz #${quiz.id}`}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                    Aucun quiz ne correspond au filtre choisi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <QuizEditorDialog
        open={editorOpen}
        onOpenChange={(next) => {
          if (!next) setActiveQuizId(null)
          setEditorOpen(next)
        }}
        quizId={activeQuizId}
      />
    </>
  )
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  if (value instanceof Date) {
    return value.toLocaleDateString()
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString()
}
