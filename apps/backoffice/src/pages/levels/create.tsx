import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/FormField';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { formatSelectOptions } from '@/hooks/use-crud';
import { CreateEventDialog } from '@/components/modals/CreateEventDialog';
import { CreateGoalDialog } from '@/components/modals/CreateGoalDialog';

interface LevelFormData {
  title: string;
  number: number;
  duration: number;
  speed: number;
  startBalance: number;
  pointsRequired: number;
  description: string;
}

export default function CreateLevelPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [selectedEventIds, setSelectedEventIds] = useState<(string | number)[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<(string | number)[]>([]);

  // Dialog states
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LevelFormData>();

  // Fetch events and goals for selection
  const { data: events } = trpc.event.getAll.useQuery();
  const { data: goals } = trpc.goal.getAll.useQuery();

  // Create mutation
  const createMutation = trpc.level.create.useMutation({
    onSuccess: async (data) => {
      // Associate events and goals if selected
      const levelId = data.id;

      try {
        if (selectedEventIds.length > 0) {
          await Promise.all(
            selectedEventIds.map((eventId) =>
              utils.client.levelEvent.create.mutate({
                levelId,
                eventId: Number(eventId),
              })
            )
          );
        }

        if (selectedGoalIds.length > 0) {
          await Promise.all(
            selectedGoalIds.map((goalId) =>
              utils.client.levelGoal.create.mutate({
                levelId,
                goalId: Number(goalId),
              })
            )
          );
        }

        toast.success('Level created successfully');
        navigate('/levels');
      } catch (error) {
        toast.error(`Level created but failed to associate events/goals: ${error}`);
        navigate('/levels');
      }
    },
    onError: (error) => {
      toast.error(`Failed to create level: ${error.message}`);
    },
  });

  const onSubmit = (data: LevelFormData) => {
    createMutation.mutate({
      title: data.title,
      number: data.number,
      duration: data.duration,
      speed: data.speed,
      startBalance: data.startBalance,
      pointsRequired: data.pointsRequired,
      description: data.description,
    });
  };

  const handleEventCreated = (eventId: number) => {
    setSelectedEventIds([...selectedEventIds, eventId]);
  };

  const handleGoalCreated = (goalId: number) => {
    setSelectedGoalIds([...selectedGoalIds, goalId]);
  };

  const eventOptions = formatSelectOptions(events, (e) => e.title || 'Unnamed Event');
  const goalOptions = formatSelectOptions(goals, (g) => g.title || 'Unnamed Goal');

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Level</h1>
          <p className="text-gray-600 mt-1">Add a new game level</p>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Events</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEventDialog(true)}
                >
                  Create Event
                </Button>
              </div>
              <MultiSelect
                label=""
                options={eventOptions}
                value={selectedEventIds}
                onChange={setSelectedEventIds}
                placeholder="Select events..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Goals</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGoalDialog(true)}
                >
                  Create Goal
                </Button>
              </div>
              <MultiSelect
                label=""
                options={goalOptions}
                value={selectedGoalIds}
                onChange={setSelectedGoalIds}
                placeholder="Select goals..."
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Level'}
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

      {/* Modals */}
      <CreateEventDialog
        open={showEventDialog}
        onOpenChange={setShowEventDialog}
        onSuccess={handleEventCreated}
      />

      <CreateGoalDialog
        open={showGoalDialog}
        onOpenChange={setShowGoalDialog}
        onSuccess={handleGoalCreated}
      />
    </>
  );
}
