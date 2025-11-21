import { useEffect, useMemo, useState } from 'react'
import { Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import { backofficeApi } from '@/services/backoffice-api'
import type { Answer, Question, Quiz } from '@/lib/domain'
import { CreateQuestionDialog } from './CreateQuestionDialog'

interface QuizEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quizId: number | null
}

export function QuizEditorDialog({ open, onOpenChange, quizId }: QuizEditorDialogProps) {
  const refresh = useBackofficeStore((state) => state.refresh)
  const quizzes = useBackofficeStore((state) => state.quizzes)
  const quizQuestions = useBackofficeStore((state) => state.quizQuestions)
  const questions = useBackofficeStore((state) => state.questions)
  const answers = useBackofficeStore((state) => state.answers)
  const levels = useBackofficeStore((state) => state.levels)

  const [internalQuizId, setInternalQuizId] = useState<number | null>(quizId)
  const [formValues, setFormValues] = useState({
    title: '',
    type: 'DAILY',
    description: '',
    date: '',
    levelId: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(null)

  const currentQuiz: Quiz | null = useMemo(
    () => (internalQuizId ? quizzes.find((quiz) => quiz.id === internalQuizId) ?? null : null),
    [internalQuizId, quizzes],
  )

  useEffect(() => {
    setInternalQuizId(quizId)
  }, [quizId, open])

  useEffect(() => {
    if (currentQuiz) {
      setFormValues({
        title: currentQuiz.title ?? '',
        type: currentQuiz.type ?? 'DAILY',
        description: currentQuiz.description ?? '',
        date: formatDate(currentQuiz.date),
        levelId: currentQuiz.levelId ? String(currentQuiz.levelId) : '',
      })
    } else {
      setFormValues({
        title: '',
        type: 'DAILY',
        description: '',
        date: '',
        levelId: '',
      })
    }
  }, [currentQuiz, open])

  const relatedLinks = useMemo(() => {
    if (!internalQuizId) return []
    return quizQuestions
      .filter((link) => link.quizId === internalQuizId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }, [quizQuestions, internalQuizId])

  useEffect(() => {
    if (!relatedLinks.length) {
      setSelectedLinkId(null)
      return
    }
    if (!selectedLinkId || !relatedLinks.some((link) => link.id === selectedLinkId)) {
      setSelectedLinkId(relatedLinks[0].id)
    }
  }, [relatedLinks, selectedLinkId])

  const levelOptions = useMemo(
    () =>
      levels.map((level) => ({
        value: String(level.id),
        label: level.title ?? `Niveau ${level.number ?? level.id}`,
      })),
    [levels],
  )

  const handleFieldChange = (field: keyof typeof formValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveQuiz = async () => {
    if (!formValues.title.trim()) {
      toast.error('Le titre est requis')
      return
    }
    const payload = {
      title: formValues.title.trim(),
      type: formValues.type,
      description: formValues.description || null,
      date: formValues.date || undefined,
      levelId: formValues.levelId ? Number(formValues.levelId) : undefined,
    }
    setIsSaving(true)
    try {
      if (currentQuiz) {
        await backofficeApi.quiz.update({ id: currentQuiz.id, data: payload })
        toast.success('Quiz mis à jour')
      } else {
        const created = await backofficeApi.quiz.create(payload)
        setInternalQuizId(created.id)
        toast.success('Quiz créé - vous pouvez ajouter des questions')
      }
      await refresh()
    } catch (error) {
      toast.error((error as Error).message ?? 'Impossible de sauvegarder le quiz')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDetachQuestion = async (linkId: number) => {
    try {
      await backofficeApi.quizQuestion.delete(linkId)
      toast.success('Question retirée du quiz')
      if (selectedLinkId === linkId) {
        setSelectedLinkId(null)
      }
      await refresh()
    } catch (error) {
      toast.error((error as Error).message ?? 'Impossible de retirer la question')
    }
  }

  const handleQuestionCreated = async (questionId: number) => {
    if (!internalQuizId) return
    if (hasReachedQuestionLimit) {
      toast.error('Limite de questions atteinte pour ce quiz')
      return
    }
    try {
      const createdLink = await backofficeApi.quizQuestion.create({
        quizId: internalQuizId,
        questionId,
        position: relatedLinks.length + 1,
      })
      toast.success('Question créée et associée')
      setSelectedLinkId(createdLink.id)
      await refresh()
    } catch (error) {
      toast.error((error as Error).message ?? 'Question créée mais association impossible')
    }
  }

  const questionLimit = formValues.type === 'DAILY' ? 3 : 1
  const currentQuestionCount = relatedLinks.length
  const hasReachedQuestionLimit = currentQuestionCount >= questionLimit
  const disableQuestionManagement = !internalQuizId

  const handleDeleteQuiz = async () => {
    if (!currentQuiz) return
    if (!window.confirm('Supprimer définitivement ce quiz ?')) return
    setIsDeleting(true)
    try {
      await backofficeApi.quiz.delete(currentQuiz.id)
      toast.success('Quiz supprimé')
      await refresh()
      setInternalQuizId(null)
      onOpenChange(false)
    } catch (error) {
      toast.error((error as Error).message ?? 'Impossible de supprimer ce quiz')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setSelectedLinkId(null)
          }
          onOpenChange(next)
        }}
      >
        <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col gap-3 overflow-hidden">
          <DialogHeader className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <DialogTitle>
                {currentQuiz
                  ? `Éditer ${currentQuiz.title ?? `Quiz #${currentQuiz.id}`}`
                  : 'Nouveau quiz'}
              </DialogTitle>
              <Button
                onClick={handleSaveQuiz}
                disabled={isSaving}
                size="icon"
                variant="outline"
                aria-label="Enregistrer le quiz"
              >
                <Save className={isSaving ? 'animate-pulse' : ''} />
              </Button>
              {currentQuiz && (
                <Button
                  onClick={handleDeleteQuiz}
                  disabled={isDeleting}
                  size="icon"
                  variant="ghost"
                  aria-label="Supprimer le quiz"
                >
                  <Trash2 className={isDeleting ? 'animate-pulse text-red-600' : 'text-red-500'} />
                </Button>
              )}
            </div>
          </DialogHeader>

          <section className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Titre" required>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  value={formValues.title}
                  onChange={(event) => handleFieldChange('title', event.target.value)}
                />
              </Field>
              <Field label="Type" required>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  value={formValues.type}
                  onChange={(event) => handleFieldChange('type', event.target.value)}
                >
                  <option value="DAILY">Daily</option>
                  <option value="MCQ">MCQ</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Date" helper="Obligatoire pour les Daily">
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  value={formValues.date}
                  onChange={(event) => handleFieldChange('date', event.target.value)}
                  disabled={formValues.type !== 'DAILY'}
                />
              </Field>
              <Field label="Niveau (MCQ)">
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  value={formValues.levelId}
                  onChange={(event) => handleFieldChange('levelId', event.target.value)}
                  disabled={formValues.type !== 'MCQ'}
                >
                  <option value="">—</option>
                  {levelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Description">
              <textarea
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                value={formValues.description}
                onChange={(event) => handleFieldChange('description', event.target.value)}
              />
            </Field>

            <div className="h-4" />
          </section>

          <section className="flex min-h-[360px] flex-1 flex-col gap-4 rounded-3xl border border-slate-200 p-4">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Questions</p>
                <p className="text-xs text-slate-500">
                  Sélectionnez une question pour l’éditer.
                  {hasReachedQuestionLimit && (
                    <span className="ml-2 text-amber-600">
                      Limite atteinte ({questionLimit})
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setShowQuestionDialog(true)}
                  disabled={disableQuestionManagement || hasReachedQuestionLimit}
                >
                  Ajouter une question
                </Button>
              </div>
            </header>

            {disableQuestionManagement ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-600">
                Sauvegardez d’abord le quiz pour y associer des questions.
              </p>
            ) : relatedLinks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-600">
                Aucune question associée pour l’instant.
              </p>
            ) : (
              <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[1fr_1.25fr]">
                <div className="space-y-2 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                  {relatedLinks.map((link) => {
                    const question = questions.find((item) => item.id === link.questionId)
                    if (!question) return null
                    const active = selectedLinkId === link.id
                    return (
                      <button
                        key={link.id}
                        type="button"
                        className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                          active
                            ? 'border-slate-900 bg-white text-slate-900 shadow-sm'
                            : 'border-transparent bg-transparent text-slate-600 hover:bg-white/70'
                        }`}
                        onClick={() => setSelectedLinkId(link.id)}
                      >
                        <p className="text-xs uppercase text-slate-500">
                          Question {typeof link.position === 'number' ? `#${link.position}` : ''}
                        </p>
                        <p className="font-medium text-slate-900">
                          {question.text?.slice(0, 80) ?? `Question #${question.id}`}
                        </p>
                      </button>
                    )
                  })}
                </div>
                <div className="overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4">
                  <QuestionDetail
                    linkId={selectedLinkId}
                    relatedLinks={relatedLinks}
                    questions={questions}
                    answers={answers}
                    onDetach={handleDetachQuestion}
                    refresh={refresh}
                  />
                </div>
              </div>
            )}
          </section>
        </DialogContent>
      </Dialog>

      {internalQuizId && (
        <CreateQuestionDialog
          open={showQuestionDialog}
          onOpenChange={setShowQuestionDialog}
          onSuccess={handleQuestionCreated}
        />
      )}
    </>
  )
}

