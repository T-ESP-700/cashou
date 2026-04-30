import { UseFormRegister, FieldErrors, Path, FieldValues } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface FormFieldProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'textarea';
  placeholder?: string;
  required?: boolean;
  className?: string;
  step?: string;
}

export function FormField<T extends FieldValues>({
  label,
  name,
  register,
  errors,
  type = 'text',
  placeholder,
  required = false,
  className,
  step,
}: FormFieldProps<T>) {
  const error = errors[name];
  const errorMessage = error?.message as string | undefined;

  const inputClasses = cn(
    'w-full rounded-md border overflow-hidden px-3 py-2 text-sm focus:outline-none focus:ring-2',
    error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500',
    'placeholder:text-gray-400',
    className
  );

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          {...register(name, { required: required ? `${label} is required` : false })}
          placeholder={placeholder}
          className={cn(inputClasses, 'min-h-[100px] resize-y')}
        />
      ) : (
        <input
          {...register(name, {
            required: required ? `${label} is required` : false,
            valueAsNumber: type === 'number',
          })}
          type={type}
          step={step}
          placeholder={placeholder}
          className={inputClasses}
        />
      )}

      {errorMessage && (
        <p className="text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}
