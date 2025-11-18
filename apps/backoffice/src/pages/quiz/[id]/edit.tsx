import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/FormField';
import { Select } from '@/components/forms/Select';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { RelationSelect } from '@/components/forms/RelationSelect';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { formatSelectOptions } from '@/hooks/use-crud';
import { CreateLevelDialog } from '@/components/modals/CreateLevelDialog';
import { CreateQuestionDialog } from '@/components/modals/CreateQuestionDialog';

interface QuizFormData {
  type: string;
  title: string;
  date: string;
  levelId: number | null;
  description: string;
}

export default function EditQuizPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<(string | number)[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [initialQuestionIds, setInitialQuestionIds] = useState<number[]>([]);

  // Dialog states
  const [showLevelDialog, setShowLevelDialog] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<QuizFormData>();

  // Fetch quiz data
  const { data: quiz, isLoading } = trpc.quiz.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  // Fetch quiz questions
  const { data: quizQuestions } = trpc.quizQuestion.getByQuiz.useQuery(
    { quizId: Number(id) },
    { enabled: !!id }
  );

  // Fetch levels and questions for selection
  const { data: levels } = trpc.level.getAll.useQuery();
  const { data: questions } = trpc.question.getAll.useQuery();

  // Update mutation
  const updateMutation = trpc.quiz.update.useMutation({
    onSuccess: () => {
      toast.success('Quiz updated successfully');
      utils.quiz.getAll.invalidate();
      utils.quiz.getById.invalidate({ id: Number(id) });
      navigate(-1);
    },
    onError: (error) => {
      toast.error(`Failed to update quiz: ${error.message}`);
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (quiz) {
      reset({
        type: quiz.type || 'MCQ',
        title: quiz.title || '',
        date: quiz.date ? new Date(quiz.date).toISOString().split('T')[0] : '',
        levelId: quiz.levelId,
        description: quiz.description || '',
      });
      setSelectedLevelId(quiz.levelId || null);
    }
  }, [quiz, reset]);

  // Populate question selections when quiz questions load
  useEffect(() => {
    if (quizQuestions) {
      const sortedQuestions = [...quizQuestions].sort(
        (a, b) => (a.position || 0) - (b.position || 0)
      );
      const questionIds = sortedQuestions
        .map((qq) => qq.questionId)
        .filter((id): id is number => id !== null);
      setSelectedQuestionIds(questionIds);
      setInitialQuestionIds(questionIds);
    }
  }, [quizQuestions]);

  const onSubmit = async (data: QuizFormData) => {
    try {
      // Update the quiz
      await updateMutation.mutateAsync({
        id: Number(id),
        data: {
          type: data.type as 'DAILY' | 'MCQ',
          title: data.title,
          date: data.date || undefined,
          levelId: selectedLevelId,
          description: data.description,
        },
      });

      // Handle question associations
      const currentQuestionIds = selectedQuestionIds.map(Number);

      // Remove questions that are no longer selected
      const questionsToRemove = initialQuestionIds.filter(
        (qId) => !currentQuestionIds.includes(qId)
      );

      // Add questions that are newly selected
      const questionsToAdd = currentQuestionIds.filter(
        (qId) => !initialQuestionIds.includes(qId)
      );

      // Delete removed associations
      if (questionsToRemove.length > 0) {
        const toDelete = quizQuestions?.filter(
          (qq) => qq.questionId && questionsToRemove.includes(qq.questionId)
        );
        if (toDelete) {
          await Promise.all(
            toDelete.map((qq) => utils.client.quizQuestion.delete.mutate({ id: qq.id }))
          );
        }
      }

      // Add new associations
      if (questionsToAdd.length > 0) {
        const startPosition = currentQuestionIds.length - questionsToAdd.length + 1;
        await Promise.all(
          questionsToAdd.map((questionId, index) =>
            utils.client.quizQuestion.create.mutate({
              quizId: Number(id),
              questionId,
              position: startPosition + index,
            })
          )
        );
      }

      // Update positions for existing questions
      const existingQuestions = currentQuestionIds.filter((qId) =>
        initialQuestionIds.includes(qId)
      );
      if (existingQuestions.length > 0) {
        await Promise.all(
          existingQuestions.map((questionId, index) => {
            const qq = quizQuestions?.find((q) => q.questionId === questionId);
            if (qq && qq.position !== index + 1) {
              return utils.client.quizQuestion.update.mutate({
                id: qq.id,
                data: { position: index + 1 },
              });
            }
            return Promise.resolve();
          })
        );
      }

      utils.quizQuestion.getByQuiz.invalidate({ quizId: Number(id) });
    } catch (error: any) {
      // Error already handled by mutation
    }
  };

  const handleLevelCreated = (levelId: number) => {
    setSelectedLevelId(levelId);
    setValue('levelId', levelId);
  };

  const handleQuestionCreated = (questionId: number) => {
    setSelectedQuestionIds([...selectedQuestionIds, questionId]);
  };

  const levelOptions = formatSelectOptions(levels, (l) => l.title || `Level ${l.number}`);
  const questionOptions = formatSelectOptions(questions, (q) => {
    const text = q.text || 'Unnamed Question';
    return text.length > 60 ? text.substring(0, 60) + '...' : text;
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading quiz...</div>;
  }

  if (!quiz) {
    return <div className="text-center py-8">Quiz not found</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Quiz</h1>
            <p className="text-gray-600 mt-1">Quiz #{id}</p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quiz Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Select
                label="Type"
                name="type"
                register={register}
                errors={errors}
                options={[
                  { value: 'DAILY', label: 'Daily Quiz' },
                  { value: 'MCQ', label: 'MCQ Quiz' },
                ]}
                required
              />

              <FormField
                label="Title"
                name="title"
                register={register}
                errors={errors}
                required
                placeholder="Enter quiz title"
              />

              <FormField
                label="Date"
                name="date"
                type="date"
                register={register}
                errors={errors}
                placeholder="Select date for daily quiz"
              />

              <RelationSelect
                label="Level"
                options={levelOptions}
                value={selectedLevelId}
                onChange={(value) => setSelectedLevelId(value ? Number(value) : null)}
                placeholder="Select a level..."
                onCreate={() => setShowLevelDialog(true)}
                createLabel="Create Level"
              />

              <FormField
                label="Description"
                name="description"
                type="textarea"
                register={register}
                errors={errors}
                placeholder="Enter quiz description"
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Questions</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuestionDialog(true)}
                  >
                    Create Question
                  </Button>
                </div>
                <MultiSelect
                  label=""
                  options={questionOptions}
                  value={selectedQuestionIds}
                  onChange={setSelectedQuestionIds}
                  placeholder="Select questions..."
                />
                <p className="text-xs text-gray-500">
                  Drag to reorder questions or click "Create Question" to add new ones inline
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating...' : 'Update Quiz'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <CreateLevelDialog
        open={showLevelDialog}
        onOpenChange={setShowLevelDialog}
        onSuccess={handleLevelCreated}
      />

      <CreateQuestionDialog
        open={showQuestionDialog}
        onOpenChange={setShowQuestionDialog}
        onSuccess={handleQuestionCreated}
      />
    </>
  );
}
