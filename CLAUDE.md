# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Bun-based backend API for the Cashou application, a gamified financial education platform. The project uses TypeScript, Prisma ORM with PostgreSQL, and Better-Auth for authentication.

## Development Commands

### Core Development
- `bun dev` - Start development server with hot reload on port 3000
- `bun start` - Run production server
- `bun run build` - TypeScript type checking (no emit)
- `bun run check` - Alternative TypeScript type checking

### Database Management
- `bun run generate` - Generate Prisma client
- `bun run migrate` - Run database migrations in development
- `bun run migrate:deploy` - Deploy migrations to production
- `bun run migrate:reset` - Reset database and re-run migrations
- `bun run studio` - Open Prisma Studio for database inspection
- `bun run db:check` - Pull database schema from remote
- `bun run db:status` - Check database connection status (scripts/db-check.ts)
- `bun run db:seed` - Seed database with initial data (src/seed-data.ts)
- `bun run db:empty` - Force reset database (destructive)

### Testing
- `bun test` - Run tests using Bun's built-in test runner

## Architecture

### Tech Stack
- **Runtime**: Bun 1.0+
- **Language**: TypeScript with strict mode
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better-Auth with Prisma adapter
- **Package Manager**: Bun

### Database Schema
The application uses two Prisma schemas:
- **app/schema.prisma**: Main application schema with extensive models for the gamified trading simulation
- **backoffice/schema.prisma**: Separate schema for administrative functions

Key domain models include:
- **User/Authentication**: User profiles with level progression and points system
- **Game System**: Levels, Goals, Events, GameInstances for simulation management
- **Trading**: Assets, Markets, Submarkets, Transactions, Wallets for financial simulation
- **Education**: Quiz system with Questions, Answers, and user progress tracking
- **Notifications**: User notification system with different notification types

### Project Structure
```
backend/
├── prisma/
│   ├── app/           # Main application database schema
│   └── backoffice/    # Admin database schema
├── src/
│   ├── controllers/   # Request handlers (currently empty)
│   ├── lib/          # Shared utilities (auth.ts)
│   ├── middleware/   # Express/Bun middleware (currently empty)
│   ├── routes/       # API routes (currently empty)
│   ├── services/     # Business logic (currently empty)
│   ├── types/        # TypeScript type definitions
│   ├── database.ts   # Prisma client singleton
│   ├── index.ts      # Main server entry point
│   └── seed-data.ts  # Database seeding script
├── scripts/
│   └── db-check.ts   # Database connection verification
└── tests/            # Test files

```

### Current Implementation Status
The project is in early development with:
- Basic Bun server setup with health check endpoint
- Prisma configuration for database management
- Better-Auth integration for authentication (in progress)
- Empty directory structure for MVC pattern implementation

### Environment Variables
Required environment variables:
- `CASHOU_DB_URL` - PostgreSQL connection string for main database
- Additional auth-related environment variables for Better-Auth configuration

## TypeScript Configuration
- Target: ESNext with bundler module resolution
- Strict mode enabled
- Import extensions allowed for Bun compatibility
- No emit mode (Bun handles transpilation)