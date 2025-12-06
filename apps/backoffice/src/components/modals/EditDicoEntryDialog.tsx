import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { backofficeApi } from '@/services/backoffice-api'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import type { DicoEntry } from '@/lib/domain'

interface EditDicoEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: DicoEntry | null
  onCreate?: (term: string, definition: string) => Promise<void>
}

export function EditDicoEntryDialog({ open, onOpenChange, entry, onCreate }: EditDicoEntryDialogProps) {
  const refresh = useBackofficeStore((state) => state.refresh)
  const [term, setTerm] = useState('')
  const [definition, setDefinition] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCreating = !entry && onCreate !== undefined

  useEffect(() => {
    if (entry) {
      setTerm(entry.term || '')
      setDefinition(entry.definition || '')
      setError(null)
    } else {
      setTerm('')
      setDefinition('')
      setError(null)
    }
  }, [entry, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!term.trim()) {
      setError('Le terme est requis')
      return
    }

    if (!definition.trim()) {
      setError('La définition est requise')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (isCreating && onCreate) {
        await onCreate(term.trim(), definition.trim())
      } else if (entry) {
        await backofficeApi.dicoEntry.update({
          id: entry.id,
          data: {
            term: term.trim(),
            definition: definition.trim(),
          },
        })
        await refresh()
      }
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message || 'Erreur lors de l\'opération')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!entry) return
    if (!window.confirm(`Supprimer définitivement l'entrée "${entry.term}" ?`)) return

    setIsSubmitting(true)
    setError(null)

    try {
      await backofficeApi.dicoEntry.delete(entry.id)
      await refresh()
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message || 'Erreur lors de la suppression')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? 'Créer une nouvelle entrée' : entry ? `Modifier l'entrée "${entry.term}"` : 'Modifier l\'entrée'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Terme <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Ex: Action"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Définition <span className="text-red-500">*</span>
            </label>
            <textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="Explication du terme..."
              rows={8}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 resize-y"
              required
            />
            <p className="text-xs text-slate-500">
              Utilisez <code className="bg-slate-100 px-1 rounded">\n</code> pour les retours à la ligne
            </p>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div>
              {!isCreating && entry && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Supprimer
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isCreating
                    ? 'Création...'
                    : 'Enregistrement...'
                  : isCreating
                    ? 'Créer'
                    : 'Enregistrer'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
