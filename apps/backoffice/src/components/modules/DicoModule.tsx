import { useState, useMemo } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBackofficeStore } from '@/store/useBackofficeStore'
import { backofficeApi } from '@/services/backoffice-api'
import { EditDicoEntryDialog } from '@/components/modals/EditDicoEntryDialog'
import { cn } from '@/lib/utils'
import type { DicoEntry } from '@/lib/domain'

export function DicoModule() {
  const dicoEntries = useBackofficeStore((state) => state.dicoEntries || [])
  const refresh = useBackofficeStore((state) => state.refresh)
  const [selectedEntry, setSelectedEntry] = useState<DicoEntry | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [localSearchTerm, setLocalSearchTerm] = useState('')

  const filteredEntries = useMemo(() => {
    if (!localSearchTerm.trim()) return dicoEntries
    const term = localSearchTerm.toLowerCase().trim()
    return dicoEntries.filter(
      (entry) =>
        entry.term?.toLowerCase().includes(term) ||
        entry.definition?.toLowerCase().includes(term),
    )
  }, [dicoEntries, localSearchTerm])

  const handleDoubleClick = (entry: DicoEntry) => {
    setSelectedEntry(entry)
    setIsDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedEntry(null)
    setIsCreating(true)
    setIsDialogOpen(true)
  }

  const handleCreateSubmit = async (term: string, definition: string) => {
    try {
      await backofficeApi.dicoEntry.create({
        term: term.trim(),
        definition: definition.trim(),
      })
      await refresh()
      setIsDialogOpen(false)
      setIsCreating(false)
    } catch (error) {
      throw error
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-800">
          <strong>📚 Dictionnaire financier</strong> — Gérez les termes et définitions affichés dans l'app mobile.
          Double-cliquez sur une entrée pour la modifier. Les définitions peuvent contenir des retours à la ligne avec{' '}
          <code className="bg-amber-100 px-1 rounded">\n</code>.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                placeholder="Rechercher un terme ou une définition..."
                className="w-full pl-10 pr-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
              {localSearchTerm && (
                <button
                  onClick={() => setLocalSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="size-4 mr-2" />
            Ajouter une entrée
          </Button>
        </div>

        <div className="flex items-center justify-between px-2 py-2 mb-2">
          <div>
            <p className="text-xs uppercase text-slate-500">Enregistrements</p>
            <p className="text-sm text-slate-600">
              {filteredEntries.length} {filteredEntries.length === 1 ? 'entrée' : 'entrées'}
              {localSearchTerm && ` (sur ${dicoEntries.length})`}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Terme</th>
                <th className="px-4 py-3 font-medium">Définition</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => {
                const definition = entry.definition || ''
                const truncatedDef = definition.length > 100 ? definition.slice(0, 100) + '...' : definition
                return (
                  <tr
                    key={entry.id}
                    onDoubleClick={() => handleDoubleClick(entry)}
                    className={cn(
                      'cursor-pointer border-t border-slate-100 transition hover:bg-slate-50/80',
                    )}
                  >
                    <td className="px-4 py-3 text-slate-700 font-medium">{entry.term}</td>
                    <td className="px-4 py-3 text-slate-600">{truncatedDef}</td>
                  </tr>
                )
              })}
              {!filteredEntries.length && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-sm text-slate-500">
                    {localSearchTerm
                      ? `Aucun résultat pour "${localSearchTerm}"`
                      : 'Aucune entrée dans le dictionnaire'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditDicoEntryDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setIsCreating(false)
            setSelectedEntry(null)
          }
        }}
        entry={selectedEntry}
        onCreate={isCreating ? handleCreateSubmit : undefined}
      />
    </div>
  )
}
