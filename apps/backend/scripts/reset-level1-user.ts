/**
 * Reset complet du niveau 1 pour un utilisateur donné (dev / QA).
 *
 * Supprime, pour (userId, niveau 1) :
 *   - UserLevelCompletion  → rejoue le tuto guidé + remet les étoiles à zéro
 *   - UserQuiz (quiz du niveau 1) → remet la "3ème étoile / quiz" à zéro
 *   - GameInstance (+ cascade: Wallet, Holding, Transaction, GameInstanceEvent, Notification)
 *
 * Ne touche PAS aux points/XP globaux ni aux autres niveaux.
 *
 * Usage:
 *   cd apps/backend && bunx dotenv -e ../../.env -- bun run scripts/reset-level1-user.ts <userId>
 */
import prisma from '../src/database';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const userId = args.find((a) => !a.startsWith('--'));
  if (!userId) {
    console.error('❌ userId manquant. Usage: bun run scripts/reset-level1-user.ts <userId> [--dry-run]');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    console.error(`❌ Aucun utilisateur avec l'id "${userId}"`);
    process.exit(1);
  }

  const level = await prisma.level.findFirst({
    where: { number: 1 },
    select: { id: true, title: true },
  });
  if (!level) {
    console.error('❌ Niveau 1 introuvable (aucun Level avec number = 1). As-tu seedé le niveau 1 ?');
    process.exit(1);
  }

  console.log(`👤 Utilisateur : ${user.name ?? '—'} <${user.email ?? '—'}> (${user.id})`);
  console.log(`🎯 Niveau 1    : "${level.title ?? '—'}" (id ${level.id})`);

  // État avant reset
  const [completionCount, gameCount, quizCount] = await Promise.all([
    prisma.userLevelCompletion.count({ where: { userId, levelId: level.id } }),
    prisma.gameInstance.count({ where: { userId, levelId: level.id } }),
    prisma.userQuiz.count({ where: { userId, quiz: { levelId: level.id } } }),
  ]);

  console.log('\n🧹 À supprimer :');
  console.log(`   - UserLevelCompletion : ${completionCount}`);
  console.log(`   - GameInstance        : ${gameCount} (+ wallets/holdings/transactions/events en cascade)`);
  console.log(`   - UserQuiz (niveau 1) : ${quizCount}`);

  if (completionCount + gameCount + quizCount === 0) {
    console.log('\n✅ Rien à supprimer : le niveau 1 est déjà vierge pour cet utilisateur.');
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log('\n🔎 DRY-RUN : aucune suppression effectuée. Relance sans --dry-run pour appliquer.');
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const quiz = await tx.userQuiz.deleteMany({ where: { userId, quiz: { levelId: level.id } } });
    const games = await tx.gameInstance.deleteMany({ where: { userId, levelId: level.id } });
    const completions = await tx.userLevelCompletion.deleteMany({ where: { userId, levelId: level.id } });
    return { quiz: quiz.count, games: games.count, completions: completions.count };
  });

  console.log('\n✅ Reset niveau 1 effectué :');
  console.log(`   - UserLevelCompletion supprimées : ${result.completions}`);
  console.log(`   - GameInstance supprimées        : ${result.games}`);
  console.log(`   - UserQuiz supprimées            : ${result.quiz}`);
  console.log('\n➡️  Le tuto guidé du niveau 1 se relancera à la prochaine partie de cet utilisateur.');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Erreur pendant le reset :', e);
  await prisma.$disconnect();
  process.exit(1);
});
