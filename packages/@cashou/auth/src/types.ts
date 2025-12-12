export type { Session, User as BetterAuthUser } from 'better-auth/types';
export type { Auth } from './server';

// Extend the better-auth User type with Cashou-specific fields
import type { User as BetterAuthUserType } from 'better-auth/types';

export interface User extends BetterAuthUserType {
  points?: number | null;
  levelId?: number | null;
}
