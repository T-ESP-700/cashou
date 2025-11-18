import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/FormField';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface QuestionFormData {
  text: string;
}

interface AnswerData {
  id?: number;
  text: string;
  isCorrect: boolean;
  isNew?: boolean;
  isDeleted?: boolean;
}

export default function EditQuestionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [answers, setAnswers] = useState<AnswerData[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<QuestionFormData>();

  // Fetch question data
  const { data: question, isLoading } = trpc.question.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  // Fetch all answers and filter for this question
  const { data: allAnswers } = trpc.answer.getAll.useQuery();

  // Update mutation
  const updateMutation = trpc.question.update.useMutation();

  // Populate form when data loads
  useEffect(() => {
    if (question) {
      reset({
        text: question.text || '',
      });
    }
  }, [question, reset]);

  // Populate answers when they load
  useEffect(() => {
    if (allAnswers) {
      const questionAnswers = allAnswers.filter((a) => a.questionId === Number(id));
      setAnswers(
        questionAnswers.map((a) => ({
          id: a.id,
          text: a.text || '',
          isCorrect: a.isCorrect || false,
        }))
      );
    }
  }, [allAnswers, id]);

  const onSubmit = async (data: QuestionFormData) => {
    try {
      // Update the question
      await updateMutation.mutateAsync({
        id: Number(id),
        data: {
          text: data.text,
        },
      });

      // Handle answers
      const existingAnswers = answers.filter((a) => a.id && !a.isNew && !a.isDeleted);
      const newAnswers = answers.filter((a) => a.isNew && !a.isDeleted);
      const deletedAnswers = answers.filter((a) => a.isDeleted && a.id);

      // Update existing answers
      await Promise.all(
        existingAnswers.map((answer) =>
          utils.client.answer.update.mutate({
            id: answer.id!,
            data: {
              text: answer.text,
              isCorrect: answer.isCorrect,
            },
          })
        )
      );

      // Create new answers
      await Promise.all(
        newAnswers.map((answer) =>
          utils.client.answer.create.mutate({
            questionId: Number(id),
            text: answer.text,
            isCorrect: answer.isCorrect,
          })
        )
      );

      // Delete removed answers
      await Promise.all(
        deletedAnswers.map((answer) =>
          utils.client.answer.delete.mutate({ id: answer.id! })
        )
      );

      toast.success('Question updated successfully');
      utils.question.getAll.invalidate();
      utils.question.getById.invalidate({ id: Number(id) });
      utils.answer.getAll.invalidate();
      navigate(-1);
    } catch (error: any) {
      toast.error(`Failed to update question: ${error.message}`);
    }
  };

  const addAnswer = () => {
    setAnswers([...answers, { text: '', isCorrect: false, isNew: true }]);
  };

  const removeAnswer = (index: number) => {
    const answer = answers[index];
    if (answer.id) {
      // Mark existing answer for deletion
      const newAnswers = [...answers];
      newAnswers[index] = { ...answer, isDeleted: true };
      setAnswers(newAnswers);
    } else {
      // Remove new answer from list
      setAnswers(answers.filter((_, i) => i !== index));
    }
  };

  const updateAnswer = (index: number, field: keyof AnswerData, value: string | boolean) => {
    const newAnswers = [...answers];
    if (field === 'isCorrect' && value === true) {
      // Only one answer can be correct - uncheck others
      newAnswers.forEach((a, i) => {
        newAnswers[i] = { ...a, isCorrect: i === index };
      });
    } else {
      newAnswers[index] = { ...newAnswers[index], [field]: value };
    }
    setAnswers(newAnswers);
  };

  const visibleAnswers = answers.filter((a) => !a.isDeleted);

  if (isLoading) {
    return <div className="text-center py-8">Loading question...</div>;
  }

  if (!question) {
    return <div className="text-center py-8">Question not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Question</h1>
          <p className="text-gray-600 mt-1">Question #{id}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Question Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              label="Question Text"
              name="text"
              type="textarea"
              register={register}
              errors={errors}
              required
              placeholder="Enter your question"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Answers</label>
                <Button type="button" variant="outline" size="sm" onClick={addAnswer}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Answer
                </Button>
              </div>

              {visibleAnswers.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">
                  No answers yet. Click "Add Answer" to add one.
                </p>
              ) : (
                <div className="space-y-3">
                  {answers.map((answer, index) => {
                    if (answer.isDeleted) return null;
                    return (
                      <div key={index} className="flex gap-2 items-start">
                        <input
                          type="text"
                          value={answer.text}
                          onChange={(e) => updateAnswer(index, 'text', e.target.value)}
                          placeholder={`Answer ${visibleAnswers.indexOf(answer) + 1}`}
                          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <label className="flex items-center gap-2 whitespace-nowrap px-2 py-2">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={answer.isCorrect}
                            onChange={() => updateAnswer(index, 'isCorrect', true)}
                            className="border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span
                            className={`text-sm ${
                              answer.isCorrect ? 'text-green-600 font-medium' : 'text-gray-600'
                            }`}
                          >
                            Correct
                          </span>
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAnswer(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-gray-500">
                Select the correct answer using the radio button.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Question'}
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
  );
}
