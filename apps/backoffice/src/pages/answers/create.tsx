import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/FormField';
import { Select } from '@/components/forms/Select';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { formatSelectOptions } from '@/hooks/use-crud';

interface AnswerFormData {
  text: string;
  isCorrect: boolean;
  questionId: number;
}

export default function CreateAnswerPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { register, handleSubmit, formState: { errors } } = useForm<AnswerFormData>();
  const { data: questions } = trpc.question.getAll.useQuery();

  const createMutation = trpc.answer.create.useMutation({
    onSuccess: () => {
      toast.success('Answer created');
      navigate('/answers');
    },
  });

  const questionOptions = formatSelectOptions(questions, (q) => q.text || 'Unnamed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Answer</h1>
        <Button variant="outline" onClick={() => navigate('/answers')}>Cancel</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Answer Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <Select label="Question" name="questionId" register={register} errors={errors} options={questionOptions} required />
            <FormField label="Answer Text" name="text" register={register} errors={errors} required />
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('isCorrect')} />
              Is Correct Answer
            </label>
            <div className="flex gap-2 pt-4">
              <Button type="submit">Create</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/answers')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
