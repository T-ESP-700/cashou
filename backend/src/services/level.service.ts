import type { Level } from "@prisma/client";
import prisma from "../database";
import type {LevelCreateSchema, LevelDataSchema} from "../schemas-zod/level-schema.ts";

export class LevelService {

    async findAll(): Promise<Level[]> {
        return prisma.level.findMany({
            include: {
                levelGoals: { include: { goal: true } },
                levelEvents: { include: { event: true } }
            },
            orderBy: { number: 'asc' },
        });
    }

    async findOne(id: number): Promise<Level | null> {
        return prisma.level.findUnique({
            where: { id },
            include: {
                levelGoals: { include: { goal: true } },
                levelEvents: { include: { event: true } }
            }
        });
    }

    async create(data: LevelCreateSchema): Promise<Level> {
        return prisma.level.create({ data });
    }

    async update(id: number, data: LevelDataSchema): Promise<Level> {
        return prisma.level.update({
            where: { id },
            data
        });
    }

    async delete(id: number): Promise<Level> {
        return prisma.level.delete({ where: { id } });
    }
}