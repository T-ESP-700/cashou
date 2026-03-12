import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string | number;
  label: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  required = false,
  error,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOptions = options.filter((opt) => value.includes(opt.value));
  const availableOptions = options.filter((opt) => !value.includes(opt.value));

  const addValue = (optionValue: string | number) => {
    onChange([...value, optionValue]);
    setIsOpen(false);
  };

  const removeValue = (optionValue: string | number) => {
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {/* Selected items */}
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedOptions.map((option) => (
            <div
              key={option.value}
              className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-sm"
            >
              <span>{option.label}</span>
              <button
                type="button"
                onClick={() => removeValue(option.value)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Dropdown */}
        <div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'w-full rounded-md border overflow-hidden px-3 py-2 text-left text-sm focus:outline-none focus:ring-2',
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500',
              value.length === 0 ? 'text-gray-400' : 'text-gray-900'
            )}
          >
            {selectedOptions.length > 0
              ? `${selectedOptions.length} selected`
              : placeholder}
          </button>

          {isOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-md overflow-hidden border-0 bg-white shadow-lg">
              <div className="max-h-60 overflow-auto py-1">
                {availableOptions.length > 0 ? (
                  availableOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => addValue(option.value)}
                      className="w-full border-0 px-3 py-2 text-left text-sm hover:bg-gray-100 focus:ring-0"
                    >
                      {option.label}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No more options available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
