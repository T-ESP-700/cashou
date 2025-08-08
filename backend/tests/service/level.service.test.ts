import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { Level, PrismaClient } from '@prisma/client';
import { LevelService } from "../../src/services/level.service.ts";
import type { LevelCreateSchema, LevelDataSchema } from "../../src/schemas-zod/level-schema.ts";

// Mock Prisma complet pour tous les tests
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

    it('devrait gérer les champs optionnels undefined', async () => {
      const levelData: LevelCreateSchema = {
        title: 'Test Optionnel',
        number: 5,
        // Autres champs omis (undefined)
      };

      const createdLevel: Level = {
        id: 5,
        title: 'Test Optionnel',
        number: 5,
        duration: null,
        speed: null,
        startBalance: null,
        pointsRequired: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Level;

      (mockPrisma.level.create as any).mockResolvedValue(createdLevel);

      const result = await levelService.create(levelData);

      expect(result.title).toBe('Test Optionnel');
      expect(result.number).toBe(5);
      expect(result.duration).toBeNull();
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

    it('devrait gérer les mises à jour partielles', async () => {
      const updateData: LevelDataSchema = {
        title: 'Titre Seul'
        // Seul le titre est modifié
      };

      const updatedLevel: Level = {
        id: 2,
        title: 'Titre Seul',
        number: 1,
        duration: 60,
        speed: 1,
        startBalance: 1000,
        pointsRequired: 100,
        description: 'Description originale',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Level;

      (mockPrisma.level.update as any).mockResolvedValue(updatedLevel);

      const result = await levelService.update(2, updateData);

      expect(result.title).toBe('Titre Seul');
      expect(mockPrisma.level.update).toHaveBeenCalledWith({
        where: { id: 2 },
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

  describe('Scénarios complexes', () => {
    it('devrait effectuer un cycle CRUD complet (simulé)', async () => {
      const createData: LevelCreateSchema = {
        title: 'Niveau Complet',
        number: 10,
        duration: 300,
        speed: 5,
        startBalance: 5000,
        pointsRequired: 500,
        description: 'Niveau de test complet'
      };

      // CREATE
      const createdLevel: Level = {
        id: 10,
        ...createData,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Level;

      (mockPrisma.level.create as any).mockResolvedValue(createdLevel);
      const createResult = await levelService.create(createData);
      expect(createResult.title).toBe('Niveau Complet');

      // READ
      (mockPrisma.level.findUnique as any).mockResolvedValue(createdLevel);
      const readResult = await levelService.findOne(10);
      expect(readResult?.title).toBe('Niveau Complet');

      // UPDATE
      const updateData: LevelDataSchema = { title: 'Niveau Modifié' };
      const updatedLevel = { ...createdLevel, title: 'Niveau Modifié' };
      (mockPrisma.level.update as any).mockResolvedValue(updatedLevel);
      const updateResult = await levelService.update(10, updateData);
      expect(updateResult.title).toBe('Niveau Modifié');

      // DELETE
      (mockPrisma.level.delete as any).mockResolvedValue(updatedLevel);
      const deleteResult = await levelService.delete(10);
      expect(deleteResult.id).toBe(10);

      // Vérification des appels
      expect(mockPrisma.level.create).toHaveBeenCalledWith({ data: createData });
      expect(mockPrisma.level.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
        include: {
          levelGoals: { include: { goal: true } },
          levelEvents: { include: { event: true } }
        }
      });
      expect(mockPrisma.level.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: updateData
      });
      expect(mockPrisma.level.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    });
  });
});

// Tests de régression
describe('LevelService - Tests de Régression', () => {
  let levelService: LevelService;

  beforeEach(() => {
    levelService = new LevelService(mockPrisma);

    // Reset tous les mocks
    (mockPrisma.level.findMany as any).mockClear();
    (mockPrisma.level.findUnique as any).mockClear();
    (mockPrisma.level.create as any).mockClear();
    (mockPrisma.level.update as any).mockClear();
    (mockPrisma.level.delete as any).mockClear();
  });

  describe('Cohérence des includes', () => {
    it('devrait utiliser la même structure d\'include pour findAll et findOne', async () => {
      const expectedInclude = {
        levelGoals: { include: { goal: true } },
        levelEvents: { include: { event: true } }
      };

      (mockPrisma.level.findMany as any).mockResolvedValue([]);
      (mockPrisma.level.findUnique as any).mockResolvedValue(null);

      await levelService.findAll();
      await levelService.findOne(1);

      expect(mockPrisma.level.findMany).toHaveBeenCalledWith({
        include: expectedInclude,
        orderBy: { number: 'asc' }
      });

      expect(mockPrisma.level.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expectedInclude
      });
    });
  });

  describe('Gestion des types optionnels', () => {
    it('devrait accepter les données avec des champs undefined', async () => {
      const mockLevel: Level = {
        id: 1,
        title: 'Test',
        number: 1,
        duration: null,
        speed: null,
        startBalance: null,
        pointsRequired: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Level;

      (mockPrisma.level.create as any).mockResolvedValue(mockLevel);

      const createData: LevelCreateSchema = {
        title: 'Test',
        number: 1
      };

      const result = await levelService.create(createData);

      expect(result).toEqual(mockLevel);
      expect(mockPrisma.level.create).toHaveBeenCalledWith({ data: createData });
    });
  });
});