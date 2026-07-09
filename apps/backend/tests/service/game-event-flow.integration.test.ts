/**
 * Tests d'intégration pour Game Event Flow
 * 
 * Workflow complet : scheduling → déclenchement → pause → notification → reprise
 * 
 * Services testés :
 * - GameInstanceEventService (scheduling)
 * - GameEventProcessorService (déclenchement + pause)
 * - GameEventTriggerService (reprise)
 */

import { describe, it, expect, beforeEach, afterAll, mock } from "bun:test";
import prisma from "../../src/database";
import { GameInstanceEventService } from "../../src/trpc/services/game-instance-event.service";
import { GameEventProcessorService } from "../../src/trpc/services/game-event-processor.service";
import { GameEventTriggerService } from "../../src/trpc/services/game-event-trigger.service";
import { IntegrationTestFactory } from "../helpers/integration-test-factory";
import { setupTestDatabase } from "../helpers/integration-test-setup";

// Mock Expo push service pour éviter les appels externes
mock.module("../../src/trpc/services/expo-push.service", () => ({
  ExpoPushService: class {
    async sendPushNotification() {
      return { success: true };
    }
  },
}));

// Mock job queue pour éviter les jobs réels
mock.module("../../src/lib/job-queue", () => ({
  scheduleGameEvent: mock(() => Promise.resolve()),
  cancelGameEvent: mock(() => Promise.resolve()),
  scheduleGameEnd: mock(() => Promise.resolve()),
}));

const shouldRun = !!process.env.CASHOU_DB_URL;

