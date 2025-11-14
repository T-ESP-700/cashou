/**
 * Example usage of Impact validators
 *
 * This file demonstrates how to use the Impact validation functions
 * in your application code.
 */

import { validateImpactData, assertValidImpact } from './validators';
import { PrismaClient } from '@cashou/db-app';

const prisma = new PrismaClient();

/**
 * Example 1: Using validateImpactData with manual error handling
 */
async function createImpactWithValidation(data: {
  eventId: number;
  assetId?: number;
  submarketId?: number;
  fieldId?: number;
  coef?: number;
}) {
  // Validate the impact data before creating
  const validation = validateImpactData({
    assetId: data.assetId,
    submarketId: data.submarketId,
    fieldId: data.fieldId,
  });

  if (!validation.isValid) {
    console.error('Validation failed:', validation.error);
    return null;
  }

  // Create the impact if validation passes
  const impact = await prisma.impact.create({
    data: {
      eventId: data.eventId,
      assetId: data.assetId,
      submarketId: data.submarketId,
      fieldId: data.fieldId,
      coef: data.coef,
    },
  });

  return impact;
}

/**
 * Example 2: Using assertValidImpact with try-catch
 */
async function createImpactWithAssertion(data: {
  eventId: number;
  assetId?: number;
  submarketId?: number;
  fieldId?: number;
  coef?: number;
}) {
  try {
    // Assert validation - will throw if invalid
    assertValidImpact({
      assetId: data.assetId,
      submarketId: data.submarketId,
      fieldId: data.fieldId,
    });

    // Create the impact if assertion doesn't throw
    const impact = await prisma.impact.create({
      data: {
        eventId: data.eventId,
        assetId: data.assetId,
        submarketId: data.submarketId,
        fieldId: data.fieldId,
        coef: data.coef,
      },
    });

    return impact;
  } catch (error) {
    console.error('Impact creation failed:', error);
    throw error;
  }
}

/**
 * Example 3: Validating existing Impact data
 */
async function validateExistingImpacts() {
  const impacts = await prisma.impact.findMany();

  const invalidImpacts = impacts.filter(impact => {
    const validation = validateImpactData({
      assetId: impact.assetId,
      submarketId: impact.submarketId,
      fieldId: impact.fieldId,
    });
    return !validation.isValid;
  });

  if (invalidImpacts.length > 0) {
    console.warn(`Found ${invalidImpacts.length} invalid impacts:`);
    invalidImpacts.forEach(impact => {
      const validation = validateImpactData({
        assetId: impact.assetId,
        submarketId: impact.submarketId,
        fieldId: impact.fieldId,
      });
      console.warn(`Impact #${impact.id}: ${validation.error}`);
    });
  }

  return invalidImpacts;
}

/**
 * Usage examples:
 */

// Example 1: Create impact targeting a specific asset
// createImpactWithValidation({
//   eventId: 1,
//   assetId: 5,
//   coef: 10
// });

// Example 2: Create impact targeting a field and submarket
// createImpactWithAssertion({
//   eventId: 1,
//   submarketId: 2,
//   fieldId: 3,
//   coef: -5
// });

// Example 3: Invalid - will fail validation
// createImpactWithValidation({
//   eventId: 1,
//   assetId: 5,
//   submarketId: 2,  // Cannot have both assetId and submarketId
//   coef: 10
// });

export { createImpactWithValidation, createImpactWithAssertion, validateExistingImpacts };
