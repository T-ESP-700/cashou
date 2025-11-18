import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/FormField';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface QuestionFormData {
  text: string;
}

interface Answer {
  text: string;
  isCorrect: boolean;
}

interface CreateQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (questionId: number) => void;
}

export function CreateQuestionDialog({ open, onOpenChange, onSuccess }: CreateQuestionDialogProps) {
  const utils = trpc.useUtils();
  const [answers, setAnswers] = useState<Answer[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<QuestionFormData>();

  const createQuestionMutation = trpc.question.create.useMutation();
  const createAnswerMutation = trpc.answer.create.useMutation();

  const onSubmit = async (data: QuestionFormData) => {
    try {
      // Create question first
      const question = await createQuestionMutation.mutateAsync({ text: data.text });

      // Create all answers
      const validAnswers = answers.filter((a) => a.text.trim() !== '');
      if (validAnswers.length > 0) {
        await Promise.all(
          validAnswers.map((answer) =>
            createAnswerMutation.mutateAsync({
              questionId: question.id,
              text: answer.text,
              isCorrect: answer.isCorrect,
            })
          )
        );
      }

      toast.success('Question created with answers');
      utils.question.getAll.invalidate();
      utils.answer.getAll.invalidate();
      onSuccess(question.id);
      reset();
      setAnswers([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to create question: ${error.message}`);
    }
  };

  const addAnswer = () => {
    setAnswers([...answers, { text: '', isCorrect: false }]);
  };

  const removeAnswer = (index: number) => {
    setAnswers(answers.filter((_, i) => i !== index));
  };

  const updateAnswer = (index: number, field: keyof Answer, value: string | boolean) => {
    const newAnswers = [...answers];
    newAnswers[index] = { ...newAnswers[index], [field]: value };
    setAnswers(newAnswers);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Question</DialogTitle>
        </DialogHeader>

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

            {answers.map((answer, index) => (
              <div key={index} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={answer.text}
                  onChange={(e) => updateAnswer(index, 'text', e.target.value)}
                  placeholder={`Answer ${index + 1}`}
                  className="flex-1 rounded-md border overflow-hidden border-gray-300 px-3 py-2 text-sm"
                />
                <label className="flex items-center gap-2 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={answer.isCorrect}
                    onChange={(e) => updateAnswer(index, 'isCorrect', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Correct</span>
                </label>
                {answers.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeAnswer(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createQuestionMutation.isPending || createAnswerMutation.isPending}
            >
              {createQuestionMutation.isPending ? 'Creating...' : 'Create Question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
