/**
 * Validators for business logic rules
 */

/**
 * Validates Impact data according to business rules:
 * - Must have either assetId, OR (submarketId + fieldId)
 * - Cannot have both assetId and (submarketId OR fieldId)
 *
 * @param data - Impact data to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateImpactData(data: {
  assetId?: number | null;
  submarketId?: number | null;
  fieldId?: number | null;
}): { isValid: boolean; error?: string } {
  const hasAssetId = data.assetId != null;
  const hasSubmarketId = data.submarketId != null;
  const hasFieldId = data.fieldId != null;

  // Case 1: Has assetId only (valid)
  if (hasAssetId && !hasSubmarketId && !hasFieldId) {
    return { isValid: true };
  }

  // Case 2: Has submarketId and fieldId, but no assetId (valid)
  if (!hasAssetId && hasSubmarketId && hasFieldId) {
    return { isValid: true };
  }

  // Case 3: Has assetId with submarketId or fieldId (invalid - conflict)
  if (hasAssetId && (hasSubmarketId || hasFieldId)) {
    return {
      isValid: false,
      error: 'Impact cannot have both assetId and (submarketId/fieldId). Use either assetId OR (submarketId + fieldId).'
    };
  }

  // Case 4: Has submarketId or fieldId but not both (invalid - incomplete)
  if (!hasAssetId && (hasSubmarketId || hasFieldId) && !(hasSubmarketId && hasFieldId)) {
    return {
      isValid: false,
      error: 'When targeting by field/submarket, both submarketId and fieldId are required.'
    };
  }

  // Case 5: Has neither assetId nor (submarketId + fieldId) (invalid - missing data)
  return {
    isValid: false,
    error: 'Impact must have either assetId OR both (submarketId + fieldId).'
  };
}

/**
 * Type guard to check if Impact data is valid
 * Throws an error if validation fails
 *
 * @param data - Impact data to validate
 * @throws Error if validation fails
 */
export function assertValidImpact(data: {
  assetId?: number | null;
  submarketId?: number | null;
  fieldId?: number | null;
}): void {
  const validation = validateImpactData(data);
  if (!validation.isValid) {
    throw new Error(`Invalid Impact data: ${validation.error}`);
  }
}
