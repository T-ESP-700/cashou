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

interface GoalFormData {
  title: string;
  description: string;
}

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (goalId: number) => void;
}

export function CreateGoalDialog({ open, onOpenChange, onSuccess }: CreateGoalDialogProps) {
  const utils = trpc.useUtils();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GoalFormData>();

  const createMutation = trpc.goal.create.useMutation({
    onSuccess: (data) => {
      toast.success('Goal created successfully');
      utils.goal.getAll.invalidate();
      onSuccess(data.id);
      reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to create goal: ${error.message}`);
    },
  });

  const onSubmit = (data: GoalFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
        </DialogHeader>

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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
