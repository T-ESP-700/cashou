import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/FormField';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { formatSelectOptions } from '@/hooks/use-crud';

interface LevelFormData {
  title: string;
  number: number;
  duration: number;
  speed: number;
  startBalance: number;
  pointsRequired: number;
  description: string;
}

export default function EditLevelPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [selectedEventIds, setSelectedEventIds] = useState<(string | number)[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<(string | number)[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LevelFormData>();

  // Fetch level data
  const { data: level, isLoading } = trpc.level.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  // Fetch events and goals for selection
  const { data: events } = trpc.event.getAll.useQuery();
  const { data: goals } = trpc.goal.getAll.useQuery();

  // Fetch level events and goals
  const { data: levelEvents } = trpc.levelEvent.getAll.useQuery();
  const { data: levelGoals } = trpc.levelGoal.getAll.useQuery();

  // Update mutation
  const updateMutation = trpc.level.update.useMutation({
    onSuccess: async () => {
      // Update associations
      const levelId = Number(id);

      try {
        // Get current associations
        const currentEvents = levelEvents?.filter((le) => le.levelId === levelId) || [];
        const currentGoals = levelGoals?.filter((lg) => lg.levelId === levelId) || [];

        // Delete removed events
        for (const currentEvent of currentEvents) {
          if (!selectedEventIds.includes(currentEvent.eventId)) {
            await utils.client.levelEvent.delete.mutate({ id: currentEvent.id });
          }
        }

        // Add new events
        for (const eventId of selectedEventIds) {
          if (!currentEvents.find((ce) => ce.eventId === Number(eventId))) {
            await utils.client.levelEvent.create.mutate({
              levelId,
              eventId: Number(eventId),
            });
          }
        }

        // Delete removed goals
        for (const currentGoal of currentGoals) {
          if (!selectedGoalIds.includes(currentGoal.goalId)) {
            await utils.client.levelGoal.delete.mutate({ id: currentGoal.id });
          }
        }

        // Add new goals
        for (const goalId of selectedGoalIds) {
          if (!currentGoals.find((cg) => cg.goalId === Number(goalId))) {
            await utils.client.levelGoal.create.mutate({
              levelId,
              goalId: Number(goalId),
            });
          }
        }

        toast.success('Level updated successfully');
        utils.level.getAll.invalidate();
        navigate('/levels');
      } catch (error) {
        toast.error(`Level updated but failed to update associations: ${error}`);
        navigate('/levels');
      }
    },
    onError: (error) => {
      toast.error(`Failed to update level: ${error.message}`);
    },
  });

  // Populate form when data is loaded
  useEffect(() => {
    if (level) {
      reset({
        title: level.title || '',
        number: level.number || 0,
        duration: level.duration || 0,
        speed: level.speed || 0,
        startBalance: level.startBalance || 0,
        pointsRequired: level.pointsRequired || 0,
        description: level.description || '',
      });
    }
  }, [level, reset]);

  // Set selected events and goals
  useEffect(() => {
    if (levelEvents && id) {
      const currentLevelEvents = levelEvents.filter(
        (le) => le.levelId === Number(id)
      );
      setSelectedEventIds(currentLevelEvents.map((le) => le.eventId));
    }
  }, [levelEvents, id]);

  useEffect(() => {
    if (levelGoals && id) {
      const currentLevelGoals = levelGoals.filter(
        (lg) => lg.levelId === Number(id)
      );
      setSelectedGoalIds(currentLevelGoals.map((lg) => lg.goalId));
    }
  }, [levelGoals, id]);

  const onSubmit = (data: LevelFormData) => {
    updateMutation.mutate({
      id: Number(id),
      data: {
        title: data.title,
        number: data.number,
        duration: data.duration,
        speed: data.speed,
        startBalance: data.startBalance,
        pointsRequired: data.pointsRequired,
        description: data.description,
      },
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading level...</div>;
  }

  if (!level) {
    return <div className="text-center py-8">Level not found</div>;
  }

  const eventOptions = formatSelectOptions(events, (e) => e.title || 'Unnamed Event');
  const goalOptions = formatSelectOptions(goals, (g) => g.title || 'Unnamed Goal');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Level</h1>
          <p className="text-gray-600 mt-1">Update level information</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/levels')}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Level Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              label="Title"
              name="title"
              register={register}
              errors={errors}
              required
              placeholder="Enter level title"
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Level Number"
                name="number"
                type="number"
                register={register}
                errors={errors}
                required
                placeholder="1"
              />

              <FormField
                label="Duration (seconds)"
                name="duration"
                type="number"
                register={register}
                errors={errors}
                required
                placeholder="60"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Speed"
                name="speed"
                type="number"
                register={register}
                errors={errors}
                required
                placeholder="1"
              />

              <FormField
                label="Start Balance"
                name="startBalance"
                type="number"
                register={register}
                errors={errors}
                required
                placeholder="10000"
              />
            </div>

            <FormField
              label="Points Required"
              name="pointsRequired"
              type="number"
              register={register}
              errors={errors}
              required
              placeholder="100"
            />

            <FormField
              label="Description"
              name="description"
              type="textarea"
              register={register}
              errors={errors}
              placeholder="Enter level description"
            />

            <MultiSelect
              label="Events"
              options={eventOptions}
              value={selectedEventIds}
              onChange={setSelectedEventIds}
              placeholder="Select events..."
            />

            <MultiSelect
              label="Goals"
              options={goalOptions}
              value={selectedGoalIds}
              onChange={setSelectedGoalIds}
              placeholder="Select goals..."
            />

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Level'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/levels')}
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
