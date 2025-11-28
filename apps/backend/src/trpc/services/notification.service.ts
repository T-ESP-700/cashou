import type { Notification, PrismaClient } from "@prisma/client";
import defaultPrisma from "../database.ts";
import type {
  NotificationCreateSchema,
  NotificationUpdateSchema,
} from "../schemas-zod/notification-schema.ts";

export class NotificationService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * 🔹 Récupère toutes les notifications
   * @returns Liste complète des notifications triées par date de création décroissante
   */
  async findAll(): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 🔹 Récupère une notification spécifique par son ID
   * @param id - Identifiant unique de la notification
   */
  async findOne(id: number): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }


  /**
   * 🔹 Récupère toutes les notifications d’un utilisateur donné
   * @param userId - Identifiant de l'utilisateur
   */
  async findByUser(userId: number): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 🔹 Crée une nouvelle notification
   * @param data - Données validées par Zod (NotificationCreateSchema)
   */
  async create(data: NotificationCreateSchema): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        typeId: data.type_id,
        userId: data.user_id,
        isOpened: data.is_open,
        sentAt: data.sent_at,
      }
    });
  }

  /**
   * 🔹 Met à jour une notification existante
   * @param id - ID de la notification à modifier
   * @param data - Champs à mettre à jour (validés par Zod)
   */
  async update(id: number, data: NotificationUpdateSchema["data"]): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data,
    });
  }

  /**
   * 🔹 Supprime une notification
   * @param id - Identifiant de la notification à supprimer
   */
  async delete(id: number): Promise<Notification> {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * 🔹 Marque une notification comme lue (is_open = true)
   * @param id - Identifiant de la notification
   */
  async markedAsRead(id: number): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { isOpened: true },
    });
  }

  /**
   * 🔹 Marque toutes les notifications d’un utilisateur comme lues
   * @param userId - Identifiant de l'utilisateur
   * @returns Nombre de notifications mises à jour
   */
  async markAllAsReadByUser(userId: number): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId: userId, isOpened: false },
      data: { isOpened: true },
    });
    return result.count;
  }

  /**
   * 🔹 Supprime toutes les notifications d’un utilisateur
   * @param userId - Identifiant de l'utilisateur
   * @returns Nombre de notifications supprimées
   */
  async deleteAllByUser(userId: number): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: { userId: userId },
    });
    return result.count;
  }
}
