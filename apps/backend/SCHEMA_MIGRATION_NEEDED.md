# Schema Migration Issues

## Critical Issue: User ID Type Mismatch

The Prisma schema has been updated to use better-auth, which changed the `User.id` field from `Int` to `String`. This cascades to all foreign keys referencing users.

## Changes in Schema

### User Model
- **Before**: `id Int @id @default(autoincrement())`
- **After**: `id String @id @default(cuid())`
- **Field Changes**:
  - `username` → `name` (String?)
  - Added better-auth related tables (Account, Session, Verification)

### Affected Models (Foreign Keys)
- `UserQuiz.userId`: `Int?` → `String?`
- `UserAnswer.userId`: `Int?` → `String?`
- `GameInstance.userId`: `Int?` → `String?`
- `GameUser.userId`: `Int?` → `String?`
- `Notification.userId`: `Int?` → `String?`
- `Wallet.userId`: `Int?` → `String?`

### Other Schema Changes
- `Quiz.date` field removed
- `QuizQuestion.position` field removed
- User no longer has `username`, `discriminator`, `badges`, or `lastActivity` fields

## Files Requiring Updates

### Services
All service files that interact with User IDs need updates:
- `src/trpc/services/user-quiz.service.ts`
- `src/trpc/services/user-answer.service.ts`
- `src/trpc/services/user.service.ts`
- `src/seed-data.ts`

### Routers
- `src/trpc/routers/user.ts`

### Schema Definitions
- All Zod schemas in `src/trpc/schemas-zod/` that reference userId

## Recommended Actions

### Option 1: Rollback better-auth (Quick Fix)
If better-auth integration is not yet required:
1. Revert the Prisma schema to use `Int` for User IDs
2. Remove better-auth tables
3. Restore original User fields (username, discriminator, etc.)

### Option 2: Complete Migration (Long-term Solution)
1. Update all userId fields in service files from `number` to `string`
2. Update all Zod schemas to expect string userId
3. Update seed data to generate cuid() instead of incrementing integers
4. Update tests to use string user IDs
5. Add migration script to convert existing data

## Temporary Workaround for CI/CD

To unblock CI/CD while the migration is in progress:
1. Ensure Prisma client is generated before typecheck: `bun run precheck`
2. Skip type errors with `// @ts-expect-error` comments (not recommended for production)
3. Or temporarily disable strict type checking

## CI/CD Configuration

The `typecheck` script now includes a `precheck` step that generates the Prisma client automatically:
```json
"precheck": "cd ../../packages/@cashou/db-app && bun run generate",
"typecheck": "bun run precheck && tsc --noEmit"
```

This ensures the Prisma client is always up-to-date before type checking.
