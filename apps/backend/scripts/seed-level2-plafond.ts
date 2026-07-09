import { PrismaClient } from '@cashou/db-app';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding du niveau 2: Plafond...');

  // 1. Retrouver le Market/Submarket créés par le niveau 1 (même univers "Livrets d'épargne")
  console.log('📊 Récupération du marché Livrets, plans et comptes d\'épargne...');
  let market = await prisma.market.findFirst({
    where: { title: "Livrets, plans et comptes d'épargne" },
  });
  if (!market) {
    market = await prisma.market.create({
      data: {
        title: "Livrets, plans et comptes d'épargne",
        description: 'Marché regroupant les produits financiers sécurisés destinés à protéger le capital. Inclut livrets, comptes rémunérés et placements à court terme. Les valeurs sont stables et faiblement volatiles.',
      },
    });
  }
  console.log(`✅ Marché: ${market.title} (ID: ${market.id})`);

  let submarket = await prisma.submarket.findFirst({
    where: { title: "Livrets d'épargne", marketId: market.id },
  });
  if (!submarket) {
    submarket = await prisma.submarket.create({
      data: {
        title: "Livrets d'épargne",
        description: "Produits d'épargne réglementés offrant un rendement faible mais garanti. Idéal pour introduire la notion de capital sécurisé et de réserve d'urgence.",
        marketId: market.id,
        type: 'SAVINGS',
      },
    });
  }
  console.log(`✅ Sous-marché: ${submarket.title} (ID: ${submarket.id})`);

  // 2. Livret A (asset partagé avec le niveau 1) — upsert avec les mêmes caractéristiques
  console.log('💰 Vérification de l\'actif Livret A...');
  const livretA = await prisma.asset.upsert({
    where: { symbol: 'LIVRET_A' },
    update: {
      title: 'Livret A',
      rate: 1.7,
      marketId: market.id,
      submarketId: submarket.id,
      maxAmount: 22950,
      minAmount: 10,
    },
    create: {
      title: 'Livret A',
      symbol: 'LIVRET_A',
      rate: 1.7,
      description: "Produit d'épargne sécurisé et toujours disponible. Le Livret A offre un rendement modéré mais garanti, idéal pour constituer une réserve d'urgence et apprendre les bases de la gestion prudente.",
      marketId: market.id,
      submarketId: submarket.id,
      maxAmount: 22950,
      minAmount: 10,
    },
  });
  console.log(`✅ Actif: ${livretA.title} (${livretA.symbol}) - Rate: ${livretA.rate}% - Plafond: ${livretA.maxAmount}€`);

  // 3. LDDS — nouvel actif du niveau 2
  console.log('💰 Création de l\'actif LDDS...');
  const ldds = await prisma.asset.upsert({
    where: { symbol: 'LDDS' },
    update: {
      title: 'LDDS',
      rate: 1.5,
      marketId: market.id,
      submarketId: submarket.id,
      maxAmount: 12000,
      minAmount: 10,
    },
    create: {
      title: 'LDDS',
      symbol: 'LDDS',
      rate: 1.5,
      description: 'Le Livret de développement durable et solidaire (LDDS) est un produit d\'épargne réglementé, ce qui signifie que ses principales caractéristiques, notamment son taux d\'intérêt et son plafond de dépôt, sont fixées par les pouvoirs publics. Son taux d\'intérêt est de 1,5 %. Son plafond de dépôt est fixé à 12 000 €. Les intérêts sont calculés par quinzaine (le 1er et le 16 de chaque mois) en fonction des sommes déposées et de leur durée de présence sur le livret, puis capitalisés une fois par an, le 31 décembre.',
      marketId: market.id,
      submarketId: submarket.id,
      maxAmount: 12000,
      minAmount: 10,
    },
  });
  console.log(`✅ Actif: ${ldds.title} (${ldds.symbol}) - Rate: ${ldds.rate}% - Plafond: ${ldds.maxAmount}€`);

  // 4. Level "Plafond"
  console.log('📚 Création du niveau 2...');
  const LEVEL_FIELDS = {
    title: 'Plafond',
    duration: 435,
    speed: 1314000,
    startBalance: 2000,
    pointsRequired: 0,
    startDate: new Date(Date.UTC(2025, 10, 1)), // 1er novembre 2025
    description:
      'Ton premier niveau en toute autonomie !\n\n' +
      'Explore le concept de plafond et d\'intérêts composés et optimise tes placements grâce aux différents livrets proposés. ' +
      'A toi de maximiser tes gains lors des deux échéances de capitalisation qui interviendront dans ce niveau.',
  };
  // Resync la séquence sur MAX(id) avant tout create : une ligne insérée ailleurs avec un
  // id explicite (autre script de seed, volume Postgres non réinitialisé, etc.) peut désynchroniser
  // le nextval() et provoquer un P2002 sur Level.id même quand aucune ligne number=2 n'existe.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('levels', 'id'), COALESCE((SELECT MAX(id) FROM levels), 1), true)`
  );

  let level = await prisma.level.findFirst({ where: { number: 2 } });
  if (level) {
    level = await prisma.level.update({ where: { id: level.id }, data: LEVEL_FIELDS });
  } else {
    level = await prisma.level.create({ data: { number: 2, ...LEVEL_FIELDS } });
  }
  console.log(`✅ Niveau créé: ${level.title} (Niveau ${level.number}) — durée ${level.duration}j`);

  // 5. Livret A et LDDS disponibles dès le début (pas d'AssetUnlock)
  console.log('🔗 Liaison niveau-actifs...');
  for (const asset of [livretA, ldds]) {
    const existingLevelAsset = await prisma.levelAsset.findFirst({
      where: { levelId: level.id, assetId: asset.id },
    });
    if (!existingLevelAsset) {
      await prisma.levelAsset.create({ data: { levelId: level.id, assetId: asset.id } });
    }
  }
  console.log(`✅ Level-Assets créés: ${livretA.symbol}, ${ldds.symbol} disponibles dès le début`);

  // 6. Starting holding : 20950€ déjà placés sur le Livret A au jour 0
  console.log('🏦 Configuration du holding de départ (Livret A)...');
  await prisma.levelStartingHolding.upsert({
    where: { levelId_assetId: { levelId: level.id, assetId: livretA.id } },
    update: { quantity: 20950 },
    create: { levelId: level.id, assetId: livretA.id, quantity: 20950 },
  });
  console.log(`✅ Starting holding: ${livretA.symbol} = 20950€ dès le jour 0`);

  // 7. Event "Cadeau !" — cash grant de 300€, non compté comme transaction
  console.log('🎯 Création de l\'événement "Cadeau !"...');
  const EVENT_TITLE = 'Cadeau !';
  const EVENT_DESCRIPTION = 'Bonne nouvelle ! Vos parents décident de vous offrir 300 euros pour vous accompagner dans votre projet d\'épargne.';
  let event = await prisma.event.findFirst({ where: { title: EVENT_TITLE } });
  if (event) {
    event = await prisma.event.update({ where: { id: event.id }, data: { description: EVENT_DESCRIPTION, hasImpact: true } });
  } else {
    event = await prisma.event.create({ data: { title: EVENT_TITLE, description: EVENT_DESCRIPTION, hasImpact: true } });
  }
  console.log(`✅ Événement créé: ${event.title}`);

  console.log('💥 Création de l\'impact (cash grant)...');
  let impact = await prisma.impact.findFirst({ where: { eventId: event.id, impactType: 'CASH_GRANT' } });
  if (impact) {
    impact = await prisma.impact.update({ where: { id: impact.id }, data: { amount: 300 } });
  } else {
    impact = await prisma.impact.create({ data: { eventId: event.id, impactType: 'CASH_GRANT', amount: 300 } });
  }
  console.log(`✅ Impact créé: Event ${event.title} → CASH_GRANT +${impact.amount}€ (portefeuille entier, sans Transaction)`);

  // 8. LevelEvent : déclenchement à 16% de la durée (≈ 10 janvier 2026)
  console.log('🔗 Liaison niveau-événement...');
  const EVENT_TRIGGER_PERCENT = 16;
  let levelEvent = await prisma.levelEvent.findFirst({ where: { levelId: level.id, eventId: event.id } });
  if (levelEvent) {
    levelEvent = await prisma.levelEvent.update({ where: { id: levelEvent.id }, data: { triggerPercent: EVENT_TRIGGER_PERCENT, position: 1 } });
  } else {
    levelEvent = await prisma.levelEvent.create({ data: { levelId: level.id, eventId: event.id, triggerPercent: EVENT_TRIGGER_PERCENT, position: 1 } });
  }
  const eventGameDay = Math.floor((level.duration ?? 0) * (levelEvent.triggerPercent / 100));
  let eventDateLabel = `${levelEvent.triggerPercent}% (jour ${eventGameDay})`;
  if (level.startDate) {
    const eventDate = new Date(level.startDate.getTime() + eventGameDay * 86400 * 1000);
    eventDateLabel += ` → ${eventDate.toISOString().slice(0, 10)}`;
  }
  console.log(`✅ Level-Event créé: Level ${level.number} ↔ Event "${event.title}" (déclenche à ${eventDateLabel})`);

  // 9. Goals obligatoires + bonus
  console.log('🎯 Création des objectifs...');

  let goalTwoLivrets = await prisma.goal.findFirst({ where: { title: 'Deux livrets en simultané' } });
  const goalTwoLivretsData = {
    description: 'Avoir des cashous placés dans deux livrets simultanément à la fin de la partie.',
    successMessage: 'Bravo, ton épargne est bien répartie sur tes deux livrets !',
    failureMessage: "Tu n'as pas réussi à garder de l'argent placé sur les deux livrets jusqu'à la fin.",
    goalType: 'min_distinct_assets_invested',
    goalValue: 2,
  };
  goalTwoLivrets = goalTwoLivrets
    ? await prisma.goal.update({ where: { id: goalTwoLivrets.id }, data: goalTwoLivretsData })
    : await prisma.goal.create({ data: { title: 'Deux livrets en simultané', ...goalTwoLivretsData } });
  console.log(`✅ Objectif obligatoire: ${goalTwoLivrets.title}`);

  let goalLivretAMax = await prisma.goal.findFirst({ where: { title: 'Plafond du Livret A atteint' } });
  const goalLivretAMaxData = {
    description: 'Avoir le plafond ou plus sur le Livret A à la fin de la partie.',
    successMessage: 'Bravo, tu as atteint le plafond du Livret A !',
    failureMessage: "Tu n'as pas atteint le plafond du Livret A avant la fin de la partie.",
    goalType: 'livret_a_at_max',
    goalValue: null,
  };
  goalLivretAMax = goalLivretAMax
    ? await prisma.goal.update({ where: { id: goalLivretAMax.id }, data: goalLivretAMaxData })
    : await prisma.goal.create({ data: { title: 'Plafond du Livret A atteint', ...goalLivretAMaxData } });
  console.log(`✅ Objectif obligatoire: ${goalLivretAMax.title}`);

  let goalMaxInterest = await prisma.goal.findFirst({ where: { title: 'Intérêts maximisés' } });
  const goalMaxInterestData = {
    description: 'Générer le maximum d\'intérêt sur le plafond du Livret A, ainsi que sur le montant offert placé sur le LDDS au jour de l\'événement.',
    successMessage: 'Bravo, tu as optimisé tes placements au maximum !',
    failureMessage: 'Tu aurais pu générer plus d\'intérêts en plaçant ton argent plus tôt.',
    goalType: 'max_interest_efficiency',
    goalValue: 95,
  };
  goalMaxInterest = goalMaxInterest
    ? await prisma.goal.update({ where: { id: goalMaxInterest.id }, data: goalMaxInterestData })
    : await prisma.goal.create({ data: { title: 'Intérêts maximisés', ...goalMaxInterestData } });
  console.log(`✅ Objectif bonus: ${goalMaxInterest.title}`);

  const levelGoalsToLink: Array<{ goal: typeof goalTwoLivrets; isMandatory: boolean }> = [
    { goal: goalTwoLivrets, isMandatory: true },
    { goal: goalLivretAMax, isMandatory: true },
    { goal: goalMaxInterest, isMandatory: false },
  ];
  for (const { goal, isMandatory } of levelGoalsToLink) {
    const existingLevelGoal = await prisma.levelGoal.findFirst({ where: { levelId: level.id, goalId: goal.id } });
    if (!existingLevelGoal) {
      await prisma.levelGoal.create({ data: { levelId: level.id, goalId: goal.id, isMandatory } });
    }
  }
  console.log(`✅ 3 Level-Goals liés (2 obligatoires, 1 bonus)`);

  // 10. Quiz MCQ
  console.log('❓ Création du quiz...');
  const QUESTION_TEXT = 'Quel est le seul moyen de dépasser le plafond d\'un Livret A ?';
  const QUESTION_EXPLANATION = "Le plafond signifie que l'on ne peut plus ajouter d'argent dans le Livret A, mais cela n'empêche pas la capitalisation des intérêts. Ce plafond n'est pas modifiable et il n'est pas possible d'ouvrir un second Livret A.";
  let question = await prisma.question.findFirst({ where: { text: QUESTION_TEXT } });
  if (!question) {
    question = await prisma.question.create({ data: { text: QUESTION_TEXT, explanation: QUESTION_EXPLANATION } });
    await prisma.answer.createMany({
      data: [
        { questionId: question.id, text: 'En versant plus d\'argent dessus', isCorrect: false },
        { questionId: question.id, text: 'Grâce à la capitalisation des intérêts', isCorrect: true },
        { questionId: question.id, text: 'En demandant à ma banque d\'augmenter le plafond', isCorrect: false },
        { questionId: question.id, text: 'En ouvrant un nouveau Livret A', isCorrect: false },
      ],
    });
  }
  console.log(`✅ Question créée/vérifiée: ${question.text}`);

  let quiz = await prisma.quiz.findFirst({ where: { type: 'MCQ', title: 'Quiz plafond et intérêts composés', levelId: level.id } });
  if (!quiz) {
    quiz = await prisma.quiz.create({
      data: {
        type: 'MCQ',
        title: 'Quiz plafond et intérêts composés',
        description: 'Teste tes connaissances sur le plafond du Livret A et les intérêts composés',
        levelId: level.id,
      },
    });
  }
  const existingQuizQuestion = await prisma.quizQuestion.findFirst({ where: { quizId: quiz.id, questionId: question.id } });
  if (!existingQuizQuestion) {
    await prisma.quizQuestion.create({ data: { quizId: quiz.id, questionId: question.id, position: 1 } });
  }
  console.log(`✅ Quiz MCQ créé: ${quiz.title}`);

  // 11. Notions pédagogiques
  console.log('📖 Création des notions...');
  const notionsData = [
    {
      name: 'Plafond',
      description: 'Montant au-delà duquel vous ne pouvez plus déposer d\'argent sur un livret.',
      tags: ['Vocabulaire', 'initiation'],
    },
    {
      name: 'Intérêts composés',
      description: 'Les intérêts composés sur un livret, c\'est le principe selon lequel tu gagnes des intérêts non seulement sur ton argent de départ, mais aussi sur les intérêts déjà gagnés.',
      tags: ['Vocabulaire', 'initiation'],
    },
    {
      name: 'LDDS',
      description: 'Le Livret de développement durable et solidaire (LDDS) est un produit d\'épargne réglementé, ce qui signifie que ses principales caractéristiques, notamment son taux d\'intérêt et son plafond de dépôt, sont fixées par les pouvoirs publics. Son taux d\'intérêt est de 1,5 %. Son plafond de dépôt est fixé à 12 000 €. Les intérêts sont calculés par quinzaine (le 1er et le 16 de chaque mois) en fonction des sommes déposées et de leur durée de présence sur le livret, puis capitalisés une fois par an, le 31 décembre.',
      tags: ['Livret', 'Epargne', 'produit bancaire'],
    },
  ];
  for (const n of notionsData) {
    let notion = await prisma.notion.findFirst({ where: { name: n.name } });
    notion = notion
      ? await prisma.notion.update({ where: { id: notion.id }, data: { description: n.description, tags: n.tags } })
      : await prisma.notion.create({ data: n });

    const existingLink = await prisma.notionLevel.findFirst({ where: { notionId: notion.id, levelId: level.id } });
    if (!existingLink) {
      await prisma.notionLevel.create({ data: { notionId: notion.id, levelId: level.id } });
    }
    console.log(`✅ Notion: ${notion.name} ↔ Level ${level.number}`);
  }

  // Réutiliser la notion "Livret A" du niveau 1 (existant), juste la lier au niveau 2
  const livretANotion = await prisma.notion.findFirst({ where: { name: 'Livret A' } });
  if (livretANotion) {
    const existingLink = await prisma.notionLevel.findFirst({ where: { notionId: livretANotion.id, levelId: level.id } });
    if (!existingLink) {
      await prisma.notionLevel.create({ data: { notionId: livretANotion.id, levelId: level.id } });
    }
    console.log(`✅ Notion existante réutilisée: Livret A ↔ Level ${level.number}`);
  }

  // 12. Tips (indices), par palier d'étoile
  console.log('💡 Création des tips...');
  const tipsData: Array<{ category: 'FIRST_STAR' | 'SECOND_STAR'; text: string; position: number }> = [
    { category: 'FIRST_STAR', text: 'As-tu bien des cashous dans les deux livrets à la fin de la partie ?', position: 1 },
    { category: 'FIRST_STAR', text: 'Le plafond de ton Livret A est-il bien atteint à la fin de la partie ?', position: 2 },
    { category: 'SECOND_STAR', text: 'As-tu bien maximisé le montant de tes placements ?', position: 1 },
  ];
  for (const tip of tipsData) {
    const existingTip = await prisma.tip.findFirst({ where: { levelId: level.id, category: tip.category, position: tip.position } });
    if (existingTip) {
      await prisma.tip.update({ where: { id: existingTip.id }, data: { text: tip.text } });
    } else {
      await prisma.tip.create({ data: { levelId: level.id, category: tip.category, text: tip.text, position: tip.position } });
    }
  }
  console.log(`✅ ${tipsData.length} tips créés/vérifiés (2 pour la 1ère étoile, 1 pour la 2ème)`);

  console.log('\n✨ ========================================');
  console.log('✅ Seeding du niveau 2 terminé avec succès !');
  console.log('========================================');
  console.log(`📊 Résumé des données créées :`);
  console.log(`   - 2 Assets: ${livretA.symbol} (existant), ${ldds.symbol} (nouveau)`);
  console.log(`   - 1 Level: ${level.title} (Niveau ${level.number})`);
  console.log(`   - 1 Starting holding: ${livretA.symbol} = 20950€`);
  console.log(`   - 1 Event: ${event.title} (CASH_GRANT +300€ à ${levelEvent.triggerPercent}%)`);
  console.log(`   - 3 Goals: ${goalTwoLivrets.title}, ${goalLivretAMax.title} (obligatoires), ${goalMaxInterest.title} (bonus)`);
  console.log(`   - 1 Quiz MCQ avec 1 question`);
  console.log(`   - 4 Notions liées au niveau 2 (dont 1 réutilisée du niveau 1)`);
  console.log(`   - 3 Tips (2 étoile 1, 1 étoile 2)`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding du niveau 2 :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