function QuestionDetail({
  linkId,
  relatedLinks,
  questions,
  answers,
  onDetach,
  refresh,
}: {
  linkId: number | null
  relatedLinks: Array<{ id: number; questionId: number; position?: number | null }>
  questions: Question[]
  answers: Answer[]
  onDetach: (linkId: number) => void
  refresh: () => Promise<void>
}) {
  if (!linkId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Sélectionnez une question pour l’éditer.
      </div>
    )
  }
  const link = relatedLinks.find((item) => item.id === linkId)
  const question = questions.find((item) => item.id === link?.questionId)
  if (!link || !question) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Impossible de charger cette question.
      </div>
    )
  }
  const relatedAnswers = answers.filter((answer) => answer.questionId === question.id)
  return (
    <div className="space-y-4">
      <p className="text-xs uppercase text-slate-500">
        Question {typeof link.position === 'number' ? `#${link.position}` : ''}
      </p>
      <QuestionEditor
        question={question}
        answers={relatedAnswers}
        linkId={linkId}
        onDetach={onDetach}
        refresh={refresh}
      />
    </div>
  )
}

function QuestionEditor({
  question,
  answers,
  linkId,
  onDetach,
  refresh,
}: {
  question: Question
  answers: Answer[]
  linkId: number
  onDetach: (linkId: number) => void
  refresh: () => Promise<void>
}) {
  const [text, setText] = useState(question.text ?? '')
  const [isSavingQuestion, setIsSavingQuestion] = useState(false)
  const [isAddingAnswer, setIsAddingAnswer] = useState(false)

  useEffect(() => {
    setText(question.text ?? '')
  }, [question.id, question.text])

  const saveQuestion = async () => {
    setIsSavingQuestion(true)
    try {
      await backofficeApi.question.update({ id: question.id, data: { text } })
      toast.success('Question enregistrée')
      await refresh()
    } catch (error) {
      toast.error((error as Error).message ?? 'Impossible de mettre à jour la question')
    } finally {
      setIsSavingQuestion(false)
    }
  }

  const addAnswer = async () => {
    setIsAddingAnswer(true)
    try {
      await backofficeApi.answer.create({
        questionId: question.id,
        text: 'Nouvelle réponse',
        isCorrect: false,
      })
      toast.success('Réponse ajoutée')
      await refresh()
    } catch (error) {
      toast.error((error as Error).message ?? 'Impossible d’ajouter la réponse')
    } finally {
      setIsAddingAnswer(false)
    }
  }

  return (
    <>
      <textarea
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={saveQuestion}
          disabled={isSavingQuestion}
          aria-label="Sauvegarder la question"
        >
          <Save className={isSavingQuestion ? 'animate-pulse' : ''} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDetach(linkId)}
          aria-label="Retirer la question du quiz"
        >
          <Trash2 />
        </Button>
      </div>
      <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase text-slate-500">Réponses</p>
          <Button
            size="sm"
            variant="outline"
            onClick={addAnswer}
            disabled={isAddingAnswer || answers.length >= 4}
          >
            {isAddingAnswer ? 'Ajout...' : 'Ajouter'}
          </Button>
        </div>
        {answers.length >= 4 && (
          <p className="text-xs text-slate-500">Maximum 4 réponses par question.</p>
        )}
        <div className="space-y-2">
          {answers.map((answer) => {
            const otherCorrectExists = answers.some(
              (candidate) => candidate.id !== answer.id && candidate.isCorrect,
            )
            return (
              <AnswerEditor
                key={answer.id}
                answer={answer}
                refresh={refresh}
                otherCorrectExists={otherCorrectExists}
              />
            )
          })}
        </div>
      </div>
    </>
  )
}

