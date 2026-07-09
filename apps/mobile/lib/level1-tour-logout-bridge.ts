/**
 * Lets auth clear Level 1 tour in-memory state on logout without importing the
 * tour context from use-auth (provider order / circular deps).
 */
let clearFn: (() => void) | null = null;

export function registerLevel1TourLogoutClear(fn: () => void): void {
  clearFn = fn;
}

export function unregisterLevel1TourLogoutClear(): void {
  clearFn = null;
}

export function clearLevel1TourOnLogout(): void {
  try {
    clearFn?.();
  } catch {
    // Never block logout
  }
}
