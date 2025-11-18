import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
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
  context: string;
}

export default function CreateQuizPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<(string | number)[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);

  // Dialog states
  const [showLevelDialog, setShowLevelDialog] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<QuizFormData>();

  // Fetch levels and questions for selection
  const { data: levels } = trpc.level.getAll.useQuery();
  const { data: questions } = trpc.question.getAll.useQuery();

  const createMutation = trpc.quiz.create.useMutation({
    onSuccess: async (data) => {
      const quizId = data.id;

      try {
        // Associate questions
        if (selectedQuestionIds.length > 0) {
          await Promise.all(
            selectedQuestionIds.map((questionId, index) =>
              utils.client.quizQuestion.create.mutate({
                quizId,
                questionId: Number(questionId),
                position: index + 1,
              })
            )
          );
        }

        toast.success('Quiz created successfully');
        navigate('/quizzes');
      } catch (error) {
        toast.error(`Quiz created but failed to associate questions: ${error}`);
        navigate('/quizzes');
      }
    },
    onError: (error) => {
      toast.error(`Failed to create quiz: ${error.message}`);
    },
  });

  const onSubmit = (data: QuizFormData) => {
    createMutation.mutate({
      type: data.type as 'DAILY' | 'MCQ',
      title: data.title,
      date: data.date,
      levelId: selectedLevelId,
      context: data.context,
    });
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

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Quiz</h1>
            <p className="text-gray-600 mt-1">Add a new quiz with all relations</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/quizzes')}>
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
                required
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
                label="Context"
                name="context"
                type="textarea"
                register={register}
                errors={errors}
                placeholder="Enter quiz context or instructions"
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
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Quiz'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/quizzes')}
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
