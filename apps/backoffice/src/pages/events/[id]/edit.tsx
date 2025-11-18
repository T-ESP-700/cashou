import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
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

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EventFormData>();

  const { data: event, isLoading } = trpc.event.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  const updateMutation = trpc.event.update.useMutation({
    onSuccess: () => {
      toast.success('Event updated successfully');
      utils.event.getAll.invalidate();
      navigate('/events');
    },
    onError: (error) => {
      toast.error(`Failed to update event: ${error.message}`);
    },
  });

  useEffect(() => {
    if (event) {
      reset({
        title: event.title || '',
        description: event.description || '',
        hasImpact: event.hasImpact || false,
      });
    }
  }, [event, reset]);

  const onSubmit = (data: EventFormData) => {
    updateMutation.mutate({
      id: Number(id),
      data: {
        title: data.title,
        description: data.description,
        hasImpact: data.hasImpact,
      },
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading event...</div>;
  }

  if (!event) {
    return <div className="text-center py-8">Event not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
          <p className="text-gray-600 mt-1">Update event information</p>
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
              name="textarea"
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
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Event'}
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
