import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
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
import { useBackofficeStore } from '@/store/useBackofficeStore';

interface QuizFormData {
  type: string;
  title: string;
  date: string;
  levelId: number | null;
  description: string;
}

export default function CreateQuizPage() {
  const navigate = useNavigate();
  const setModule = useBackofficeStore((state) => state.setModule);
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
    control,
    getValues,
  } = useForm<QuizFormData>();

  // Watch the type, title, date, and description fields for validation
  const selectedType = useWatch({ control, name: 'type' });
  const titleValue = useWatch({ control, name: 'title' });
  const dateValue = useWatch({ control, name: 'date' });
  const descriptionValue = useWatch({ control, name: 'description' });

  // Reset date and level when type changes, or set default date for DAILY
  useEffect(() => {
    setModule('quizzes');
  }, [setModule]);

  useEffect(() => {
    if (selectedType === 'DAILY') {
      // Set today's date as default if date is empty
      if (!dateValue) {
        const today = new Date().toISOString().split('T')[0];
        setValue('date', today);
      }
    } else if (selectedType !== 'DAILY') {
      setValue('date', '');
    }
    if (selectedType !== 'MCQ') {
      setSelectedLevelId(null);
      setValue('levelId', null);
    }
  }, [selectedType, setValue, dateValue]);

  // Fetch levels and questions for selection
  const { data: levels } = trpc.level.getAll.useQuery();
  const { data: questions } = trpc.question.getAll.useQuery();

  // Fetch all Daily Quiz to get questions already used
  const { data: allDailyQuizzes } = trpc.quiz.getByType.useQuery(
    { type: 'DAILY' },
    { enabled: selectedType === 'DAILY' }
  );

  // Fetch questions for all Daily Quiz
  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<number>>(new Set());
  
  useEffect(() => {
    if (selectedType === 'DAILY' && allDailyQuizzes && allDailyQuizzes.length > 0) {
      const fetchAllQuestions = async () => {
        const questionIds = new Set<number>();
        const promises = allDailyQuizzes
          .filter((quiz) => quiz.id)
          .map((quiz) => utils.client.quizQuestion.getByQuiz.query({ quizId: quiz.id! }));
        
        const results = await Promise.all(promises);
        results.forEach((quizQuestions) => {
          quizQuestions?.forEach((qq) => {
            if (qq.questionId) {
              questionIds.add(qq.questionId);
            }
          });
        });
        setUsedQuestionIds(questionIds);
      };
      fetchAllQuestions();
    } else {
      setUsedQuestionIds(new Set());
    }
  }, [selectedType, allDailyQuizzes, utils]);

  // Filter questions to exclude those already used in Daily Quiz
  const availableQuestions = useMemo(() => {
    if (selectedType === 'DAILY' && usedQuestionIds.size > 0) {
      return questions?.filter((q) => !usedQuestionIds.has(q.id)) || [];
    }
    return questions || [];
  }, [selectedType, questions, usedQuestionIds]);

  // Check if a Daily Quiz already exists for the selected date
  const actualDateValue = getValues('date') || dateValue;
  const { data: dailyQuizExists } = trpc.quiz.dailyQuizExists.useQuery(
    { date: actualDateValue || '' },
    { enabled: selectedType === 'DAILY' && !!actualDateValue }
  );

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
        navigate('/quiz');
      } catch (error) {
        toast.error(`Quiz created but failed to associate questions: ${error}`);
        navigate('/quiz');
      }
    },
    onError: (error) => {
      toast.error(`Failed to create quiz: ${error.message}`);
    },
  });

  const onSubmit = async (data: QuizFormData) => {
    // Vérifier si un Daily Quiz existe déjà pour cette date
    if (data.type === 'DAILY' && data.date) {
      const exists = await utils.client.quiz.dailyQuizExists.query({ date: data.date });
      if (exists) {
        toast.error('Un Daily Quiz existe déjà pour cette date');
        return;
      }
    }

    createMutation.mutate({
      type: data.type as 'DAILY' | 'MCQ',
      title: data.title,
      date: data.date || undefined,
      levelId: selectedLevelId,
      description: data.description,
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
  const questionOptions = formatSelectOptions(availableQuestions, (q) => {
    const text = q.text || 'Unnamed Question';
    return text.length > 60 ? text.substring(0, 60) + '...' : text;
  });

  // Validation: type and title must be filled, date and description required for DAILY
  const isTypeFilled = selectedType && selectedType.trim() !== '';
  const isTitleFilled = titleValue && titleValue.trim() !== '';
  // actualDateValue is already defined above for the query
  const isDateFilled = actualDateValue && actualDateValue.trim() !== '';
  const isDescriptionFilled = descriptionValue && descriptionValue.trim() !== '';
  
  // For DAILY quiz, date and description are required
  const isDailyValid = selectedType !== 'DAILY' || (isDateFilled && isDescriptionFilled);
  const requiredQuestionCount = selectedType === 'DAILY' ? 3 : 1;
  const hasRequiredQuestions = selectedQuestionIds.length >= requiredQuestionCount;
  // Check if Daily Quiz already exists for this date
  const dateAlreadyUsed = selectedType === 'DAILY' && dailyQuizExists === true;
  
  const isSubmitDisabled = 
    createMutation.isPending || 
    !isTypeFilled || 
    !isTitleFilled || 
    !isDailyValid ||
    !hasRequiredQuestions ||
    dateAlreadyUsed;

  // Determine error message to display
  const getErrorMessage = () => {
    if (!isTypeFilled) {
      return 'Veuillez sélectionner un type de quiz';
    }
    if (!isTitleFilled) {
      return 'Veuillez remplir le titre du quiz';
    }
    if (selectedType === 'DAILY' && !isDateFilled) {
      return 'Veuillez remplir la date pour un Daily Quiz';
    }
    if (selectedType === 'DAILY' && !isDescriptionFilled) {
      return 'Veuillez remplir la description pour un Daily Quiz';
    }
    if (selectedType === 'DAILY' && selectedQuestionIds.length < 3) {
      return 'Un Daily Quiz doit contenir au moins 3 questions';
    }
    if (selectedType === 'MCQ' && selectedQuestionIds.length < 1) {
      return 'Un MCQ doit contenir au moins 1 question';
    }
    if (dateAlreadyUsed) {
      return 'Un Daily Quiz existe déjà pour cette date';
    }
    return null;
  };

  const errorMessage = getErrorMessage();

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Quiz</h1>
            <p className="text-gray-600 mt-1">Add a new quiz with all relations</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/quiz')}>
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

              {selectedType === 'DAILY' && (
                <FormField
                  label="Date"
                  name="date"
                  type="date"
                  register={register}
                  errors={errors}
                  required
                  placeholder="Select date for daily quiz"
                />
              )}

              {selectedType === 'MCQ' && (
                <RelationSelect
                  label="Level"
                  options={levelOptions}
                  value={selectedLevelId}
                  onChange={(value) => setSelectedLevelId(value ? Number(value) : null)}
                  placeholder="Select a level..."
                  onCreate={() => setShowLevelDialog(true)}
                  createLabel="Create Level"
                />
              )}

              <FormField
                label="Description"
                name="description"
                type="textarea"
                register={register}
                errors={errors}
                required={selectedType === 'DAILY'}
                placeholder="Enter quiz description"
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Questions <span className="text-red-500">*</span>
                  </label>
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
                <div className="relative inline-block group">
                  <Button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="relative"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Quiz'}
                  </Button>
                  {errorMessage && (
                    <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md max-w-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                      {errorMessage}
                      <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/quiz')}
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
