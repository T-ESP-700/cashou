import { describe, test, expect } from 'bun:test';
import { validateImpactData, assertValidImpact } from '../src/lib/validators';

describe('Impact Validation', () => {
  describe('validateImpactData', () => {
    test('should accept valid impact with assetId only', () => {
      const result = validateImpactData({ assetId: 1 });
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should accept valid impact with submarketId and fieldId', () => {
      const result = validateImpactData({ submarketId: 1, fieldId: 2 });
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject impact with assetId and submarketId', () => {
      const result = validateImpactData({ assetId: 1, submarketId: 2 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot have both');
    });

    test('should reject impact with assetId and fieldId', () => {
      const result = validateImpactData({ assetId: 1, fieldId: 2 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot have both');
    });

    test('should reject impact with assetId, submarketId, and fieldId', () => {
      const result = validateImpactData({ assetId: 1, submarketId: 2, fieldId: 3 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot have both');
    });

    test('should reject impact with only submarketId', () => {
      const result = validateImpactData({ submarketId: 1 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('both submarketId and fieldId are required');
    });

    test('should reject impact with only fieldId', () => {
      const result = validateImpactData({ fieldId: 1 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('both submarketId and fieldId are required');
    });

    test('should reject impact with no IDs', () => {
      const result = validateImpactData({});
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must have either');
    });

    test('should handle null values as missing', () => {
      const result = validateImpactData({ assetId: null, submarketId: null, fieldId: null });
      expect(result.isValid).toBe(false);
    });

    test('should handle undefined values as missing', () => {
      const result = validateImpactData({ assetId: undefined, submarketId: undefined, fieldId: undefined });
      expect(result.isValid).toBe(false);
    });
  });

  describe('assertValidImpact', () => {
    test('should not throw for valid impact with assetId', () => {
      expect(() => {
        assertValidImpact({ assetId: 1 });
      }).not.toThrow();
    });

    test('should not throw for valid impact with submarketId and fieldId', () => {
      expect(() => {
        assertValidImpact({ submarketId: 1, fieldId: 2 });
      }).not.toThrow();
    });

    test('should throw for invalid impact', () => {
      expect(() => {
        assertValidImpact({ assetId: 1, submarketId: 2 });
      }).toThrow('Invalid Impact data');
    });

    test('should throw for empty impact', () => {
      expect(() => {
        assertValidImpact({});
      }).toThrow('Invalid Impact data');
    });
  });
});
