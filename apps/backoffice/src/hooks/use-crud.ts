import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Generic hook for CRUD operations
 * Provides common handlers and utilities for create/update/delete operations
 */
export function useCrudHandlers(entityName: string, listPath: string) {
  const navigate = useNavigate();

  const handleSuccess = (message: string) => {
    toast?.success?.(message) ?? console.log(message);
    navigate(listPath);
  };

  const handleError = (error: unknown, operation: string) => {
    const message = error instanceof Error ? error.message : 'An error occurred';
    toast?.error?.(`${operation} failed: ${message}`) ?? console.error(message);
  };

  const handleDelete = (id: string | number, deleteFn: () => Promise<any>) => {
    if (window.confirm(`Are you sure you want to delete this ${entityName}?`)) {
      deleteFn()
        .then(() => handleSuccess(`${entityName} deleted successfully`))
        .catch((error) => handleError(error, 'Delete'));
    }
  };

  return {
    handleSuccess,
    handleError,
    handleDelete,
    navigate,
  };
}

/**
 * Format options for select dropdowns
 */
export function formatSelectOptions<T extends { id: string | number }>(
  items: T[] | undefined,
  labelFn: (item: T) => string
) {
  if (!items) return [];
  return items.map((item) => ({
    value: item.id,
    label: labelFn(item),
  }));
}
