/**
 * Test backend-only des fonctionnalités "étoiles par niveau" (UserLevelCompletion).
 *
 * Scénario:
 * 1. Créer ou récupérer un utilisateur de test
 * 2. Créer une partie (niveau 1) avec wallet + holding pour valider les objectifs
 * 3. Appeler endGame → vérifier que UserLevelCompletion est créée avec les bonnes étoiles
 * 4. (Optionnel) Simuler la réussite d'un quiz du niveau → vérifier mise à jour des étoiles
 * 5. Afficher getUserLevels pour cet utilisateur
 *
 * Exécution (à la racine du repo ou depuis apps/backend):
 *   bun run scripts/test-level-stars.ts
 * Avec .env chargé (CASHOU_DB_URL):
 *   cd apps/backend && bunx dotenv -e ../../.env -- bun run scripts/test-level-stars.ts
 */
import { PrismaClient } from '@cashou/db-app';
import { EndGameService } from '../src/trpc/services/end-game.service';
import { LevelCompletionService } from '../src/trpc/services/level-completion.service';
import { LevelService } from '../src/trpc/services/level.service';

const prisma = new PrismaClient();

const TEST_USER_EMAIL = 'test-stars@cashou.fr';

async function main() {
  console.log('🧪 Test backend – Étoiles par niveau (UserLevelCompletion)\n');

  // 1. Niveau 1 + objectifs + Livret A
  const level = await prisma.level.findFirst({
    where: { number: 1 },
    include: { levelGoals: { include: { goal: true } } },
  });
  if (!level) {
    console.error('❌ Niveau 1 non trouvé. Lancez: bun run db:seed:level1');
    process.exit(1);
  }

  const livretA = await prisma.asset.findFirst({ where: { symbol: 'LIVRET_A' } });
  if (!livretA) {
    console.error('❌ Livret A non trouvé (seed niveau 1).');
    process.exit(1);
  }

  // 2. Utilisateur de test
  let user = await prisma.user.findFirst({ where: { email: TEST_USER_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: 'test-stars-' + Date.now(),
        email: TEST_USER_EMAIL,
        name: 'Test Stars',
        levelId: level.id,
      },
    });
    console.log('✅ Utilisateur de test créé:', user.id);
  } else {
    console.log('✅ Utilisateur de test existant:', user.id);
  }

  const startBalance = Number(level.startBalance) || 2000;
  const buyAmount = 500;

  // 3. Partie + wallet + holding (pour que endGame calcule totalValue >= startBalance)
  const gameInstance = await prisma.gameInstance.create({
    data: {
      userId: user.id,
      levelId: level.id,
      startBalance,
      type: 'STANDARD',
      isPaused: false,
    },
  });
  const wallet = await prisma.wallet.create({
    data: {
      userId: user.id,
      gameInstanceId: gameInstance.id,
      amount: startBalance - buyAmount,
    },
  });
  await prisma.holding.create({
    data: {
      walletId: wallet.id,
      assetId: livretA.id,
      gameInstanceId: gameInstance.id,
      quantity: buyAmount,
      acquiredAt: new Date(),
    },
  });
  console.log('✅ Partie créée (ID:', gameInstance.id, '), wallet + holding (500€ Livret A)\n');

  // 4. EndGame → enregistrement UserLevelCompletion
  const endGameService = new EndGameService();
  const levelCompletionService = new LevelCompletionService();

  const endResult = await endGameService.endGame(gameInstance.id);
  console.log('📋 Résultat endGame:');
  console.log('   success:', endResult.success);
  console.log('   totalValue:', endResult.totalValue, '| startBalance:', endResult.startBalance);
  endResult.goals.forEach((g) => console.log('   goal:', g.title, g.validated ? '✅' : '❌'));

  const completionAfterGame = await levelCompletionService.getCompletion(user.id, level.id);
  console.log('\n⭐ UserLevelCompletion après endGame:');
  if (completionAfterGame) {
    console.log('   stars:', completionAfterGame.stars);
    console.log('   mandatoryGoalsMet:', completionAfterGame.mandatoryGoalsMet);
    console.log('   bonusGoalsMet:', completionAfterGame.bonusGoalsMet);
    console.log('   quizPassed:', completionAfterGame.quizPassed);
  } else {
    console.log('   (aucune ligne – endGame a peut-être échoué ou objectifs non validés)');
  }

  // 5. (Optionnel) Quiz réussi pour ce niveau → mise à jour étoiles
  const quiz = await prisma.quiz.findFirst({ where: { levelId: level.id } });
  if (quiz) {
    const existingQuiz = await prisma.userQuiz.findFirst({
      where: { userId: user.id, quizId: quiz.id },
    });
    if (!existingQuiz) {
      await prisma.userQuiz.create({
        data: {
          userId: user.id,
          quizId: quiz.id,
          isCorrect: true,
          completedAt: new Date(),
        },
      });
      await levelCompletionService.recordFromQuizComplete(user.id, level.id);
      console.log('\n✅ Quiz niveau 1 marqué comme réussi → recordFromQuizComplete appelé');
    }
    const completionAfterQuiz = await levelCompletionService.getCompletion(user.id, level.id);
    console.log('⭐ UserLevelCompletion après quiz:');
    if (completionAfterQuiz) {
      console.log('   stars:', completionAfterQuiz.stars);
      console.log('   mandatoryGoalsMet:', completionAfterQuiz.mandatoryGoalsMet);
      console.log('   bonusGoalsMet:', completionAfterQuiz.bonusGoalsMet);
      console.log('   quizPassed:', completionAfterQuiz.quizPassed);
    }
  } else {
    console.log('\nℹ️ Aucun quiz pour le niveau 1 – étape quiz ignorée');
  }

  // 6. getUserLevels (comme l’API)
  const levelService = new LevelService();
  const userLevels = await levelService.getUserLevels(user.id);
  console.log('\n📚 getUserLevels pour', user.id, ':');
  userLevels.slice(0, 5).forEach((u) => {
    console.log('   niveau', u.level.number, '| stars:', u.stars, '| unlocked:', u.unlocked);
  });

  // Nettoyage
  console.log('\n🧹 Nettoyage...');
  await prisma.userLevelCompletion.deleteMany({ where: { userId: user.id } });
  await prisma.holding.deleteMany({ where: { gameInstanceId: gameInstance.id } });
  await prisma.transaction.deleteMany({ where: { gameInstanceId: gameInstance.id } });
  await prisma.wallet.deleteMany({ where: { gameInstanceId: gameInstance.id } });
  await prisma.gameInstance.delete({ where: { id: gameInstance.id } });
  console.log('✅ Données de test supprimées (user conservé pour réutilisation).\n');
  console.log('✨ Test terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
