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

## Mobile Application (apps/mobile)

### Tech Stack
- **Framework**: Expo with React Native
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Navigation**: Expo Router

### Styling Guidelines

**IMPORTANT**: Use NativeWind with Tailwind classes for all styling. Do NOT create separate CSS stylesheets or StyleSheet.create() objects.

#### Theme Configuration
- Theme values are defined in `apps/mobile/constants/cashou-theme.ts`
- Tailwind config (`apps/mobile/tailwind.config.js`) is synced with the theme
- Use the `useCashouTheme()` hook for dynamic theme values when needed

#### How to Style Components

**Preferred: Use NativeWind className**
```tsx
import { View, Text } from 'react-native';

export function MyComponent() {
  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <Text className="text-lg font-rowdies text-text-light dark:text-text-dark mb-sm">
        Hello World
      </Text>
      <View className="px-md py-lg bg-card-light dark:bg-card-dark rounded-lg">
        <Text className="font-roboto text-text-light dark:text-text-dark">
          Content here
        </Text>
      </View>
    </View>
  );
}
```

**When dynamic values are needed: Combine className with style prop**
```tsx
import { View, Text } from 'react-native';
import { useCashouTheme } from '@/hooks/use-cashou-theme';

export function DynamicComponent({ customPadding }: { customPadding: number }) {
  const { colors, spacing } = useCashouTheme();

  return (
    <View
      className="flex-1 rounded-lg"
      style={{ backgroundColor: colors.background, padding: customPadding }}
    >
      <Text className="font-rowdies text-2xl" style={{ color: colors.text }}>
        Dynamic styling
      </Text>
    </View>
  );
}
```

#### Available Theme Classes

**Colors** (use with light/dark variants):
- `bg-background-light/dark` - Background color
- `bg-card-light/dark` - Card background
- `bg-primary-light/dark` - Primary color
- `text-text-light/dark` - Text color
- `border-border-light/dark` - Border color
- `bg-accent` - Accent color (same in both modes)

**Status Colors**:
- `bg-success`, `text-success` - Success states
- `bg-error`, `text-error` - Error states
- `bg-warning`, `text-warning` - Warning states
- `bg-info`, `text-info` - Info states

**Typography**:
- `font-rowdies` - Headings (H1)
- `font-robotoBold` - Subheadings (H2)
- `font-roboto` - Body text

**Spacing** (synced with CashouTheme.spacing):
- `p-xs`, `m-xs` - 4px
- `p-sm`, `m-sm` - 8px
- `p-md`, `m-md` - 16px
- `p-lg`, `m-lg` - 24px
- `p-xl`, `m-xl` - 32px

**Border Radius** (synced with CashouTheme.borderRadius):
- `rounded-sm` - 8px
- `rounded-md` - 12px
- `rounded-lg` - 16px
- `rounded-xl` - 24px

#### What NOT to Do

```tsx
// ❌ DON'T create StyleSheet objects
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F9' }
});

// ❌ DON'T use inline styles for static values
<View style={{ flex: 1, padding: 16, borderRadius: 12 }}>

// ❌ DON'T hardcode colors
<Text style={{ color: '#1C1E33' }}>

// ✅ DO use NativeWind classes
<View className="flex-1 p-md rounded-md bg-background-light dark:bg-background-dark">
<Text className="text-text-light dark:text-text-dark">
```