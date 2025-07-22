// src/services/level.service.ts
import { PrismaClient } from "@prisma/client";
import type { Level } from "@prisma/client";
import prisma from "../database";

export type LevelCreateInput = {
    title?: string;
    number?: number;
    duration?: number;
    speed?: number;
    startBalance?: number;
    pointsRequired?: number;
    description?: string;
};

export type LevelUpdateInput = Partial<LevelCreateInput>;

export class LevelService {
    async findAll() {
        return prisma.level.findMany({
            include: {
                levelGoals: { include: { goal: true } },
                levelEvents: { include: { event: true } }
            },
            orderBy: { number: 'asc' },
        });
    }

    async findOne(id: number) {
        return prisma.level.findUnique({
            where: { id },
            include: {
                levelGoals: { include: { goal: true } },
                levelEvents: { include: { event: true } }
            }
        });
    }

    async create(data: LevelCreateInput) {
        return prisma.level.create({ data });
    }

    async update(id: number, data: LevelUpdateInput) {
        return prisma.level.update({
            where: { id },
            data
        });
    }

    async delete(id: number) {
        return prisma.level.delete({ where: { id } });
    }
}