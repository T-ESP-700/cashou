import { PrismaClient } from '@cashou/db-app';

const prisma = new PrismaClient();

/**
 * 24 fake levels (1-24) with progressive French financial education titles.
 * These are pre-completed by the dev user so level 25 (ESP demo) is immediately available.
 */
const FAKE_LEVELS = [
  { number: 1, title: 'Les bases du budget', description: 'Apprends à gérer tes revenus et dépenses au quotidien.', pointsRequired: 0, startBalance: 500 },
  { number: 2, title: 'Épargne de précaution', description: 'Constitue ta réserve d\'urgence pour faire face aux imprévus.', pointsRequired: 10, startBalance: 800 },
  { number: 3, title: 'Comprendre les intérêts', description: 'Découvre comment l\'argent peut travailler pour toi grâce aux intérêts.', pointsRequired: 20, startBalance: 1000 },
  { number: 4, title: 'Le Livret A', description: 'Ton premier placement sécurisé avec un taux garanti par l\'État.', pointsRequired: 35, startBalance: 1200 },
  { number: 5, title: 'Les intérêts composés', description: 'Découvre la puissance des intérêts qui génèrent eux-mêmes des intérêts.', pointsRequired: 50, startBalance: 1500 },
  { number: 6, title: 'Les livrets réglementés', description: 'Explore les différents types de livrets : Livret A, LDDS, LEP...', pointsRequired: 70, startBalance: 1800 },
  { number: 7, title: 'L\'inflation et l\'épargne', description: 'Comprends pourquoi ton argent perd de la valeur avec le temps.', pointsRequired: 90, startBalance: 2000 },
  { number: 8, title: 'Premier budget prévisionnel', description: 'Planifie tes finances sur un mois complet.', pointsRequired: 115, startBalance: 2000 },
  { number: 9, title: 'Les frais bancaires', description: 'Identifie et optimise les frais liés à tes comptes.', pointsRequired: 140, startBalance: 2200 },
  { number: 10, title: 'L\'assurance vie : les bases', description: 'Découvre ce placement polyvalent et ses avantages fiscaux.', pointsRequired: 170, startBalance: 2500 },
  { number: 11, title: 'Fonds euros vs unités de compte', description: 'Comprends les deux faces de l\'assurance vie.', pointsRequired: 200, startBalance: 2800 },
  { number: 12, title: 'La fiscalité de l\'épargne', description: 'Apprends comment tes gains sont imposés et comment optimiser.', pointsRequired: 240, startBalance: 3000 },
  { number: 13, title: 'Introduction à la bourse', description: 'Découvre le monde des marchés financiers et des actions.', pointsRequired: 280, startBalance: 3000 },
  { number: 14, title: 'Les actions', description: 'Comprends ce que signifie détenir une part d\'entreprise.', pointsRequired: 320, startBalance: 3200 },
  { number: 15, title: 'Les obligations', description: 'Découvre les titres de dette et leur rôle dans un portefeuille.', pointsRequired: 370, startBalance: 3500 },
  { number: 16, title: 'Les ETF et fonds indiciels', description: 'Investis sur tout un marché en une seule opération.', pointsRequired: 420, startBalance: 3800 },
  { number: 17, title: 'Risque et rendement', description: 'Comprends le lien fondamental entre prise de risque et gains potentiels.', pointsRequired: 480, startBalance: 4000 },
  { number: 18, title: 'La volatilité', description: 'Apprends à mesurer et interpréter les fluctuations des prix.', pointsRequired: 540, startBalance: 4000 },
  { number: 19, title: 'Construire un portefeuille', description: 'Apprends à répartir ton argent entre différents placements.', pointsRequired: 600, startBalance: 4200 },
  { number: 20, title: 'La diversification', description: 'Ne mets pas tous tes œufs dans le même panier.', pointsRequired: 670, startBalance: 4500 },
  { number: 21, title: 'Gérer ses émotions', description: 'Apprends à ne pas paniquer quand les marchés bougent.', pointsRequired: 740, startBalance: 4500 },
  { number: 22, title: 'L\'horizon de placement', description: 'Adapte ta stratégie à ton âge et tes objectifs.', pointsRequired: 820, startBalance: 4800 },
  { number: 23, title: 'Le PEA', description: 'Découvre le Plan d\'Épargne en Actions et ses avantages fiscaux.', pointsRequired: 900, startBalance: 5000 },
  { number: 24, title: 'Stratégies d\'investissement', description: 'DCA, value investing, lazy investing : trouve ton style.', pointsRequired: 980, startBalance: 5000 },
];

