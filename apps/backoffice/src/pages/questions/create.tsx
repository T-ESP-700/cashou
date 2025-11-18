import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/FormField';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface QuestionFormData {
  text: string;
}

export default function CreateQuestionPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { register, handleSubmit, formState: { errors } } = useForm<QuestionFormData>();

  const createMutation = trpc.question.create.useMutation({
    onSuccess: () => {
      toast.success('Question created successfully');
      utils.question.getAll.invalidate();
      navigate('/questions');
    },
    onError: (error) => {
      toast.error(`Failed to create question: ${error.message}`);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Question</h1>
        <Button variant="outline" onClick={() => navigate('/questions')}>Cancel</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Question Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => createMutation.mutate({ text: data.text }))} className="space-y-4">
            <FormField label="Question Text" name="text" type="textarea" register={register} errors={errors} required />
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/questions')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
