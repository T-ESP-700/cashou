import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import { FormField } from '@/components/forms/FormField'

interface CreateLevelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (levelId: number) => void
}

interface LevelFormData {
  title: string
  number: number
  duration?: number | null
  speed?: number | null
  startBalance?: number | null
  pointsRequired?: number | null
  description?: string | null
}

const NUMBER_FIELDS: Array<keyof LevelFormData> = [
  'number',
  'duration',
  'speed',
  'startBalance',
  'pointsRequired',
]

export function CreateLevelDialog({ open, onOpenChange, onSuccess }: CreateLevelDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LevelFormData>({
    defaultValues: {
      title: '',
      number: undefined as unknown as number,
      duration: undefined,
      speed: undefined,
      startBalance: undefined,
      pointsRequired: undefined,
      description: '',
    },
  })

  const utils = trpc.useUtils()
  const createLevelMutation = trpc.level.create.useMutation()

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const onSubmit = async (data: LevelFormData) => {
    const parsedPayload = NUMBER_FIELDS.reduce<Record<string, unknown>>(
      (acc, key) => {
        const value = data[key]
        if (
          value === '' ||
          value === undefined ||
          value === null ||
          (typeof value === 'number' && Number.isNaN(value))
        ) {
          acc[key] = undefined
        } else {
          acc[key] = typeof value === 'number' ? value : Number(value)
        }
        return acc
      },
      { title: data.title, description: data.description },
    )

    try {
      const result = await createLevelMutation.mutateAsync(parsedPayload)
      toast.success('Niveau créé avec succès')
      await utils.level.getAll.invalidate()
      onSuccess(result.id)
      onOpenChange(false)
      reset()
    } catch (error: unknown) {
      toast.error(`Impossible de créer le niveau : ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Créer un niveau</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Titre"
            name="title"
            register={register}
            errors={errors}
            required
            placeholder="Découverte"
          />
          <FormField
            label="Numéro"
            name="number"
            type="number"
            register={register}
            errors={errors}
            required
            placeholder="1"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Durée (jours)"
              name="duration"
              type="number"
              register={register}
              errors={errors}
              placeholder="14"
            />
            <FormField
              label="Vitesse"
              name="speed"
              type="number"
              register={register}
              errors={errors}
              placeholder="1"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Balance initiale"
              name="startBalance"
              type="number"
              register={register}
              errors={errors}
              placeholder="10000"
            />
            <FormField
              label="Points requis"
              name="pointsRequired"
              type="number"
              register={register}
              errors={errors}
              placeholder="500"
            />
          </div>
          <FormField
            label="Description"
            name="description"
            type="textarea"
            register={register}
            errors={errors}
            placeholder="Objectifs, pacing, etc."
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || createLevelMutation.isPending}>
              {createLevelMutation.isPending ? 'Création...' : 'Créer le niveau'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
