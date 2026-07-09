// Service métier pour la gestion des actifs du jeu
// Couche d'abstraction entre les routers et la base de données
import type { Asset, GameInstance, Level, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type {AssetCreateSchema, AssetDataSchema} from "../schemas-zod/asset-schema.ts";
import { GameTimeService } from "./game-time.service.ts";

type GameInstanceWithLevel = GameInstance & {
    level: Level | null;
};

export interface AssetUnlockInfo {
    available: boolean;
    unlockGameDay: number;
    afterEventTitle: string | null;
}

export class AssetService {
    private prisma: PrismaClient;
    private gameTimeService: GameTimeService;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
        this.gameTimeService = new GameTimeService(this.prisma);
    }

    /**
     * Récupère tous les actifs avec leurs relations
     * @returns Promise<Asset[]> - Liste complète des actifs triés par titre
     */
    async findAll(): Promise<Asset[]> {
        return this.prisma.asset.findMany({
            include: {
                // Inclut le marché parent
                market: true,
                // Inclut le sous-marché parent
                submarket: true,
                // Inclut le champ disciplinaire
                field: true,
                // Inclut l'historique des actifs
                assetHistories: true,
                // Inclut les événements liés aux actifs
                eventAssets: true,
                // Inclut les transactions liées aux actifs
                transactions: true
            },
            orderBy: { title: 'asc' }, // Tri par titre d'actif croissant
        });
    }

    /**
     * Récupère un actif spécifique par son ID
     * @param id - Identifiant unique de l'actif
     * @returns Promise<Asset | null> - L'actif trouvé ou null si inexistant
     */
    async findOne(id: number, gameInstanceId?: number): Promise<Asset | null> {
        return this.prisma.asset.findUnique({
            where: { id },
            include: {
                market: true,
                submarket: true,
                field: true,
                assetHistories: true,
                eventAssets: true,
                transactions: gameInstanceId
                    ? { where: { gameInstanceId } }
                    : true
            }
        });
    }

    /**
     * Récupère tous les actifs d'un marché spécifique
     * @param marketId - Identifiant du marché parent
     * @returns Promise<Asset[]> - Liste des actifs du marché
     */
    async findByMarketId(marketId: number): Promise<Asset[]> {
        return this.prisma.asset.findMany({
            where: { marketId },
            include: {
                // market: true,  // Supprimé car redondant - on connaît déjà le marketId
                submarket: true,
                field: true,
                assetHistories: true,
                eventAssets: true,
                transactions: true
            },
            orderBy: { title: 'asc' }
        });
    }

    /**
     * Récupère tous les actifs d'un sous-marché spécifique
     * @param submarketId - Identifiant du sous-marché parent
     * @returns Promise<Asset[]> - Liste des actifs du sous-marché
     */
    async findBySubmarketId(submarketId: number): Promise<Asset[]> {
        return this.prisma.asset.findMany({
            where: { submarketId },
            include: {
                market: true,
                field: true,
                // submarket: true,  // Supprimé car redondant - on connaît déjà le submarketId
                assetHistories: true,
                eventAssets: true,
                transactions: true
            },
            orderBy: { title: 'asc' }
        });
    }

    /**
     * Récupère les actifs autorisés pour la partie en cours.
     * La source de vérité est la table level_assets seedée par niveau.
     * Fallback: si aucun mapping n'existe encore pour un ancien seed, on retourne
     * tous les actifs pour préserver le fonctionnement historique.
     */
    async findAvailableForGame(gameInstanceId: number): Promise<Asset[]> {
        const gameInstance = await this.prisma.gameInstance.findUnique({
            where: { id: gameInstanceId },
            select: { levelId: true },
        });

        if (!gameInstance?.levelId) {
            return [];
        }

        const levelAssets = await this.prisma.levelAsset.findMany({
            where: { levelId: gameInstance.levelId },
            include: {
                asset: {
                    include: {
                        market: true,
                        submarket: true,
                        field: true,
                        assetHistories: true,
                        eventAssets: true,
                        transactions: true,
                    },
                },
            },
            orderBy: {
                asset: { title: 'asc' },
            },
        });

        if (levelAssets.length > 0) {
            return levelAssets.map((levelAsset) => levelAsset.asset);
        }

        return this.findAll();
    }

    /**
     * Disponibilité des assets verrouillés pour une partie, évaluée À LA LECTURE.
     * Aucune mutation : on compare le jour de jeu courant au jour de déblocage
     * (dérivé du triggerPercent de l'event, ou de unlockPercent). Cohérent avec
     * la logique d'impacts (asset-history.service) et identique pour tous les joueurs.
     * @returns Map assetId -> info de verrou. Seuls les assets gatés y figurent.
     */
    async getUnlockState(gameInstanceId: number): Promise<Map<number, AssetUnlockInfo>> {
        const gameInstance = await this.prisma.gameInstance.findUnique({
            where: { id: gameInstanceId },
            include: {
                level: {
                    include: {
                        assetUnlocks: { include: { levelEvent: { include: { event: true } } } },
                    },
                },
            },
        });

        const map = new Map<number, AssetUnlockInfo>();
        if (!gameInstance?.level) return map;

        const duration = gameInstance.level.duration ?? 365;
        const currentGameDay = this.gameTimeService.getCurrentGameDay(gameInstance as GameInstanceWithLevel);

        // Un asset débloqué par un event l'est dès que cet event s'est réellement déclenché.
        // Rejouer le seuil en jours désynchronise : le job pg-boss peut se déclencher quelques
        // dizaines de ms avant `scheduledAt`, ce qui vaut presque un jour de jeu aux vitesses
        // élevées (niveau 1 : speed 1 314 000). L'event met alors la partie en pause au jour N-1,
        // le seuil N n'est jamais atteint et l'asset reste verrouillé pour toujours.
        const triggeredLevelEventIds = new Set(
            (
                await this.prisma.gameInstanceEvent.findMany({
                    where: { gameInstanceId, triggeredAt: { not: null } },
                    select: { levelEventId: true },
                })
            ).map((e: { levelEventId: number }) => e.levelEventId)
        );

        for (const unlock of gameInstance.level.assetUnlocks) {
            const percent = unlock.levelEvent
                ? unlock.levelEvent.triggerPercent
                : (unlock.unlockPercent ?? 0);
            const unlockGameDay = Math.floor((duration * percent) / 100);
            const available = unlock.levelEvent
                ? triggeredLevelEventIds.has(unlock.levelEvent.id) || currentGameDay >= unlockGameDay
                : currentGameDay >= unlockGameDay;
            map.set(unlock.assetId, {
                available,
                unlockGameDay,
                afterEventTitle: unlock.levelEvent?.event?.title ?? null,
            });
        }
        return map;
    }

    /**
     * Assets explicitement liés au niveau d'une partie (table LevelAsset).
     * Retourne `null` si le niveau n'a AUCUNE ligne LevelAsset configurée :
     * dans ce cas on ne restreint rien, pour ne pas casser les niveaux existants
     * qui n'ont jamais rempli cette table (comportement historique préservé).
     */
    async getLevelAssetIds(gameInstanceId: number): Promise<Set<number> | null> {
        const gameInstance = await this.prisma.gameInstance.findUnique({
            where: { id: gameInstanceId },
            select: { level: { select: { levelAssets: { select: { assetId: true } } } } },
        });
        if (!gameInstance?.level || gameInstance.level.levelAssets.length === 0) return null;
        return new Set(gameInstance.level.levelAssets.map((la: { assetId: number }) => la.assetId));
    }

    /**
     * True si l'asset est disponible dans cette partie : il doit appartenir au niveau
     * (LevelAsset, si configuré) ET ne pas être encore verrouillé par un AssetUnlock.
     */
    async isAssetAvailableForGame(assetId: number, gameInstanceId: number): Promise<boolean> {
        const [levelAssetIds, state] = await Promise.all([
            this.getLevelAssetIds(gameInstanceId),
            this.getUnlockState(gameInstanceId),
        ]);
        if (levelAssetIds && !levelAssetIds.has(assetId)) return false;
        return state.get(assetId)?.available ?? true;
    }

    /**
     * Liste des actifs annotés de leur disponibilité pour une partie donnée.
     * Filtrée sur les assets liés au niveau (LevelAsset) quand ce niveau en configure.
     * `available` = false pour un asset encore verrouillé ; `unlock` porte de quoi
     * afficher l'indice côté UI ("Disponible après …").
     */
    async findForGame(gameInstanceId: number) {
        const [assets, state] = await Promise.all([
            this.findAvailableForGame(gameInstanceId),
            this.getUnlockState(gameInstanceId),
        ]);
        return assets.map((asset) => {
                const info = state.get(asset.id);
                return {
                    ...asset,
                    available: info?.available ?? true,
                    unlock: info
                        ? { unlockGameDay: info.unlockGameDay, afterEventTitle: info.afterEventTitle }
                        : null,
                };
            });
    }

    /**
     * Crée un nouvel actif
     * @param data - Données de l'actif validées par le schéma Zod
     * @returns Promise<Asset> - L'actif créé avec son ID généré
     */
    async create(data: AssetCreateSchema): Promise<Asset> {
        return this.prisma.asset.create({ data });
    }

    /**
     * Met à jour un actif existant
     * @param id - Identifiant de l'actif à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Asset> - L'actif mis à jour
     */
    async update(id: number, data: AssetDataSchema): Promise<Asset> {
        return this.prisma.asset.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un actif
     * @param id - Identifiant de l'actif à supprimer
     * @returns Promise<Asset> - L'actif supprimé (pour confirmation)
     */
    async delete(id: number): Promise<Asset> {
        return this.prisma.asset.delete({ where: { id } });
    }
}