function AnswerEditor({
  answer,
  refresh,
  otherCorrectExists,
}: {
  answer: Answer
  refresh: () => Promise<void>
  otherCorrectExists: boolean
}) {
  const [text, setText] = useState(answer.text ?? '')
  const [isCorrect, setIsCorrect] = useState(Boolean(answer.isCorrect))
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setText(answer.text ?? '')
    setIsCorrect(Boolean(answer.isCorrect))
  }, [answer.id, answer.text, answer.isCorrect])

  const save = async () => {
    setIsSaving(true)
    try {
      if (isCorrect && otherCorrectExists && !answer.isCorrect) {
        toast.error('Retirez la bonne réponse actuelle avant de marquer celle-ci correcte.')
        setIsSaving(false)
        return
      }
      await backofficeApi.answer.update({ id: answer.id, data: { text, isCorrect } })
      toast.success('Réponse mise à jour')
      await refresh()
    } catch (error) {
      toast.error((error as Error).message ?? 'Impossible de mettre à jour la réponse')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm md:flex-row md:items-center">
      <input
        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={isCorrect}
          onChange={(event) => {
            if (event.target.checked && otherCorrectExists) {
              toast.error('Une autre réponse est déjà marquée correcte.')
              return
            }
            setIsCorrect(event.target.checked)
          }}
          disabled={otherCorrectExists && !isCorrect}
        />
        Correcte ?
      </label>
      <Button
        size="icon"
        variant="outline"
        onClick={save}
        disabled={isSaving}
        aria-label="Sauvegarder la réponse"
      >
        <Save className={isSaving ? 'animate-pulse' : ''} />
      </Button>
    </div>
  )
}

function Field({
  label,
  children,
  required,
  helper,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  helper?: string
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      <span>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
      {helper && <p className="text-xs text-slate-500">{helper}</p>}
    </label>
  )
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return ''
  const iso = typeof value === 'string' ? value : value.toISOString()
  return iso.slice(0, 10)
}
