import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SelectOption } from './Select';
import { cn } from '@/lib/utils';

interface RelationSelectProps {
  label: string;
  options: SelectOption[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  onCreate?: () => void;
  createLabel?: string;
  isLoading?: boolean;
}

export function RelationSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  required = false,
  error,
  onCreate,
  createLabel = 'Create new',
  isLoading = false,
}: RelationSelectProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="flex gap-2">
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={isLoading}
          className={cn(
            'flex-1 rounded-md border overflow-hidden px-3 py-2 text-sm focus:outline-none focus:ring-2',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-gray-500 focus:ring-gray-500'
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {onCreate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreate}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
