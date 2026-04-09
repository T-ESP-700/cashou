import { FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps<TFieldValues extends FieldValues> {
  label: string
  name: Path<TFieldValues>
  register: UseFormRegister<TFieldValues>
  errors: FieldErrors<TFieldValues>
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  helperText?: string
}

export function Select<TFieldValues extends FieldValues>({
  label,
  name,
  register,
  errors,
  options,
  placeholder = 'Select an option',
  required = false,
  helperText,
}: SelectProps<TFieldValues>) {
  const error = errors[name]
  const errorMessage = error?.message as string | undefined

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <select
        {...register(name, { required: required ? `${label} is required` : false })}
        className={cn(
          'w-full rounded-md border overflow-hidden px-3 py-2 text-sm focus:outline-none focus:ring-2',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500',
        )}
        defaultValue=""
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && !errorMessage && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}
      {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
    </div>
  )
}
