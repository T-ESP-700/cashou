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

interface LevelFormData {
  title: string;
  number: number;
  duration: number;
  speed: number;
  startBalance: number;
  pointsRequired: number;
  description: string;
}

interface CreateLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (levelId: number) => void;
}

export function CreateLevelDialog({ open, onOpenChange, onSuccess }: CreateLevelDialogProps) {
  const utils = trpc.useUtils();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LevelFormData>({
    defaultValues: {
      number: 1,
      duration: 60,
      speed: 1,
      startBalance: 10000,
      pointsRequired: 100,
    },
  });

  const createMutation = trpc.level.create.useMutation({
    onSuccess: (data) => {
      toast.success('Level created successfully');
      utils.level.getAll.invalidate();
      onSuccess(data.id);
      reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to create level: ${error.message}`);
    },
  });

  const onSubmit = (data: LevelFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Level</DialogTitle>
        </DialogHeader>

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
            />

            <FormField
              label="Duration (seconds)"
              name="duration"
              type="number"
              register={register}
              errors={errors}
              required
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
            />

            <FormField
              label="Start Balance"
              name="startBalance"
              type="number"
              register={register}
              errors={errors}
              required
            />
          </div>

          <FormField
            label="Points Required"
            name="pointsRequired"
            type="number"
            register={register}
            errors={errors}
            required
          />

          <FormField
            label="Description"
            name="description"
            type="textarea"
            register={register}
            errors={errors}
            placeholder="Enter level description"
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
              {createMutation.isPending ? 'Creating...' : 'Create Level'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
