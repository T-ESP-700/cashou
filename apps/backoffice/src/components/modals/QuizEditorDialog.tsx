import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Save, Trash2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import { backofficeApi } from '@/services/backoffice-api'
import type { Answer, Question, Quiz } from '@/lib/domain'
import { CreateQuestionDialog, type CreateQuestionResult } from './CreateQuestionDialog'

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
  const [isSaved, setIsSaved] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [dateAlreadyTaken, setDateAlreadyTaken] = useState(false)
  const [selectedLinkKey, setSelectedLinkKey] = useState<string | null>(null)
  const [pendingLinks, setPendingLinks] = useState<Array<{ tempId: string; questionId: number }>>([])
  const [pendingQuestionDetails, setPendingQuestionDetails] = useState<
    Record<number, { question: Question; answers: Answer[] }>
  >({})

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

  const existingLinks = useMemo(() => {
    if (!internalQuizId) return []
    return quizQuestions
      .filter((link) => link.quizId === internalQuizId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }, [quizQuestions, internalQuizId])

  const displayLinks = useMemo(() => {
    if (internalQuizId) {
      return existingLinks.map((link) => ({
        key: `existing-${link.id}`,
        questionId: link.questionId,
        position: link.position ?? null,
        source: 'existing' as const,
        quizQuestionId: link.id,
      }))
    }
    return pendingLinks.map((link, index) => ({
      key: `pending-${link.tempId}`,
      questionId: link.questionId,
      position: index + 1,
      source: 'pending' as const,
      tempId: link.tempId,
    }))
  }, [existingLinks, internalQuizId, pendingLinks])

  useEffect(() => {
    if (!displayLinks.length) {
      setSelectedLinkKey(null)
      return
    }
    if (!selectedLinkKey || !displayLinks.some((link) => link.key === selectedLinkKey)) {
      setSelectedLinkKey(displayLinks[0].key)
    }
  }, [displayLinks, selectedLinkKey])

  useEffect(() => {
    if (!open) {
      setPendingLinks([])
      setSelectedLinkKey(null)
      setPendingQuestionDetails({})
      setIsSaved(false)
      setDateAlreadyTaken(false)
    }
  }, [open])

  // Vérifier si la date est déjà prise pour un Daily Quiz
  useEffect(() => {
    if (formValues.type === 'DAILY' && formValues.date && formValues.date.trim()) {
      const checkDate = async () => {
        try {
          const exists = await backofficeApi.quiz.dailyQuizExists(formValues.date)
          if (exists && currentQuiz) {
            // En mode édition, vérifier que ce n'est pas le quiz actuel qui a cette date
            const existingDailyQuiz = quizzes.find(
              (q) => q.type === 'DAILY' && q.date && formatDate(q.date) === formValues.date && q.id !== currentQuiz.id,
            )
            setDateAlreadyTaken(!!existingDailyQuiz)
          } else {
            setDateAlreadyTaken(exists)
          }
        } catch (error) {
          setDateAlreadyTaken(false)
        }
      }
      checkDate()
    } else {
      setDateAlreadyTaken(false)
    }
  }, [formValues.type, formValues.date, currentQuiz, quizzes])

  // Filtrer les niveaux qui ont déjà un MCQ (sauf le niveau actuel en mode édition)
  const availableLevels = useMemo(() => {
    // Récupérer les IDs des niveaux qui ont déjà un MCQ
    const levelsWithMcq = new Set(
      quizzes
        .filter(quiz => quiz.type === 'MCQ' && quiz.levelId)
        .map(quiz => quiz.levelId)
    )

    // Si on est en mode édition et que le quiz actuel a un niveau, le permettre
    if (currentQuiz?.levelId) {
      levelsWithMcq.delete(currentQuiz.levelId)
    }

    // Retourner seulement les niveaux qui n'ont pas de MCQ
    return levels.filter(level => !levelsWithMcq.has(level.id))
  }, [levels, quizzes, currentQuiz])

  const levelOptions = useMemo(
    () =>
      availableLevels.map((level) => ({
        value: String(level.id),
        label: level.title ?? `Niveau ${level.number ?? level.id}`,
      })),
    [availableLevels],
  )

  const handleFieldChange = (field: keyof typeof formValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
  }

  const questionLimit = formValues.type === 'DAILY' ? 3 : 1
  const currentQuestionCount = displayLinks.length
  // Pour DAILY: exactement 3 questions. Pour MCQ: minimum 1 question, pas de maximum
  const hasReachedQuestionLimit = formValues.type === 'DAILY' && currentQuestionCount >= questionLimit
  const quizMustBeComplete = formValues.type === 'DAILY'
    ? currentQuestionCount === questionLimit
    : currentQuestionCount >= 1

  const buildPendingId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  const getValidationError = (): string | null => {
    if (!formValues.title.trim()) {
      return 'Le titre est requis'
    }
    if (formValues.type === 'DAILY') {
      if (!formValues.date || !formValues.date.trim()) {
        return 'La date est obligatoire pour un Daily quiz'
      }
      if (dateAlreadyTaken) {
        return 'Un Daily Quiz existe déjà pour cette date'
      }
      if (!formValues.description || !formValues.description.trim()) {
        return 'La description est obligatoire pour un Daily quiz'
      }
    }
    if (formValues.type === 'MCQ' && (!formValues.levelId || !formValues.levelId.trim())) {
      return 'Le niveau est obligatoire pour un MCQ'
    }
    if (!quizMustBeComplete) {
      return formValues.type === 'DAILY'
        ? 'Un Daily quiz doit contenir exactement 3 questions'
        : 'Un MCQ doit contenir au moins 1 question'
    }
    return null
  }

  const validationMessage = getValidationError()
  const isFormValid = validationMessage === null

  const handleSaveQuiz = async () => {
    const validationError = getValidationError()
    if (validationError) {
      toast.error(validationError)
      return
    }

    // Vérifier si un Daily Quiz existe déjà pour cette date
    if (formValues.type === 'DAILY' && formValues.date) {
      try {
        const exists = await backofficeApi.quiz.dailyQuizExists(formValues.date)
        if (exists) {
          // Si on est en mode édition, vérifier que ce n'est pas le quiz actuel qui a cette date
          if (currentQuiz) {
            const existingDailyQuiz = quizzes.find(
              (q) => q.type === 'DAILY' && q.date && formatDate(q.date) === formValues.date && q.id !== currentQuiz.id,
            )
            if (existingDailyQuiz) {
              toast.error('Un Daily Quiz existe déjà pour cette date')
              return
            }
          } else {
            toast.error('Un Daily Quiz existe déjà pour cette date')
            return
          }
        }
      } catch (error) {
        toast.error('Erreur lors de la vérification de la date')
        return
      }
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
        try {
          await Promise.all(
            pendingLinks.map((link, index) =>
              backofficeApi.quizQuestion.create({
                quizId: created.id,
                questionId: link.questionId,
                position: index + 1,
              }),
            ),
          )
          toast.success('Quiz créé et questions associées')
        } catch {
          toast.error('Quiz créé mais association des questions incomplète')
        } finally {
          setPendingLinks([])
          setInternalQuizId(created.id)
        }
      }
      await refresh()
      setIsSaved(true)
      setTimeout(() => {
        setIsSaved(false)
      }, 2000)
    } catch (error) {
      toast.error((error as Error).message ?? 'Impossible de sauvegarder le quiz')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDetachQuestion = async (link: DisplayLink) => {
    if (link.source === 'pending') {
      setPendingLinks((prev) => prev.filter((item) => item.tempId !== link.tempId))
      if (selectedLinkKey === link.key) {
        setSelectedLinkKey(null)
      }
      toast.success('Question retirée de la sélection')
      return
    }

    try {
      await backofficeApi.quizQuestion.delete(link.quizQuestionId)
      toast.success('Question retirée du quiz')
      if (selectedLinkKey === link.key) {
        setSelectedLinkKey(null)
      }
      await refresh()
    } catch (error) {
      toast.error((error as Error).message ?? 'Impossible de retirer la question')
    }
  }

  const handleQuestionCreated = async ({ question, answers }: CreateQuestionResult) => {
    const questionId = question.id
    setPendingQuestionDetails((prev) => ({
      ...prev,
      [questionId]: {
        question,
        answers,
      },
    }))
    if (hasReachedQuestionLimit) {
      toast.error('Limite de questions atteinte pour ce quiz')
      return
    }

    if (!internalQuizId) {
      const tempId = buildPendingId()
      setPendingLinks((prev) => [...prev, { tempId, questionId }])
      setSelectedLinkKey(`pending-${tempId}`)
      toast.success('Question créée - elle sera associée lors de la sauvegarde')
      await refresh()
      return
    }

    try {
      const createdLink = await backofficeApi.quizQuestion.create({
        quizId: internalQuizId,
        questionId,
        position: existingLinks.length + 1,
      })
      toast.success('Question créée et associée')
      setSelectedLinkKey(`existing-${createdLink.id}`)
      await refresh()
    } catch (error) {
      toast.error((error as Error).message ?? 'Question créée mais association impossible')
    }
  }

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
            setSelectedLinkKey(null)
          }
          onOpenChange(next)
        }}
      >
        <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col gap-3 overflow-y-auto">
          <DialogHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <DialogTitle>
              {currentQuiz
                ? `Éditer ${currentQuiz.title ?? `Quiz #${currentQuiz.id}`}`
                : 'Nouveau quiz'}
            </DialogTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              {!isFormValid && validationMessage && (
                <span className="text-xs font-medium text-red-600 sm:text-right">{validationMessage}</span>
              )}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveQuiz}
                  disabled={isSaving || !isFormValid}
                  size="icon"
                  variant={isSaved ? 'default' : 'outline'}
                  className={isSaved ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                  aria-label="Enregistrer le quiz"
                >
                  {isSaved ? (
                    <Check className="text-white" />
                  ) : (
                    <Save className={isSaving ? 'animate-pulse' : ''} />
                  )}
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
              {formValues.type === 'DAILY' && (
                <Field label="Date" helper="Obligatoire pour les Daily" required>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    value={formValues.date}
                    onChange={(event) => handleFieldChange('date', event.target.value)}
                  />
                </Field>
              )}
              {formValues.type === 'MCQ' && (
                <Field label="Niveau (MCQ)" required>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    value={formValues.levelId}
                    onChange={(event) => handleFieldChange('levelId', event.target.value)}
                  >
                    <option value="">—</option>
                    {levelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <Field label="Description" required={formValues.type === 'DAILY'}>
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
                <Button onClick={() => setShowQuestionDialog(true)} disabled={hasReachedQuestionLimit}>
                  Ajouter une question
                </Button>
              </div>
            </header>

            {!internalQuizId && (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-600">
                Ce quiz n’est pas encore sauvegardé. Les questions ajoutées seront liées automatiquement
                lors de l’enregistrement.
              </p>
            )}

            {displayLinks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-600">
                Aucune question associée pour l’instant.
              </p>
            ) : (
              <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[1fr_1.25fr]">
                <div className="space-y-2 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/80 p-3 min-h-0">
                  {displayLinks.map((link) => {
                    const question = questions.find((item) => item.id === link.questionId)
                    if (!question) return null
                    const active = selectedLinkKey === link.key
                    return (
                      <button
                        key={link.key}
                        type="button"
                        className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${active
                          ? 'border-slate-900 bg-white text-slate-900 shadow-sm'
                          : 'border-transparent bg-transparent text-slate-600 hover:bg-white/70'
                          }`}
                        onClick={() => setSelectedLinkKey(link.key)}
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
                <div className="overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 min-h-0">
                  <QuestionDetail
                    linkKey={selectedLinkKey}
                    links={displayLinks}
                    questions={questions}
                    answers={answers}
                    pendingQuestionDetails={pendingQuestionDetails}
                    onDetach={handleDetachQuestion}
                    refresh={refresh}
                  />
                </div>
              </div>
            )}
          </section>
        </DialogContent>
      </Dialog>

      <CreateQuestionDialog
        open={showQuestionDialog}
        onOpenChange={setShowQuestionDialog}
        onSuccess={handleQuestionCreated}
      />
    </>
  )
}

type DisplayLink =
  | {
    key: string
    source: 'existing'
    questionId: number
    position?: number | null
    quizQuestionId: number
  }
  | {
    key: string
    source: 'pending'
    questionId: number
    position?: number | null
    tempId: string
  }

function QuestionDetail({
  linkKey,
  links,
  questions,
  answers,
  pendingQuestionDetails,
  onDetach,
  refresh,
}: {
  linkKey: string | null
  links: DisplayLink[]
  questions: Question[]
  answers: Answer[]
  pendingQuestionDetails: Record<number, { question: Question; answers: Answer[] }>
  onDetach: (link: DisplayLink) => void
  refresh: () => Promise<void>
}) {
  if (!linkKey) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Sélectionnez une question pour l’éditer.
      </div>
    )
  }
  const link = links.find((item) => item.key === linkKey)
  const override = link ? pendingQuestionDetails[link.questionId] : undefined
  const question = override?.question ?? questions.find((item) => item.id === link?.questionId)
  if (!link || !question) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Impossible de charger cette question.
      </div>
    )
  }
  const relatedAnswers = override?.answers ?? answers.filter((answer) => answer.questionId === question.id)
  return (
    <div className="space-y-4">
      <p className="text-xs uppercase text-slate-500">
        Question {typeof link.position === 'number' ? `#${link.position}` : ''}
      </p>
      <QuestionEditor question={question} answers={relatedAnswers} link={link} onDetach={onDetach} refresh={refresh} />
    </div>
  )
}

function QuestionEditor({
  question,
  answers,
  link,
  onDetach,
  refresh,
}: {
  question: Question
  answers: Answer[]
  link: DisplayLink
  onDetach: (link: DisplayLink) => void
  refresh: () => Promise<void>
}) {
  const [text, setText] = useState(question.text ?? '')
  const [explanation, setExplanation] = useState(question.explanation ?? '')
  const [questionSaveState, setQuestionSaveState] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle')
  const questionSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedQuestion = useRef(question.text ?? '')
  const lastSavedExplanation = useRef(question.explanation ?? '')
  const [correctAnswerId, setCorrectAnswerId] = useState<number | null>(
    () => answers.find((answer) => answer.isCorrect)?.id ?? null,
  )
  const [correctSaveState, setCorrectSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const persistQuestion = useCallback(
    async (nextText: string) => {
      setQuestionSaveState('saving')
      try {
        const normalizedText = ensureQuestionMark(nextText)
        await backofficeApi.question.update({ id: question.id, data: { text: normalizedText } })
        lastSavedQuestion.current = normalizedText
        setText(normalizedText)
        setQuestionSaveState('saved')
        await refresh()
      } catch (error) {
        setQuestionSaveState('error')
        toast.error((error as Error).message ?? 'Impossible de mettre à jour la question')
      }
    },
    [question.id, refresh],
  )

  const persistExplanation = useCallback(
    async (nextExplanation: string) => {
      setQuestionSaveState('saving')
      try {
        await backofficeApi.question.update({ id: question.id, data: { explanation: nextExplanation } })
        lastSavedExplanation.current = nextExplanation
        setExplanation(nextExplanation)
        setQuestionSaveState('saved')
        await refresh()
      } catch (error) {
        setQuestionSaveState('error')
        toast.error((error as Error).message ?? 'Impossible de mettre à jour l\'explication')
      }
    },
    [question.id, refresh],
  )

  useEffect(() => {
    setText(question.text ?? '')
    setExplanation(question.explanation ?? '')
    lastSavedQuestion.current = question.text ?? ''
    lastSavedExplanation.current = question.explanation ?? ''
    setQuestionSaveState('idle')
  }, [question.id, question.text, question.explanation])

  useEffect(() => {
    setCorrectAnswerId(answers.find((answer) => answer.isCorrect)?.id ?? null)
  }, [answers])

  useEffect(() => {
    if (text === lastSavedQuestion.current && explanation === lastSavedExplanation.current) {
      if (questionSaveTimeout.current) {
        clearTimeout(questionSaveTimeout.current)
        questionSaveTimeout.current = null
      }
      if (questionSaveState !== 'saved') {
        setQuestionSaveState('idle')
      }
      return
    }
    setQuestionSaveState('pending')
    if (questionSaveTimeout.current) {
      clearTimeout(questionSaveTimeout.current)
    }
    questionSaveTimeout.current = setTimeout(() => {
      if (text !== lastSavedQuestion.current) {
        persistQuestion(text)
      }
      if (explanation !== lastSavedExplanation.current) {
        persistExplanation(explanation)
      }
    }, 600)
    return () => {
      if (questionSaveTimeout.current) {
        clearTimeout(questionSaveTimeout.current)
        questionSaveTimeout.current = null
      }
    }
  }, [text, explanation, persistQuestion, persistExplanation, questionSaveState])

  const handleSelectCorrect = useCallback(
    async (answerId: number) => {
      if (correctAnswerId === answerId) return
      const previousId = correctAnswerId ?? answers.find((answer) => answer.isCorrect)?.id ?? null
      setCorrectAnswerId(answerId)
      setCorrectSaveState('saving')
      try {
        const updates: Array<Promise<unknown>> = []
        if (previousId && previousId !== answerId) {
          updates.push(backofficeApi.answer.update({ id: previousId, data: { isCorrect: false } }))
        }
        updates.push(backofficeApi.answer.update({ id: answerId, data: { isCorrect: true } }))
        await Promise.all(updates)
        setCorrectSaveState('saved')
        await refresh()
      } catch (error) {
        setCorrectSaveState('error')
        toast.error((error as Error).message ?? 'Impossible de mettre à jour la réponse correcte')
      }
    },
    [answers, correctAnswerId, refresh],
  )

  return (
    <>
      <textarea
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>
          {questionSaveState === 'saving'
            ? 'Enregistrement...'
            : questionSaveState === 'pending'
              ? 'Modifications en attente'
              : questionSaveState === 'error'
                ? 'Erreur lors de la sauvegarde'
                : questionSaveState === 'saved'
                  ? 'Enregistré'
                  : ''}
        </span>
        <Button size="icon" variant="ghost" onClick={() => onDetach(link)} aria-label="Retirer la question du quiz">
          <Trash2 />
        </Button>
      </div>
      <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <p className="font-semibold uppercase">Réponses</p>
          <span>
            {correctSaveState === 'saving'
              ? 'Mise à jour de la réponse correcte...'
              : correctSaveState === 'error'
                ? 'Erreur lors de la mise à jour'
                : correctSaveState === 'saved'
                  ? 'Réponse correcte mise à jour'
                  : ''}
          </span>
        </div>
        <div className="space-y-2">
          {answers.map((answer) => {
            return (
              <AnswerEditor
                key={answer.id}
                answer={answer}
                isCorrect={answer.id === correctAnswerId}
                onSelectCorrect={handleSelectCorrect}
                refresh={refresh}
              />
            )
          })}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Explication</p>
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          rows={2}
          placeholder="Explication (optionnel)"
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
        />
      </div>
    </>
  )
}

function AnswerEditor({
  answer,
  isCorrect,
  refresh,
  onSelectCorrect,
}: {
  answer: Answer
  isCorrect: boolean
  refresh: () => Promise<void>
  onSelectCorrect: (answerId: number) => void
}) {
  const [text, setText] = useState(answer.text ?? '')
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persistAnswer = useCallback(
    async (nextText: string) => {
      setSaveState('saving')
      try {
        await backofficeApi.answer.update({ id: answer.id, data: { text: nextText } })
        setSaveState('saved')
        await refresh()
      } catch (error) {
        setSaveState('error')
        toast.error((error as Error).message ?? 'Impossible de mettre à jour la réponse')
      }
    },
    [answer.id, refresh],
  )

  useEffect(() => {
    setText(answer.text ?? '')
    setSaveState('idle')
  }, [answer.id, answer.text])

  useEffect(() => {
    const originalText = answer.text ?? ''
    const dirty = text !== originalText
    if (!dirty) {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current)
        saveTimeout.current = null
      }
      return
    }
    setSaveState('pending')
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current)
    }
    saveTimeout.current = setTimeout(() => {
      persistAnswer(text)
    }, 600)
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current)
        saveTimeout.current = null
      }
    }
  }, [text, answer.text, persistAnswer, answer.id])

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm md:flex-row md:items-center">
      <input
        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input
          type="radio"
          name={`correct-${answer.questionId}`}
          checked={isCorrect}
          onChange={() => onSelectCorrect(answer.id)}
        />
        Correcte ?
      </label>
      <span className="text-xs text-slate-500">
        {saveState === 'saving'
          ? 'Enregistrement...'
          : saveState === 'pending'
            ? 'Modifications en attente'
            : saveState === 'error'
              ? 'Erreur lors de la sauvegarde'
              : saveState === 'saved'
                ? 'Enregistré'
                : ''}
      </span>
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

function ensureQuestionMark(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.endsWith('?') ? trimmed : `${trimmed} ?`
}
