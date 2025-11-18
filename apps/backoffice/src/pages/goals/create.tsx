import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/FormField';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface GoalFormData {
  title: string;
  description: string;
}

export default function CreateGoalPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalFormData>();

  const createMutation = trpc.goal.create.useMutation({
    onSuccess: () => {
      toast.success('Goal created successfully');
      utils.goal.getAll.invalidate();
      navigate('/goals');
    },
    onError: (error) => {
      toast.error(`Failed to create goal: ${error.message}`);
    },
  });

  const onSubmit = (data: GoalFormData) => {
    createMutation.mutate({
      title: data.title,
      description: data.description,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Goal</h1>
          <p className="text-gray-600 mt-1">Add a new level goal</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/goals')}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              label="Title"
              name="title"
              register={register}
              errors={errors}
              required
              placeholder="Enter goal title"
            />

            <FormField
              label="Description"
              name="description"
              type="textarea"
              register={register}
              errors={errors}
              placeholder="Enter goal description"
            />

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Goal'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/goals')}
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