async function main() {
  console.log('🌱 Création des 24 niveaux fictifs (pré-complétés)...');

  // Find the dev user
  const devUser = await prisma.user.findFirst({
    where: { email: 'test@gmail.com' },
  });

  if (!devUser) {
    console.log('⚠️  Aucun utilisateur dev trouvé (test@gmail.com). Exécutez d\'abord seed-dev-account.ts');
    console.log('   Les niveaux seront créés mais pas pré-complétés.');
  }

  const createdLevelIds: number[] = [];

  for (const def of FAKE_LEVELS) {
    let level = await prisma.level.findFirst({
      where: { number: def.number },
    });

    const levelData = {
      title: def.title,
      number: def.number,
      duration: 365,
      speed: 262800,
      startBalance: def.startBalance,
      pointsRequired: def.pointsRequired,
      historyStartDay: 0,
      description: def.description,
    };

    if (level) {
      level = await prisma.level.update({
        where: { id: level.id },
        data: levelData,
      });
    } else {
      level = await prisma.level.create({
        data: levelData,
      });
    }

    createdLevelIds.push(level.id);
    console.log(`  ✅ Niveau ${def.number}: ${def.title} (ID: ${level.id})`);

    // Mark as completed by dev user (3 stars)
    if (devUser) {
      await (prisma as any).userLevelCompletion.upsert({
        where: {
          userId_levelId: { userId: devUser.id, levelId: level.id },
        },
        create: {
          userId: devUser.id,
          levelId: level.id,
          stars: 3,
          mandatoryGoalsMet: true,
          bonusGoalsMet: true,
          quizPassed: true,
          completedAt: new Date(),
        },
        update: {
          stars: 3,
          mandatoryGoalsMet: true,
          bonusGoalsMet: true,
          quizPassed: true,
          completedAt: new Date(),
        },
      });
    }
  }

  // Set dev user's levelId to the ESP demo level (number 25)
  // so that level 25 is unlocked
  if (devUser) {
    const espLevel = await prisma.level.findFirst({
      where: { number: 25 },
    });

    if (espLevel) {
      await prisma.user.update({
        where: { id: devUser.id },
        data: {
          levelId: espLevel.id,
          points: 1000, // Enough points to reflect 24 completed levels
        },
      });
      console.log(`\n✅ Utilisateur dev mis à jour: levelId=${espLevel.id} (niveau 25), points=1000`);
    } else {
      // If ESP level doesn't exist yet, set to last fake level
      const lastFakeLevelId = createdLevelIds[createdLevelIds.length - 1];
      await prisma.user.update({
        where: { id: devUser.id },
        data: {
          levelId: lastFakeLevelId,
          points: 1000,
        },
      });
      console.log(`\n⚠️  Niveau 25 (ESP) pas encore créé. User set to level ${lastFakeLevelId}. Relancez après seed-level-esp.`);
    }
  }

  console.log('\n✨ ========================================');
  console.log('✅ 24 niveaux fictifs créés et pré-complétés !');
  console.log('========================================');
  console.log(`📊 Niveaux 1-24 avec 3 étoiles chacun`);
  console.log(`👤 Utilisateur dev prêt pour le niveau 25`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding des niveaux fictifs :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
