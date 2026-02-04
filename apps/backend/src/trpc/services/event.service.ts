// Service métier pour la gestion des événements du jeu
// Import depuis @cashou/db-app (et non @prisma/client) car Bun crée des copies séparées
// de @prisma/client par contexte de résolution, ce qui cause des types incompatibles
import type { Event, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type {EventCreateSchema, EventDataSchema} from "../schemas-zod/event-schemas.ts";

export class EventService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tous les événements avec leurs relations
     * @returns Promise<Event[]> - Liste complète des événements triés par titre croissant
     */
    async findAll(): Promise<Event[]> {
        return this.prisma.event.findMany({
            include: {
                // Inclut les niveaux associés à l'événement avec les détails complets
                levelEvents: { include: { level: true } },
                // Inclut les assets associés à l'événement avec les détails complets
                eventAssets: { include: { asset: true } },
                // Inclut les impacts de l'événement avec les détails complets
                impacts: { include: { field: true, submarket: true } }
            },
            orderBy: { title: 'asc' }, // Tri par titre croissant
        });
    }

    /**
     * Récupère un événement spécifique par son ID
     * @param id - Identifiant unique de l'événement
     * @returns Promise<Event | null> - L'événement trouvé ou null si inexistant
     */
    async findOne(id: number): Promise<Event | null> {
        return this.prisma.event.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                levelEvents: { include: { level: true } },
                eventAssets: { include: { asset: true } },
                impacts: { include: { field: true, submarket: true } }
            }
        });
    }

    /**
     * Crée un nouvel événement
     * @param data - Données de l'événement validées par le schéma Zod
     * @returns Promise<Event> - L'événement créé avec son ID généré
     */
    async create(data: EventCreateSchema): Promise<Event> {
        return this.prisma.event.create({ data });
    }

    /**
     * Met à jour un événement existant
     * @param id - Identifiant de l'événement à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Event> - L'événement mis à jour
     */
    async update(id: number, data: EventDataSchema): Promise<Event> {
        return this.prisma.event.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un événement
     * @param id - Identifiant de l'événement à supprimer
     * @returns Promise<Event> - L'événement supprimé (pour confirmation)
     */
    async delete(id: number): Promise<Event> {
        return this.prisma.event.delete({ where: { id } });
    }
}
