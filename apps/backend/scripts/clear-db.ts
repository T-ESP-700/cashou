// Script pour vider toutes les tables de la base de données
import { prisma } from "@cashou/db-app";

async function clearDatabase() {
    console.log('🧹 Nettoyage de la base de données...');

    try {
        // Supprimer dans l'ordre inverse des dépendances
        await prisma.userAnswer.deleteMany();
        console.log('✓ UserAnswers supprimés');

        await prisma.userQuiz.deleteMany();
        console.log('✓ UserQuizzes supprimés');

        await prisma.quizQuestion.deleteMany();
        console.log('✓ QuizQuestions supprimés');

        await prisma.answer.deleteMany();
        console.log('✓ Answers supprimés');

        await prisma.question.deleteMany();
        console.log('✓ Questions supprimées');

        await prisma.quiz.deleteMany();
        console.log('✓ Quiz supprimés');

        await prisma.transaction.deleteMany();
        console.log('✓ Transactions supprimées');

        await prisma.wallet.deleteMany();
        console.log('✓ Wallets supprimés');

        await prisma.gameInstance.deleteMany();
        console.log('✓ GameInstances supprimées');

        await prisma.notification.deleteMany();
        console.log('✓ Notifications supprimées');

        await prisma.user.deleteMany();
        console.log('✓ Users supprimés');

        await prisma.levelGoal.deleteMany();
        console.log('✓ LevelGoals supprimés');

        await prisma.levelEvent.deleteMany();
        console.log('✓ LevelEvents supprimés');

        await prisma.level.deleteMany();
        console.log('✓ Levels supprimés');

        // Réinitialiser les séquences PostgreSQL
        await prisma.$executeRawUnsafe(`
            DO $$ 
            DECLARE 
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'ALTER SEQUENCE IF EXISTS ' || quote_ident(r.tablename || '_id_seq') || ' RESTART WITH 1';
                END LOOP;
            END $$;
        `);
        console.log('✓ Séquences PostgreSQL réinitialisées');

        await prisma.assetHistory.deleteMany();
        console.log('✓ AssetHistories supprimés');

        await prisma.eventAsset.deleteMany();
        console.log('✓ EventAssets supprimés');

        await prisma.goal.deleteMany();
        console.log('✓ Goals supprimés');

        await prisma.event.deleteMany();
        console.log('✓ Events supprimés');

        await prisma.impact.deleteMany();
        console.log('✓ Impacts supprimés');

        await prisma.asset.deleteMany();
        console.log('✓ Assets supprimés');

        await prisma.submarket.deleteMany();
        console.log('✓ Submarkets supprimés');

        await prisma.field.deleteMany();
        console.log('✓ Fields supprimés');

        await prisma.market.deleteMany();
        console.log('✓ Markets supprimés');

        console.log('\n✅ Base de données complètement vidée !');
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
        throw error;
    }
}

clearDatabase()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

