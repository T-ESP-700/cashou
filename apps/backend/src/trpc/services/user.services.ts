import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const userService = {
    getAll: async () => {
        return prisma.user.findMany({
            include: {
                level: true, // on inclut la relation
            },
        });
    },

    // 🔥 Récupérer un user par ID
    getById: async (id: number) => {
        return prisma.user.findUnique({
            where: { id },
            include: {
                level: true,
                notifications: true,
            },
        });
    },

    create: async (data: {
        username: string;
        email: string;
        passwordHash: string;
        levelId: number;
    }) => {
        return prisma.user.create({
            data,
        });
    },

    update: async (id: number, data: Partial<{ username: string; email: string; levelId: number; }>) => {
        return prisma.user.update({
            where: { id },
            data,
        });
    },

    delete: async (id: number) => {
        return prisma.user.delete({
            where: { id },
        });
    },
};
