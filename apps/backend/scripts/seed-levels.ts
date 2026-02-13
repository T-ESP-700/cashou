// Script de seed pour peupler la page Niveaux avec des donnees de test
// Cree 4 niveaux avec des etats differents : termine, en cours, bloque
// Usage: bun run db:seed:levels

import { resolve } from "path";
import dotenv from "dotenv";

// Charger le .env depuis la racine du monorepo
dotenv.config({ path: resolve(import.meta.dir, "../../../.env") });

import { PrismaClient } from "@cashou/db-app";

const prisma = new PrismaClient();

async function main() {
    console.log("🎮 Seed des niveaux pour simuler l'ecran Niveaux...\n");

    // Trouver le premier utilisateur existant
    const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!user) {
        console.error("❌ Aucun utilisateur trouve. Connectez-vous d'abord a l'app.");
        return;
    }
    console.log(`👤 Utilisateur trouve: ${user.name || user.email} (${user.id})`);

    // Nettoyer les anciennes donnees de jeu
    console.log("🧹 Nettoyage des anciennes game instances...");
    await prisma.gameInstance.deleteMany({});

    // Supprimer les anciens niveaux (en gerant les contraintes de cles etrangeres)
    console.log("🧹 Nettoyage des anciens niveaux...");
    await prisma.levelGoal.deleteMany({});
    await prisma.levelEvent.deleteMany({});
    await prisma.quiz.deleteMany({}); // Quiz reference aussi Level

    // Creer d'abord un niveau temporaire pour les utilisateurs
    console.log("📚 Creation des nouveaux niveaux...");
    const tempLevel = await prisma.level.create({
        data: {
            title: "Niveau temporaire",
            number: 0,
            duration: 0,
            speed: 0,
            startBalance: 0,
            pointsRequired: 0,
            description: "Niveau temporaire pour migration",
        }
    });

    // Mettre a jour tous les utilisateurs vers le niveau temporaire
    await prisma.user.updateMany({
        data: { levelId: tempLevel.id }
    });

    // Maintenant on peut supprimer les anciens niveaux (sauf le temporaire)
    await prisma.level.deleteMany({
        where: { id: { not: tempLevel.id } }
    });


    // Creer 4 niveaux
    console.log("📚 Creation de 4 niveaux...");

    const level1 = await prisma.level.create({
        data: {
            title: "Les bases de l'investissement",
            number: 1,
            duration: 300,
            speed: 10,
            startBalance: 10000,
            pointsRequired: 0,
            description: "Decouvrez les fondamentaux de l'investissement",
        }
    });

    const level2 = await prisma.level.create({
        data: {
            title: "Diversification",
            number: 2,
            duration: 450,
            speed: 12,
            startBalance: 15000,
            pointsRequired: 0,
            description: "Apprenez a diversifier votre portefeuille",
        }
    });

    const level3 = await prisma.level.create({
        data: {
            title: "Gestion des risques",
            number: 3,
            duration: 600,
            speed: 14,
            startBalance: 20000,
            pointsRequired: 0,
            description: "Maitriser la gestion des risques en investissement",
        }
    });

    const level4 = await prisma.level.create({
        data: {
            title: "Trading avance",
            number: 4,
            duration: 900,
            speed: 16,
            startBalance: 25000,
            pointsRequired: 9999, // Points tres eleves pour que le niveau soit verrouille
            description: "Strategies avancees de trading et analyse technique",
        }
    });

    console.log(`   ✅ Niveau 1 (id: ${level1.id}) - sera termine`);
    console.log(`   ✅ Niveau 2 (id: ${level2.id}) - sera termine`);
    console.log(`   ✅ Niveau 3 (id: ${level3.id}) - sera en cours`);
    console.log(`   🔒 Niveau 4 (id: ${level4.id}) - sera verrouille (9999 points requis)`);

    // Creer des objectifs (goals)
    console.log("\n🎯 Creation des objectifs...");
    const goalMandatory = await prisma.goal.create({
        data: {
            title: "Reste en positif",
            description: "Termine avec un portefeuille >= au capital de depart",
            goalType: "wallet_gte_start",
            goalValue: 0,
        }
    });
    const goalBonus = await prisma.goal.create({
        data: {
            title: "Fais du profit",
            description: "Termine avec un portefeuille > au capital de depart",
            goalType: "wallet_gt_start",
            goalValue: 0,
        }
    });

    // Associer les goals aux niveaux 1 et 2
    for (const lvl of [level1, level2, level3, level4]) {
        await prisma.levelGoal.create({ data: { levelId: lvl.id, goalId: goalMandatory.id } });
        await prisma.levelGoal.create({ data: { levelId: lvl.id, goalId: goalBonus.id } });
    }
    console.log("   ✅ 2 objectifs associes a chaque niveau (obligatoire + bonus)");

    // Creer des quiz pour les niveaux 1 et 2
    console.log("\n🧠 Creation des quiz...");
    const quiz1 = await prisma.quiz.create({
        data: { type: "MCQ", title: "Quiz Niveau 1", description: "Quiz du niveau 1", levelId: level1.id }
    });
    const quiz2 = await prisma.quiz.create({
        data: { type: "MCQ", title: "Quiz Niveau 2", description: "Quiz du niveau 2", levelId: level2.id }
    });

    // Creer des participations quiz pour simuler les etoiles
    // Niveau 1 : quiz complete (etoile 3 remplie)
    await prisma.userQuiz.create({
        data: { quizId: quiz1.id, userId: user.id, completedAt: new Date(), isCorrect: true }
    });
    // Niveau 2 : quiz complete (etoile 3 remplie)
    await prisma.userQuiz.create({
        data: { quizId: quiz2.id, userId: user.id, completedAt: new Date(), isCorrect: true }
    });
    console.log("   ✅ Quiz completes pour Niveau 1 et 2");

    // Mettre a jour l'utilisateur: levelId = niveau 3 (debloques: 1, 2, 3)
    await prisma.user.update({
        where: { id: user.id },
        data: {
            levelId: level3.id,
            points: 100, // Pas assez pour debloquer le niveau 4
        }
    });
    console.log(`\n👤 Utilisateur mis a jour: levelId=${level3.id}, points=100`);

    // Mettre a jour tous les autres utilisateurs vers le niveau 1
    await prisma.user.updateMany({
        where: { id: { not: user.id } },
        data: { levelId: level1.id }
    });

    // Supprimer le niveau temporaire maintenant que tous les utilisateurs ont ete migres
    await prisma.level.delete({ where: { id: tempLevel.id } });
    console.log("🧹 Niveau temporaire supprime");

    // Creer une game instance terminee pour le niveau 1
    // Wallet > startBalance => etoile 1 (obligatoire) + etoile 2 (bonus) remplies
    const game1 = await prisma.gameInstance.create({
        data: {
            type: "SOLO",
            userId: user.id,
            levelId: level1.id,
            startBalance: level1.startBalance,
            isEnded: true,
            endedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            currentEventIndex: 0,
            totalPausedDuration: 0,
        }
    });
    // Wallet avec un montant > startBalance (profit)
    await prisma.wallet.create({
        data: { userId: user.id, gameInstanceId: game1.id, amount: 12000 } // 12000 > 10000
    });
    console.log("🏁 Game instance + wallet creee pour Niveau 1 (12000 > 10000 = 2 etoiles)");

    // Creer une game instance terminee pour le niveau 2
    // Wallet >= startBalance mais pas > => etoile 1 remplie, etoile 2 vide
    const game2 = await prisma.gameInstance.create({
        data: {
            type: "SOLO",
            userId: user.id,
            levelId: level2.id,
            startBalance: level2.startBalance,
            isEnded: true,
            endedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            currentEventIndex: 0,
            totalPausedDuration: 0,
        }
    });
    // Wallet avec montant = startBalance (pas de profit)
    await prisma.wallet.create({
        data: { userId: user.id, gameInstanceId: game2.id, amount: 15000 } // 15000 = 15000
    });
    console.log("🏁 Game instance + wallet creee pour Niveau 2 (15000 = 15000 = 1 etoile)");

    console.log("\n✅ Seed termine avec succes !");
    console.log("\n📱 Resultat attendu sur l'ecran Niveaux:");
    console.log("   Niveau 1 ⭐⭐⭐ ✅ (obligatoire + bonus + quiz)");
    console.log("   Niveau 2 ⭐☆⭐ ✅ (obligatoire + quiz, pas bonus)");
    console.log("   Niveau 3 ➡️  (en cours / courant)");
    console.log("   Niveau 4 🔒 (verrouille)");
}

main()
    .catch((e) => {
        console.error("❌ Erreur lors du seed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
