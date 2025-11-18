import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/FormField';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface GoalFormData {
  title: string;
  description: string;
}

export default function EditGoalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GoalFormData>();

  const { data: goal, isLoading } = trpc.goal.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  const updateMutation = trpc.goal.update.useMutation({
    onSuccess: () => {
      toast.success('Goal updated successfully');
      utils.goal.getAll.invalidate();
      navigate('/goals');
    },
    onError: (error) => {
      toast.error(`Failed to update goal: ${error.message}`);
    },
  });

  useEffect(() => {
    if (goal) {
      reset({
        title: goal.title || '',
        description: goal.description || '',
      });
    }
  }, [goal, reset]);

  const onSubmit = (data: GoalFormData) => {
    updateMutation.mutate({
      id: Number(id),
      data: {
        title: data.title,
        description: data.description,
      },
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading goal...</div>;
  }

  if (!goal) {
    return <div className="text-center py-8">Goal not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Goal</h1>
          <p className="text-gray-600 mt-1">Update goal information</p>
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
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Goal'}
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
