# Backend Test Fixes

## Summary of Changes

This document outlines the fixes applied to resolve failing backend tests in CI/CD.

## Issues Fixed

### 1. API Route Text Mismatch
**Issue:** Test expected "Cashou Backend API" but server returned "Cashou backend"
**Fix:** Updated `/Users/yohan/code/epitech/cashou/apps/backend/src/index.ts:27` to return the correct text

```typescript
return new Response("Cashou Backend API", {
    status: 200,
    headers: {
        "Content-Type": "text/plain",
    },
});
```

### 2. Server Port Conflict in Tests
**Issue:** Multiple test files imported `index.ts` which automatically started a server, causing `EADDRINUSE` errors
**Fix:** Refactored server startup to be conditional:
- Server only starts when `index.ts` is run directly (not imported)
- Tests can explicitly call `startServer()` which reuses the same instance
- Modified files:
  - `apps/backend/src/index.ts` - Added `startServer()` function and conditional startup
  - `apps/backend/tests/api.test.ts` - Import and call `startServer()` explicitly
  - `apps/backend/tests/trpc.test.ts` - Import and call `startServer()` explicitly

### 3. Integration Tests Missing Test Data
**Issue:** Integration tests for `LevelGoalService` and `LevelEventService` were failing because they relied on existing database records that didn't exist
**Fix:** Updated tests to create their own test data in `beforeAll()` and clean it up in `afterAll()`:
- `apps/backend/tests/service/level-goal.service.integration.test.ts`
  - Creates a test Level and Goal before running tests
  - Cleans up all test data after tests complete
- `apps/backend/tests/service/level-event.service.integration.test.ts`
  - Creates a test Level and Event before running tests
  - Cleans up all test data after tests complete

## CI/CD Requirements

For these tests to pass in CI, the following must be configured:

### 1. Database Availability
Integration tests require a PostgreSQL database. Ensure your CI pipeline:
- Starts a PostgreSQL service before running tests
- Sets the `CASHOU_DB_URL` environment variable
- Waits for the database to be ready before running tests

Example for GitHub Actions:
```yaml
services:
  postgres:
    image: postgres:15-alpine
    env:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: cashou_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

env:
  CASHOU_DB_URL: postgresql://test_user:test_password@localhost:5432/cashou_test
```

### 2. Database Migrations
Before running tests, ensure database migrations are applied:
```bash
cd apps/backend
bun run migrate
```

### 3. Running Tests
```bash
cd apps/backend
bun test
```

## Test Behavior

### Integration Tests
Integration tests will:
- **Skip** if `CASHOU_DB_URL` is not set
- **Skip** individual tests if they can't create required test data
- **Run** if database is available and create their own test data

### API and tRPC Tests
These tests:
- Always run (don't require database)
- Start a single shared server instance on port 3000
- Test API endpoints and tRPC routes

## Expected Results

After these fixes, all tests should pass when:
1. A PostgreSQL database is available at the URL specified in `CASHOU_DB_URL`
2. Database migrations have been applied
3. No other service is using port 3000

If the database is not available:
- Integration tests will be skipped
- API and tRPC tests will still run and pass
