import { PrismaClient } from '@prisma/client';
import defaultPrisma from "../database.ts";
import {
  GameUserCreateSchema,
  GameUserUpdateSchema,
  GameUserDataSchema,
  GameUserSearchByUserSchema,
  GameUserSearchByGameInstanceSchema,
  GameUserSearchByStatusSchema,
  GameUserStatusUpdateSchema,
  GameUserSearchByCreatorSchema,
} from '../schemas-zod/game_user-schema';

export class GameUserService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  async create(data: GameUserCreateSchema) {
    const parsed = GameUserCreateSchema.parse(data);
    return this.prisma.gameUser.create({ data: parsed });
  }

  async update(id: number, data: GameUserUpdateSchema) {
    const parsed = GameUserUpdateSchema.parse(data);
    console.log(parsed);
    return this.prisma.gameUser.update({ where: { id }, data: parsed });
  }

  async findAll() {
    return this.prisma.gameUser.findMany();
  }

  async findById(id: number) {
    const result = await this.prisma.gameUser.findUnique({ where: { id } });
    return { 
      message: `Recherche par id de game user`,
      result
    };
  }

  async findByUser(data: GameUserSearchByUserSchema) {
    const parsed = GameUserSearchByUserSchema.parse(data);
    const result = await this.prisma.gameUser.findMany({ where: { userId: parsed.userId } });
    return { 
      message: `Recherche par id utilisateur`,
      result
    };
  }

  async findByGameInstance(data: GameUserSearchByGameInstanceSchema) {
    const parsed = GameUserSearchByGameInstanceSchema.parse(data);
    const result = await this.prisma.gameUser.findMany({ where: { gameInstanceId: parsed.gameInstanceId } });
    return { 
      message: `Recherche par instance de jeu`,
      result
    };
  }

  async findByStatus(data: GameUserSearchByStatusSchema) {
    const parsed = GameUserSearchByStatusSchema.parse(data);
    const result = await this.prisma.gameUser.findMany({ where: { status: parsed.status } });
    return { 
      message: `Recherche par status`,
      result
    };
  }

  async findByCreator(data: GameUserSearchByCreatorSchema) {
    const parsed = GameUserSearchByCreatorSchema.parse(data);
    const result = await this.prisma.gameUser.findMany({ where: { isCreator: parsed.isCreator } });
    return { 
      message: `Recherche par créateur`,
      result
    };
  }

  async updateStatus(id: number, data: GameUserStatusUpdateSchema) {
    const parsed = GameUserStatusUpdateSchema.parse(data);
    await this.prisma.gameUser.update({ where: { id }, data: { status: parsed.status } });
    return { 
      message: `L'état de l'utilisateur avec l'id ${id} a été mis à jour avec succès.` };
  }

  async delete(id: number) {
    await this.prisma.gameUser.delete({ where: { id } });
    return { message: `L'entrée avec l'id ${id} a été supprimée avec succès.` };
  }

}
