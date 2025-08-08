import { describe, it, expect, beforeEach, beforeAll, afterAll, mock } from 'bun:test';
import type { Level, PrismaClient } from '@prisma/client';
import { LevelService } from "../../src/services/level.service.ts";
import type { LevelCreateSchema, LevelDataSchema } from "../../src/schemas-zod/level-schema.ts";

// Mock Prisma complet pour les tests unitaires
const mockPrisma = {
  level: {
    findMany: mock(),
    findUnique: mock(),
    create: mock(),
    update: mock(),
    delete: mock(),
  },
  $disconnect: mock()
} as unknown as PrismaClient;

describe('LevelService - Tests Unitaires', () => {
  let levelService: LevelService;

  beforeEach(() => {
    // Injection du mock Prisma dans le service
    levelService = new LevelService(mockPrisma);

    // Reset tous les mocks
    (mockPrisma.level.findMany as any).mockClear();
    (mockPrisma.level.findUnique as any).mockClear();
    (mockPrisma.level.create as any).mockClear();
    (mockPrisma.level.update as any).mockClear();
    (mockPrisma.level.delete as any).mockClear();
  });

  describe('findAll', () => {
    it('devrait retourner tous les niveaux triés par numéro croissant', async () => {
      const mockLevels: Level[] = [
        {
          id: 1,
          title: 'Niveau 1',
          number: 1,
          duration: 60,
          speed: 1,
          startBalance: 1000,
          pointsRequired: 100,
          description: 'Premier niveau',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Level,
        {
          id: 2,
          title: 'Niveau 2',
          number: 2,
          duration: 90,
          speed: 2,
          startBalance: 1500,
          pointsRequired: 200,
          description: 'Deuxième niveau',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Level
      ];

      (mockPrisma.level.findMany as any).mockResolvedValue(mockLevels);

      const result = await levelService.findAll();

      expect(result).toEqual(mockLevels);
      expect(mockPrisma.level.findMany).toHaveBeenCalledWith({
        include: {
          levelGoals: { include: { goal: true } },
          levelEvents: { include: { event: true } }
        },
        orderBy: { number: 'asc' }
      });
    });

    it('devrait retourner un tableau vide si aucun niveau n\'existe', async () => {
      (mockPrisma.level.findMany as any).mockResolvedValue([]);

      const result = await levelService.findAll();

      expect(result).toEqual([]);
      expect(mockPrisma.level.findMany).toHaveBeenCalledTimes(1);
    });

    it('devrait propager les erreurs de base de données', async () => {
      const dbError = new Error('Erreur de connexion à la base de données');
      (mockPrisma.level.findMany as any).mockRejectedValue(dbError);

      await expect(levelService.findAll()).rejects.toThrow('Erreur de connexion à la base de données');
    });
  });

  describe('findOne', () => {
    it('devrait retourner un niveau spécifique par son ID', async () => {
      const mockLevel: Level = {
        id: 1,
        title: 'Niveau Test',
        number: 1,
        duration: 60,
        speed: 1,
        startBalance: 1000,
        pointsRequired: 100,
        description: 'Niveau de test',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Level;

      (mockPrisma.level.findUnique as any).mockResolvedValue(mockLevel);

      const result = await levelService.findOne(1);

      expect(result).toEqual(mockLevel);
      expect(mockPrisma.level.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          levelGoals: { include: { goal: true } },
          levelEvents: { include: { event: true } }
        }
      });
    });

    it('devrait retourner null si le niveau n\'existe pas', async () => {
      (mockPrisma.level.findUnique as any).mockResolvedValue(null);

      const result = await levelService.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('devrait créer un nouveau niveau avec des données valides', async () => {
      const levelData: LevelCreateSchema = {
        title: 'Nouveau Niveau',
        number: 3,
        duration: 120,
        speed: 3,
        startBalance: 2000,
        pointsRequired: 300,
        description: 'Nouveau niveau créé'
      };

      const createdLevel: Level = {
        id: 3,
        ...levelData,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Level;

      (mockPrisma.level.create as any).mockResolvedValue(createdLevel);

      const result = await levelService.create(levelData);

      expect(result).toEqual(createdLevel);
      expect(mockPrisma.level.create).toHaveBeenCalledWith({ data: levelData });
    });
  });

  describe('update', () => {
    it('devrait mettre à jour un niveau existant', async () => {
      const updateData: LevelDataSchema = {
        title: 'Niveau Mis à Jour',
        duration: 150,
        pointsRequired: 250
      };

      const updatedLevel: Level = {
        id: 1,
        title: 'Niveau Mis à Jour',
        number: 1,
        duration: 150,
        speed: 1,
        startBalance: 1000,
        pointsRequired: 250,
        description: 'Niveau original',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Level;

      (mockPrisma.level.update as any).mockResolvedValue(updatedLevel);

      const result = await levelService.update(1, updateData);

      expect(result).toEqual(updatedLevel);
      expect(mockPrisma.level.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData
      });
    });
  });

  describe('delete', () => {
    it('devrait supprimer un niveau existant', async () => {
      const deletedLevel: Level = {
        id: 1,
        title: 'Niveau à Supprimer',
        number: 1,
        duration: 60,
        speed: 1,
        startBalance: 1000,
        pointsRequired: 100,
        description: 'Niveau qui sera supprimé',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Level;

      (mockPrisma.level.delete as any).mockResolvedValue(deletedLevel);

      const result = await levelService.delete(1);

      expect(result).toEqual(deletedLevel);
      expect(mockPrisma.level.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});

// Tests d'intégration avec vraie base PostgreSQL
describe('LevelService - Tests d\'Intégration', () => {
  let levelService: LevelService;
  let testLevelIds: number[] = [];

  beforeAll(async () => {
    levelService = new LevelService();

    try {
      const allLevels = await levelService.findAll();
      for (const level of allLevels) {
        if (level.number && level.number > 50) {
          await levelService.delete(level.id);
        }
      }
    } catch (error) {
      console.warn('Erreur lors du nettoyage initial:', error);
    }
  });

  afterAll(async () => {
    for (const id of testLevelIds) {
      try {
        await levelService.delete(id);
      } catch (error) {
        console.warn(`Erreur nettoyage niveau ${id}:`, error);
      }
    }
  });

  beforeEach(() => {
    testLevelIds = [];
  });

  it('devrait effectuer un cycle CRUD complet', async () => {
    const uniqueNumber = Math.floor(Math.random() * 1000) + 1000;
    const createData: LevelCreateSchema = {
      title: 'Niveau d\'Intégration',
      number: uniqueNumber,
      duration: 300,
      speed: 5,
      startBalance: 5000,
      pointsRequired: 500,
      description: 'Niveau pour tests d\'intégration'
    };

    const createdLevel = await levelService.create(createData);
    testLevelIds.push(createdLevel.id);

    expect(createdLevel.id).toBeDefined();
    expect(createdLevel.title).toBe('Niveau d\'Intégration');
    expect(createdLevel.number).toBe(uniqueNumber);

    // READ
    const foundLevel = await levelService.findOne(createdLevel.id);
    expect(foundLevel).not.toBeNull();
    expect(foundLevel!.title).toBe('Niveau d\'Intégration');
    expect(foundLevel!.number).toBe(uniqueNumber);

    // UPDATE
    const updateData: LevelDataSchema = {
      title: 'Niveau Modifié',
      duration: 400
    };

    const updatedLevel = await levelService.update(createdLevel.id, updateData);
    expect(updatedLevel.title).toBe('Niveau Modifié');
    expect(updatedLevel.duration).toBe(400);
    expect(updatedLevel.number).toBe(uniqueNumber);

    // DELETE
    const deletedLevel = await levelService.delete(createdLevel.id);
    expect(deletedLevel.id).toBe(createdLevel.id);

    // Vérification suppression
    const notFoundLevel = await levelService.findOne(createdLevel.id);
    expect(notFoundLevel).toBeNull();

    testLevelIds = testLevelIds.filter(id => id !== createdLevel.id);
  });

  it('devrait gérer correctement les champs optionnels undefined', async () => {
    const uniqueNumber = Math.floor(Math.random() * 1000) + 2000;
    const createDataWithOptional: LevelCreateSchema = {
      title: 'Test Optionnel',
      number: uniqueNumber,
    };

    const createdLevel = await levelService.create(createDataWithOptional);
    testLevelIds.push(createdLevel.id);

    expect(createdLevel.id).toBeDefined();
    expect(createdLevel.title).toBe('Test Optionnel');
    expect(createdLevel.number).toBe(uniqueNumber);
  });

  it('devrait créer des niveaux sans interférer avec d\'autres tests', async () => {
    const uniqueNumber = Math.floor(Math.random() * 1000) + 3000;
    const createData: LevelCreateSchema = {
      title: 'Test Isolation',
      number: uniqueNumber,
      duration: 120
    };

    const createdLevel = await levelService.create(createData);
    testLevelIds.push(createdLevel.id);

    expect(createdLevel.title).toBe('Test Isolation');
    expect(createdLevel.number).toBe(uniqueNumber);

    const foundLevel = await levelService.findOne(createdLevel.id);
    expect(foundLevel).not.toBeNull();
    expect(foundLevel!.title).toBe('Test Isolation');
  });
});