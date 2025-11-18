import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/FormField';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface EventFormData {
  title: string;
  description: string;
  hasImpact: boolean;
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormData>({
    defaultValues: {
      hasImpact: false,
    },
  });

  const createMutation = trpc.event.create.useMutation({
    onSuccess: () => {
      toast.success('Event created successfully');
      utils.event.getAll.invalidate();
      navigate('/events');
    },
    onError: (error) => {
      toast.error(`Failed to create event: ${error.message}`);
    },
  });

  const onSubmit = (data: EventFormData) => {
    createMutation.mutate({
      title: data.title,
      description: data.description,
      hasImpact: data.hasImpact,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Event</h1>
          <p className="text-gray-600 mt-1">Add a new game event</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/events')}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              label="Title"
              name="title"
              register={register}
              errors={errors}
              required
              placeholder="Enter event title"
            />

            <FormField
              label="Description"
              name="description"
              type="textarea"
              register={register}
              errors={errors}
              placeholder="Enter event description"
            />

            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  {...register('hasImpact')}
                  className="rounded border-gray-300"
                />
                Has Impact
              </label>
              <p className="text-xs text-gray-500">
                Check if this event affects assets or markets
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Event'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/events')}
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
