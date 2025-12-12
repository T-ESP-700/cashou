// Re-export server auth for backend
export { auth } from './server';
export type { Auth } from './server';

// Re-export client auth creator for frontend/mobile
export { createAuth } from './client';

// Re-export types
export type { Session, User } from './types';