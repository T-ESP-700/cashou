# IMP_DIFF — Intégration difficulté utilisateur (profil + requêtes ciblées)

Objectif: ajouter une difficulté au profil utilisateur et ne charger que les données liées à cette difficulté (pas d'appels inutiles).

---

## 1) Schéma DB (Prisma)

**Fichier:** `packages/@cashou/db-app/prisma/schema.prisma`

```prisma
enum Difficulty {
  EASY
  NORMAL
  HARD
}

model User {
  id                    String      @id @default(cuid())
  // ...
  difficultyPreference  Difficulty  @default(NORMAL) @map("difficulty_preference")
  // ...
}

model Level {
  id             Int      @id @default(autoincrement())
  // ...
  difficulty     Difficulty @default(NORMAL)
  // ...
}

model GameInstance {
  id                Int        @id @default(autoincrement())
  // snapshot de la difficulté utilisée au démarrage
  difficultyAtStart Difficulty @default(NORMAL) @map("difficulty_at_start")
  // ...
}
```

Ensuite:

```bash
bun run migrate
bun run generate
```

---

## 2) Exposer la difficulté dans `auth.me`

**Fichier:** `apps/backend/src/trpc/routers/auth.ts`

Dans le `select` de `me`, ajouter:

```ts
difficultyPreference: true,
```

Exemple (extrait):

```ts
const fullUser = await prisma.user.findUnique({
  where: { id: ctx.session.user.id },
  select: {
    id: true,
    email: true,
    // ...
    levelId: true,
    points: true,
    difficultyPreference: true,
  },
});
```

---

## 3) Mutation profil: changer la difficulté

**Fichier:** `apps/backend/src/trpc/routers/user.ts`

Ajouter une mutation protégée:

```ts
setDifficultyPreference: protectedProcedure
  .input(
    z.object({
      difficulty: z.enum(["EASY", "NORMAL", "HARD"]),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
    }

    return prisma.user.update({
      where: { id: userId },
      data: { difficultyPreference: input.difficulty },
      select: {
        id: true,
        difficultyPreference: true,
      },
    });
  }),
```

---

## 4) Backend: endpoint niveaux filtrés sur la difficulté du user

### 4.1 Service

**Fichier:** `apps/backend/src/trpc/services/level.service.ts`

```ts
async findUserLevelSummaryById(userId: string, levelId: number) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { difficultyPreference: true },
  });
  if (!user) return null;

  const level = await this.prisma.level.findFirst({
    where: {
      id: levelId,
      difficulty: user.difficultyPreference,
    },
    include: {
      levelGoals: { include: { goal: true } },
      levelEvents: { include: { event: true } },
    },
  });

  if (!level) return null;
  return {
    level,
    goals: level.levelGoals.map((x) => x.goal),
    events: level.levelEvents.map((x) => x.event),
  };
}
```

### 4.2 Router

**Fichier:** `apps/backend/src/trpc/routers/level.router.ts`

Ajouter un endpoint sans `userId` en input (on prend la session):

```ts
getSummaryForMe: protectedProcedure
  .input(z.object({ id: z.number().min(1) }))
  .query(async ({ input, ctx }) => {
    return levelService.findUserLevelSummaryById(ctx.session.user.id, input.id);
  }),
```

---

## 5) Mobile: React Query (cache + invalidation intelligente)

## 5.1 Installer

**Fichier:** `apps/mobile/package.json` (dépendance)

```bash
bun add @tanstack/react-query
```

## 5.2 QueryClient provider

**Fichier:** `apps/mobile/app/_layout.tsx`

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnReconnect: true,
          },
        },
      })
  );

  // ... fontsLoaded etc.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemePreferenceProvider>
          <AuthProvider>
            <NotificationProvider>
              <RootLayoutInner />
            </NotificationProvider>
          </AuthProvider>
        </ThemePreferenceProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

## 5.3 Hook `useMe` et lecture difficulté

**Nouveau fichier:** `apps/mobile/hooks/queries/use-me.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { trpcClient } from "@/lib/trpc";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => trpcClient.auth.me.query(),
  });
}
```

## 5.4 Hook niveaux filtrés sur la difficulté utilisateur

**Nouveau fichier:** `apps/mobile/hooks/queries/use-level-summary-for-me.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { trpcClient } from "@/lib/trpc";
import { useMe } from "./use-me";

export function useLevelSummaryForMe(levelId?: number) {
  const { data: me } = useMe();
  const difficulty = me?.user?.difficultyPreference;

  return useQuery({
    queryKey: ["level-summary-for-me", levelId, difficulty],
    enabled: Boolean(levelId && difficulty),
    queryFn: () => trpcClient.level.getSummaryForMe.query({ id: levelId! }),
  });
}
```

---

## 6) Changement de difficulté + invalidation cache

**Exemple d’intégration UI:** `apps/mobile/components/header-dropdown-menu.tsx`

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "@/lib/trpc";

const queryClient = useQueryClient();

const setDifficultyMutation = useMutation({
  mutationFn: (difficulty: "EASY" | "NORMAL" | "HARD") =>
    trpcClient.user.setDifficultyPreference.mutate({ difficulty }),
  onSuccess: async () => {
    // Réhydrate le profil
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    // Purge les niveaux précédemment cache (ancienne difficulté)
    await queryClient.invalidateQueries({ queryKey: ["level-summary-for-me"] });
    await queryClient.invalidateQueries({ queryKey: ["home-data"] });
  },
});

// setDifficultyMutation.mutate("HARD")
```

---

## 7) Pattern recommandé (résumé)

- Source de vérité: `User.difficultyPreference` (backend).
- Les endpoints niveau utilisent la session (`ctx.session.user.id`) pour filtrer.
- Les queries mobile incluent la difficulté dans `queryKey`.
- Au switch de difficulté: mutation + invalidation ciblée.
- Pour l’historique de partie: snapshot `GameInstance.difficultyAtStart`.

