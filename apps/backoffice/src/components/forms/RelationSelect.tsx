import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RelationSelectProps {
  label: string
  options: Array<{ value: string | number; label: string }>
  value: string | number | null
  onChange: (value: string | number | null) => void
  placeholder?: string
  helperText?: string
  onCreate?: () => void
  createLabel?: string
}

export function RelationSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  helperText,
  onCreate,
  createLabel = 'Create',
}: RelationSelectProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm font-medium text-gray-700">
        <label>{label}</label>
        {onCreate && (
          <Button type="button" size="sm" variant="outline" onClick={onCreate}>
            <Plus className="size-4" />
            {createLabel}
          </Button>
        )}
      </div>

      <select
        className={cn(
          'w-full rounded-md border overflow-hidden px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2',
          'border-gray-300 focus:border-gray-500 focus:ring-gray-500',
        )}
        value={value ?? ''}
        onChange={(event) => {
          if (event.target.value === '') {
            onChange(null)
            return
          }
          onChange(event.target.value)
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
    </div>
  )
}
