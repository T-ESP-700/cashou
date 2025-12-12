export interface SelectOption {
  value: string | number
  label: string
}

/**
 * Normalise un tableau d'entités en options compatibles avec les composants de sélection.
 */
export function formatSelectOptions<T extends { id?: string | number }>(
  collection: T[] | undefined,
  labelBuilder: (entity: T) => string,
): SelectOption[] {
  if (!collection || collection.length === 0) {
    return []
  }

  return collection
    .filter((item) => item && item.id !== undefined && item.id !== null)
    .map((item) => ({
      value: item.id as string | number,
      label: labelBuilder(item),
    }))
}
