import { describe, test, expect, mock, beforeEach } from "bun:test";
import { EventService } from "../../src/trpc/services/event.service";
import type { Event, PrismaClient } from "@prisma/client";

// Fonction utilitaire pour créer des événements de test
function makeEvent(id: number, over: Partial<Event> = {}): Event {
    const now = new Date();
    return {
        id,
        title: over.title ?? `Event ${id}`,
        description: over.description ?? null,
        hasImpact: over.hasImpact ?? null,
        createdAt: over.createdAt ?? now,
        updatedAt: over.updatedAt ?? now,
    };
}

// Fonction pour créer un mock Prisma avec toutes les méthodes nécessaires
function createMockPrisma() {
    return {
        event: {
            findMany: mock(() => Promise.resolve([])),
            findUnique: mock(() => Promise.resolve(null)),
            create: mock(() => Promise.resolve({})),
            update: mock(() => Promise.resolve({})),
            delete: mock(() => Promise.resolve({})),
        }
    } as unknown as PrismaClient;
}

describe("EventService", () => {
    let eventService: EventService;
    let mockPrisma: PrismaClient;

    beforeEach(() => {
        mockPrisma = createMockPrisma();
        eventService = new EventService(mockPrisma);
    });

    describe("findAll", () => {
        test("doit récupérer tous les événements avec leurs relations", async () => {
            // Arrange
            const mockEvents = [makeEvent(1), makeEvent(2)];
            (mockPrisma.event.findMany as ReturnType<typeof mock>).mockResolvedValue(mockEvents);

            // Act
            const result = await eventService.findAll();

            // Assert
            expect(result).toEqual(mockEvents);
            expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
                include: {
                    levelEvents: { include: { level: true } },
                    eventAssets: { include: { asset: true } },
                    impacts: { include: { field: true, submarket: true } }
                },
                orderBy: { title: 'asc' },
            });
        });
    });

    describe("findOne", () => {
        test("doit récupérer un événement par son ID", async () => {
            // Arrange
            const mockEvent = makeEvent(1);
            (mockPrisma.event.findUnique as ReturnType<typeof mock>).mockResolvedValue(mockEvent);

            // Act
            const result = await eventService.findOne(1);

            // Assert
            expect(result).toEqual(mockEvent);
            expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
                include: {
                    levelEvents: { include: { level: true } },
                    eventAssets: { include: { asset: true } },
                    impacts: { include: { field: true, submarket: true } }
                }
            });
        });

        test("doit retourner null si l'événement n'existe pas", async () => {
            // Arrange
            (mockPrisma.event.findUnique as ReturnType<typeof mock>).mockResolvedValue(null);

            // Act
            const result = await eventService.findOne(999);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe("create", () => {
        test("doit créer un nouvel événement", async () => {
            // Arrange
            const eventData = { title: "Nouvel événement", description: "Description test", hasImpact: true };
            const createdEvent = makeEvent(1, eventData);
            (mockPrisma.event.create as ReturnType<typeof mock>).mockResolvedValue(createdEvent);

            // Act
            const result = await eventService.create(eventData);

            // Assert
            expect(result).toEqual(createdEvent);
            expect(mockPrisma.event.create).toHaveBeenCalledWith({ data: eventData });
        });
    });

    describe("update", () => {
        test("doit mettre à jour un événement existant", async () => {
            // Arrange
            const eventData = { title: "Événement modifié", description: "Nouvelle description", hasImpact: false };
            const updatedEvent = makeEvent(1, eventData);
            (mockPrisma.event.update as ReturnType<typeof mock>).mockResolvedValue(updatedEvent);

            // Act
            const result = await eventService.update(1, eventData);

            // Assert
            expect(result).toEqual(updatedEvent);
            expect(mockPrisma.event.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: eventData
            });
        });
    });

    describe("delete", () => {
        test("doit supprimer un événement", async () => {
            // Arrange
            const deletedEvent = makeEvent(1);
            (mockPrisma.event.delete as ReturnType<typeof mock>).mockResolvedValue(deletedEvent);

            // Act
            const result = await eventService.delete(1);

            // Assert
            expect(result).toEqual(deletedEvent);
            expect(mockPrisma.event.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });
    });
});