(shouldRun ? describe : describe.skip)("Game Event Flow — Tests d'intégration", () => {
  setupTestDatabase();

  const factory = new IntegrationTestFactory(prisma);
  const gameInstanceEventService = new GameInstanceEventService(prisma);
  const gameEventProcessorService = new GameEventProcessorService(prisma);
  const gameEventTriggerService = new GameEventTriggerService(prisma);

  beforeEach(async () => {
    await factory.cleanup();
  });

  afterAll(async () => {
    await factory.cleanup();
  });

  describe("Workflow complet : scheduling → trigger → pause → resume", () => {
    it("cycle complet avec 1 événement", async () => {
      // 1. SETUP : Créer une partie avec 1 événement
      const level = await factory.createLevel({
        duration: 30, // 30 jours
        speed: 86400, // 1 jour de jeu = 1 seconde réelle (pour tests rapides)
      });

      const event = await factory.createEvent({
        title: "Crise économique",
        description: "Les marchés s'effondrent",
      });

      const levelEvent = await factory.createLevelEvent({
        levelId: level.id,
        eventId: event.id,
        triggerPercent: 50, // À 50% du jeu (15 jours)
        position: 1,
      });

      const user = await factory.createUser({
        levelId: level.id,
        expoPushToken: "ExponentPushToken[test123]",
      });

      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
      });

      // 2. SCHEDULING : Programmer les événements
      await gameInstanceEventService.scheduleEventsForGameInstance(gameInstance.id);

      // Vérifier qu'un GameInstanceEvent a été créé
      const scheduledEvents = await prisma.gameInstanceEvent.findMany({
        where: { gameInstanceId: gameInstance.id },
      });

      expect(scheduledEvents).toHaveLength(1);
      expect(scheduledEvents[0].levelEventId).toBe(levelEvent.id);
      expect(scheduledEvents[0].triggeredAt).toBeNull();
      expect(scheduledEvents[0].scheduledAt).toBeInstanceOf(Date);

      // 3. DÉCLENCHEMENT : Traiter l'événement
      const gameInstanceEventId = scheduledEvents[0].id;
      const processResult = await gameEventProcessorService.processEvent(gameInstanceEventId);

      expect(processResult.success).toBeTrue();

      // Vérifications après déclenchement :
      // a) GameInstanceEvent marqué comme déclenché
      const triggeredEvent = await prisma.gameInstanceEvent.findUnique({
        where: { id: gameInstanceEventId },
      });
      expect(triggeredEvent?.triggeredAt).not.toBeNull();
      expect(triggeredEvent?.triggeredAt).toBeInstanceOf(Date);

      // b) GameInstance mis en pause
      const pausedGame = await prisma.gameInstance.findUnique({
        where: { id: gameInstance.id },
      });
      expect(pausedGame?.isPaused).toBeTrue();
      expect(pausedGame?.actionRequired).toBeTrue();
      expect(pausedGame?.pausedAt).toBeInstanceOf(Date);

      // c) Notification créée
      const notification = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: "EVENT",
          eventId: event.id,
        },
      });
      expect(notification).toBeDefined();
      expect(notification?.title).toContain("Crise économique");
      expect(notification?.message).toContain("Les marchés s'effondrent");
      expect(notification?.isOpened).toBeFalse();
      expect(notification?.gameInstanceId).toBe(gameInstance.id);

      // 4. REPRISE : L'utilisateur termine l'événement
      // Attendre au moins 1 seconde pour que pauseDuration > 0 (calcul en secondes avec Math.floor)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await gameEventTriggerService.completeEvent(gameInstance.id);

      // Vérifications après reprise :
      // a) GameInstance n'est plus en pause
      const resumedGame = await prisma.gameInstance.findUnique({
        where: { id: gameInstance.id },
      });
      expect(resumedGame?.isPaused).toBeFalse();
      expect(resumedGame?.actionRequired).toBeFalse();
      expect(resumedGame?.pausedAt).toBeNull();
      expect(resumedGame?.currentEventIndex).toBe(1); // Incrémenté
      expect(resumedGame?.totalPausedDuration).toBeGreaterThan(0); // Temps de pause enregistré
    });

    it("événements multiples déclenchés dans l'ordre", async () => {
      // Setup : 3 événements à différents moments
      const level = await factory.createLevel({
        duration: 30,
        speed: 86400,
      });

      const event1 = await factory.createEvent({ title: "Événement 1" });
      const event2 = await factory.createEvent({ title: "Événement 2" });
      const event3 = await factory.createEvent({ title: "Événement 3" });

      await factory.createLevelEvent({
        levelId: level.id,
        eventId: event1.id,
        triggerPercent: 25,
        position: 1,
      });

      await factory.createLevelEvent({
        levelId: level.id,
        eventId: event2.id,
        triggerPercent: 50,
        position: 2,
      });

      await factory.createLevelEvent({
        levelId: level.id,
        eventId: event3.id,
        triggerPercent: 75,
        position: 3,
      });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
      });

      // Scheduler tous les événements
      await gameInstanceEventService.scheduleEventsForGameInstance(gameInstance.id);

      const scheduledEvents = await prisma.gameInstanceEvent.findMany({
        where: { gameInstanceId: gameInstance.id },
        orderBy: { scheduledAt: "asc" },
      });

      expect(scheduledEvents).toHaveLength(3);

      // Vérifier que les événements sont ordonnés chronologiquement
      expect(scheduledEvents[0].scheduledAt.getTime()).toBeLessThan(
        scheduledEvents[1].scheduledAt.getTime()
      );
      expect(scheduledEvents[1].scheduledAt.getTime()).toBeLessThan(
        scheduledEvents[2].scheduledAt.getTime()
      );

      // Déclencher le premier événement
      await gameEventProcessorService.processEvent(scheduledEvents[0].id);
      await gameEventTriggerService.completeEvent(gameInstance.id);

      // Vérifier l'index
      const game1 = await prisma.gameInstance.findUnique({
        where: { id: gameInstance.id },
      });
      expect(game1?.currentEventIndex).toBe(1);

      // Déclencher le deuxième événement
      await gameEventProcessorService.processEvent(scheduledEvents[1].id);
      await gameEventTriggerService.completeEvent(gameInstance.id);

      const game2 = await prisma.gameInstance.findUnique({
        where: { id: gameInstance.id },
      });
      expect(game2?.currentEventIndex).toBe(2);
    });

    it("shift des événements futurs après pause", async () => {
      // Setup : 2 événements
      const level = await factory.createLevel({
        duration: 30,
        speed: 86400,
      });

      const event1 = await factory.createEvent({ title: "Événement 1" });
      const event2 = await factory.createEvent({ title: "Événement 2" });

      await factory.createLevelEvent({
        levelId: level.id,
        eventId: event1.id,
        triggerPercent: 25,
        position: 1,
      });

      await factory.createLevelEvent({
        levelId: level.id,
        eventId: event2.id,
        triggerPercent: 75,
        position: 2,
      });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
      });

      await gameInstanceEventService.scheduleEventsForGameInstance(gameInstance.id);

      const scheduledEvents = await prisma.gameInstanceEvent.findMany({
        where: { gameInstanceId: gameInstance.id },
        orderBy: { scheduledAt: "asc" },
      });

      // Mémoriser la date du 2ème événement
      const originalScheduledAt2 = scheduledEvents[1].scheduledAt;

      // Déclencher le 1er événement
      await gameEventProcessorService.processEvent(scheduledEvents[0].id);

      // Attendre pour accumuler du temps de pause (au moins 1 seconde)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Reprendre
      await gameEventTriggerService.completeEvent(gameInstance.id);

      // Vérifier que le 2ème événement a été décalé
      const event2AfterPause = await prisma.gameInstanceEvent.findUnique({
        where: { id: scheduledEvents[1].id },
      });

      // Le scheduledAt devrait être plus tard qu'avant
      expect(event2AfterPause?.scheduledAt.getTime()).toBeGreaterThan(
        originalScheduledAt2.getTime()
      );

      // La différence devrait correspondre au temps de pause
      const game = await prisma.gameInstance.findUnique({
        where: { id: gameInstance.id },
      });
      const pauseDuration = game?.totalPausedDuration ?? 0;

      const shiftAmount =
        event2AfterPause!.scheduledAt.getTime() - originalScheduledAt2.getTime();
      
      // Le shift devrait être proche du temps de pause (avec marge pour l'arrondissement)
      expect(shiftAmount).toBeGreaterThanOrEqual(pauseDuration * 1000 - 100);
      expect(shiftAmount).toBeLessThanOrEqual(pauseDuration * 1000 + 100);
    });
  });

  describe("Validations et cas d'erreur", () => {
    it("processEvent → rejette si événement introuvable", async () => {
      const result = await gameEventProcessorService.processEvent(999999);
      expect(result.success).toBeFalse();
      expect(result.reason).toBe("Event not found");
    });

    it("processEvent → rejette si événement déjà déclenché", async () => {
      // Setup
      const level = await factory.createLevel({});
      const event = await factory.createEvent({});
      await factory.createLevelEvent({
        levelId: level.id,
        eventId: event.id,
        triggerPercent: 50,
        position: 1,
      });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
      });

      await gameInstanceEventService.scheduleEventsForGameInstance(gameInstance.id);

      const scheduledEvent = await prisma.gameInstanceEvent.findFirst({
        where: { gameInstanceId: gameInstance.id },
      });

      // Déclencher une première fois
      await gameEventProcessorService.processEvent(scheduledEvent!.id);

      // Essayer de déclencher à nouveau
      const result = await gameEventProcessorService.processEvent(scheduledEvent!.id);
      expect(result.success).toBeFalse();
      expect(result.reason).toBe("Event already triggered");
    });

    it("processEvent → rejette si la partie est terminée", async () => {
      // Setup
      const level = await factory.createLevel({});
      const event = await factory.createEvent({});
      await factory.createLevelEvent({
        levelId: level.id,
        eventId: event.id,
        triggerPercent: 50,
        position: 1,
      });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        isEnded: true, // Partie terminée
      });

      await gameInstanceEventService.scheduleEventsForGameInstance(gameInstance.id);

      const scheduledEvent = await prisma.gameInstanceEvent.findFirst({
        where: { gameInstanceId: gameInstance.id },
      });

      const result = await gameEventProcessorService.processEvent(scheduledEvent!.id);
      expect(result.success).toBeFalse();
      expect(result.reason).toBe("Game has ended");
    });

    it("processEvent → rejette si un autre événement est en cours", async () => {
      // Setup avec 2 événements
      const level = await factory.createLevel({});
      const event1 = await factory.createEvent({});
      const event2 = await factory.createEvent({});
      
      await factory.createLevelEvent({
        levelId: level.id,
        eventId: event1.id,
        triggerPercent: 25,
        position: 1,
      });
      
      await factory.createLevelEvent({
        levelId: level.id,
        eventId: event2.id,
        triggerPercent: 75,
        position: 2,
      });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
      });

      await gameInstanceEventService.scheduleEventsForGameInstance(gameInstance.id);

      const scheduledEvents = await prisma.gameInstanceEvent.findMany({
        where: { gameInstanceId: gameInstance.id },
        orderBy: { scheduledAt: "asc" },
      });

      // Déclencher le 1er événement (sans le terminer)
      await gameEventProcessorService.processEvent(scheduledEvents[0].id);

      // Essayer de déclencher le 2ème événement alors que le 1er est en cours
      const result = await gameEventProcessorService.processEvent(scheduledEvents[1].id);
      expect(result.success).toBeFalse();
      expect(result.reason).toBe("Game already has pending action");
    });

    it("scheduleEventsForGameInstance → ne schedule rien si level sans événements", async () => {
      const level = await factory.createLevel({}); // Pas d'événements
      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
      });

      // Ne devrait pas crash
      await gameInstanceEventService.scheduleEventsForGameInstance(gameInstance.id);

      const scheduledEvents = await prisma.gameInstanceEvent.findMany({
        where: { gameInstanceId: gameInstance.id },
      });

      expect(scheduledEvents).toHaveLength(0);
    });
  });

  describe("Calculs temporels", () => {
    it("calcule correctement le délai avec différentes vitesses", async () => {
      // Vitesse 1x : 30 jours de jeu = 30 jours réels
      // Événement à 50% = 15 jours = 15 * 86400 = 1296000 secondes
      const level1 = await factory.createLevel({
        duration: 30,
        speed: 1,
      });

      const event1 = await factory.createEvent({});
      await factory.createLevelEvent({
        levelId: level1.id,
        eventId: event1.id,
        triggerPercent: 50,
        position: 1,
      });

      const user1 = await factory.createUser({ levelId: level1.id });
      const gameInstance1 = await factory.createGameInstance({
        userId: user1.id,
        levelId: level1.id,
      });

      await gameInstanceEventService.scheduleEventsForGameInstance(gameInstance1.id);

      const scheduled1 = await prisma.gameInstanceEvent.findFirst({
        where: { gameInstanceId: gameInstance1.id },
      });

      const delay1 =
        scheduled1!.scheduledAt.getTime() - new Date(gameInstance1.createdAt).getTime();
      const expectedDelay1 = 15 * 86400 * 1000; // 15 jours en ms

      expect(delay1).toBeCloseTo(expectedDelay1, -2); // Tolérance de 100ms

      // Vitesse 86400x : 30 jours de jeu = 30 secondes réelles
      // Événement à 50% = 15 jours = 15 secondes
      const level2 = await factory.createLevel({
        duration: 30,
        speed: 86400,
      });

      const event2 = await factory.createEvent({});
      await factory.createLevelEvent({
        levelId: level2.id,
        eventId: event2.id,
        triggerPercent: 50,
        position: 1,
      });

      const user2 = await factory.createUser({ levelId: level2.id });
      const gameInstance2 = await factory.createGameInstance({
        userId: user2.id,
        levelId: level2.id,
      });

      await gameInstanceEventService.scheduleEventsForGameInstance(gameInstance2.id);

      const scheduled2 = await prisma.gameInstanceEvent.findFirst({
        where: { gameInstanceId: gameInstance2.id },
      });

      const delay2 =
        scheduled2!.scheduledAt.getTime() - new Date(gameInstance2.createdAt).getTime();
      const expectedDelay2 = 15 * 1000; // 15 secondes en ms

      expect(delay2).toBeCloseTo(expectedDelay2, -2); // Tolérance de 100ms
    });
  });
});
