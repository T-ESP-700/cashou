import { Button } from '@/components/ui/button'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import type { QuizType } from '@/lib/domain'
import { QuizManager } from './QuizManager'

const QUIZ_TYPE_FILTERS: Array<{ label: string; value: QuizType | 'ALL' }> = [
  { label: 'Tous', value: 'ALL' },
  { label: 'Daily', value: 'DAILY' },
  { label: 'MCQ', value: 'MCQ' },
]

export function QuizzesModule() {
  const quizTypeFilter = useBackofficeStore((state) => state.quizTypeFilter)
  const setQuizTypeFilter = useBackofficeStore((state) => state.setQuizTypeFilter)

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Filtrer les quizz</p>
            <h3 className="text-sm font-semibold text-slate-900">Type de questionnaire</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUIZ_TYPE_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                size="sm"
                variant={quizTypeFilter === filter.value ? 'default' : 'outline'}
                onClick={() => setQuizTypeFilter(filter.value)}
                aria-pressed={quizTypeFilter === filter.value}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      </section>
      <QuizManager />
    </div>
  )
}
