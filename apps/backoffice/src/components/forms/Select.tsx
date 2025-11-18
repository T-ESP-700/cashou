import { UseFormRegister, FieldErrors, Path } from 'react-hook-form';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps<T extends Record<string, any>> {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function Select<T extends Record<string, any>>({
  label,
  name,
  register,
  errors,
  options,
  placeholder = 'Select an option...',
  required = false,
  className,
}: SelectProps<T>) {
  const error = errors[name];
  const errorMessage = error?.message as string | undefined;

  const selectClasses = cn(
    'w-full rounded-md border overflow-hidden px-3 py-2 text-sm focus:outline-none focus:ring-2',
    error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500',
    className
  );

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <select
        {...register(name, { required: required ? `${label} is required` : false })}
        className={selectClasses}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {errorMessage && (
        <p className="text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}
