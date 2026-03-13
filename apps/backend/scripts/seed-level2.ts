import { PrismaClient } from '@cashou/db-app';

const prisma = new PrismaClient();

async function resetSequences() {
  const tables = ['levels', 'markets', 'submarkets', 'events', 'impacts', 'level_events', 'level_goals', 'goals'];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`
    );
  }
}

async function main() {
  console.log('🌱 Début du seeding du niveau 2 : Comprendre l\'assurance vie...');

  // Reset all sequences to avoid ID conflicts
  await resetSequences();

  // 1. Market (reuse existing)
  console.log('📊 Récupération du marché général...');
  let market = await prisma.market.findFirst({
    where: { title: 'Marché général ESP' },
  });

  if (!market) {
    throw new Error('Marché général ESP introuvable. Exécutez d\'abord seed-level-esp.ts');
  }
  console.log(`✅ Marché trouvé: ${market.title} (ID: ${market.id})`);

  // 2. Submarkets (reuse existing)
  console.log('🌐 Récupération des sous-marchés...');

  const submarketLivret = await prisma.submarket.findFirst({
    where: { title: 'Livret', marketId: market.id },
  });
  if (!submarketLivret) throw new Error('Sous-marché "Livret" introuvable.');

  const submarketAssuranceVie = await prisma.submarket.findFirst({
    where: { title: 'Assurance Vie', marketId: market.id },
  });
  if (!submarketAssuranceVie) throw new Error('Sous-marché "Assurance Vie" introuvable.');

  const submarkets: Record<string, typeof submarketLivret> = {
    'Livret': submarketLivret,
    'Assurance Vie': submarketAssuranceVie,
  };

  for (const [title, sub] of Object.entries(submarkets)) {
    console.log(`✅ Sous-marché: ${title} (ID: ${sub!.id})`);
  }

  // 3. Assets (reuse existing, upsert with same data as ESP)
  console.log('💰 Upsert des actifs...');

  const assetDefs = [
    {
      symbol: 'LIVRET_CASHOU',
      title: 'Livret Cashou',
      rate: 1.7,
      maxAmount: 22950,
      minAmount: 10,
      submarket: 'Livret',
      description: 'Livret d\'épargne sécurisé avec un taux garanti. Aucun risque de perte.',
    },
    {
      symbol: 'ASSURANCE_SERENITE',
      title: 'Assurance Sérénité',
      rate: 2.5,
      maxAmount: null,
      minAmount: 10,
      submarket: 'Assurance Vie',
      description: 'Assurance vie en fonds euros. Rendement modéré, faible volatilité.',
    },
  ];

  const assets: Record<string, Awaited<ReturnType<typeof prisma.asset.upsert>>> = {};
  for (const def of assetDefs) {
    const sub = submarkets[def.submarket]!;
    const asset = await prisma.asset.upsert({
      where: { symbol: def.symbol },
      update: {
        title: def.title,
        rate: def.rate,
        maxAmount: def.maxAmount,
        minAmount: def.minAmount,
        marketId: market.id,
        submarketId: sub.id,
        description: def.description,
        fieldId: null,
      },
      create: {
        symbol: def.symbol,
        title: def.title,
        rate: def.rate,
        maxAmount: def.maxAmount,
        minAmount: def.minAmount,
        marketId: market.id,
        submarketId: sub.id,
        description: def.description,
        fieldId: null,
      },
    });
    assets[def.symbol] = asset;
    console.log(`✅ Actif: ${asset.title} (${asset.symbol}) - Rate: ${asset.rate}%`);
  }

  // NO price history generation — reuses ESP's history

  // 4. Level
  console.log('📚 Création/mise à jour du niveau 2...');

  const levelData = {
    title: 'Comprendre l\'assurance vie',
    number: 26,
    duration: 730,
    speed: 525800,
    startBalance: 3000,
    pointsRequired: 100,
    historyStartDay: 365,
    description: 'Découvre l\'assurance vie en fonds euros, un placement à moyen terme plus rémunérateur que le livret. Apprends à équilibrer sécurité et rendement.',
  };

  let level = await prisma.level.findFirst({
    where: { number: 26 },
  });

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
  console.log(`✅ Niveau créé/mis à jour: ${level.title} (ID: ${level.id}, Niveau ${level.number})`);

  // 5. Events + Impacts
  console.log('🎯 Création des événements et impacts...');

  const eventDefs = [
    {
      title: 'Hausse des taux directeurs',
      description: 'La banque centrale relève ses taux directeurs. Les rendements de l\'assurance vie augmentent.',
      hasImpact: true,
      impacts: [
        { symbol: 'ASSURANCE_SERENITE', coef: 1.25 },
      ],
      triggerPercent: 50,
      position: 1,
    },
  ];

  for (const def of eventDefs) {
    // Event
    let event = await prisma.event.findFirst({
      where: { title: def.title },
    });

    if (event) {
      event = await prisma.event.update({
        where: { id: event.id },
        data: { description: def.description, hasImpact: def.hasImpact },
      });
    } else {
      event = await prisma.event.create({
        data: { title: def.title, description: def.description, hasImpact: def.hasImpact },
      });
    }
    console.log(`✅ Événement: ${event.title}`);

    // Impacts
    for (const impDef of def.impacts) {
      const asset = assets[impDef.symbol];
      let impact = await prisma.impact.findFirst({
        where: { eventId: event.id, assetId: asset.id },
      });

      if (impact) {
        impact = await prisma.impact.update({
          where: { id: impact.id },
          data: { coef: impDef.coef },
        });
      } else {
        impact = await prisma.impact.create({
          data: { eventId: event.id, assetId: asset.id, coef: impDef.coef },
        });
      }
      console.log(`  💥 Impact: ${asset.symbol} × ${impact.coef}`);
    }

    // LevelEvent
    let levelEvent = await prisma.levelEvent.findFirst({
      where: { levelId: level.id, eventId: event.id },
    });

    if (levelEvent) {
      levelEvent = await prisma.levelEvent.update({
        where: { id: levelEvent.id },
        data: { triggerPercent: def.triggerPercent, position: def.position },
      });
    } else {
      levelEvent = await prisma.levelEvent.create({
        data: {
          levelId: level.id,
          eventId: event.id,
          triggerPercent: def.triggerPercent,
          position: def.position,
        },
      });
    }
    console.log(`  🔗 LevelEvent: triggerPercent=${def.triggerPercent}%, position=${def.position}`);
  }

  // 6. Goals
  console.log('🎯 Création des objectifs...');

  const goalDefs = [
    {
      title: 'Découvre l\'assurance vie',
      description: 'Investis dans au moins 2 enveloppes différentes.',
      goalType: 'min_submarkets_invested',
      goalValue: 2,
      isMandatory: true,
      successMessage: 'Bravo ! Tu as investi dans les 2 enveloppes disponibles.',
      failureMessage: 'Tu n\'as pas suffisamment diversifié. Pense à investir dans les 2 enveloppes !',
    },
    {
      title: 'Fais fructifier ton capital',
      description: 'Termine avec au moins 3 100 € de capital total.',
      goalType: 'wallet_min',
      goalValue: 3100,
      isMandatory: true,
      successMessage: 'Excellent ! Ton capital a bien grandi grâce à tes placements.',
      failureMessage: 'Tu n\'as pas atteint les 3 100 €. Essaie de placer plus tôt et dans des produits plus rémunérateurs !',
    },
    {
      title: 'Rendement optimal',
      description: 'Termine avec au moins 3 300 € de capital total.',
      goalType: 'wallet_min',
      goalValue: 3300,
      isMandatory: false,
      successMessage: 'Impressionnant ! Tu as su tirer le meilleur parti de tes placements !',
      failureMessage: 'L\'objectif bonus n\'est pas atteint, mais tu peux faire mieux la prochaine fois.',
    },
  ];

  for (const def of goalDefs) {
    let goal = await prisma.goal.findFirst({
      where: { title: def.title },
    });

    if (goal) {
      goal = await prisma.goal.update({
        where: { id: goal.id },
        data: {
          description: def.description,
          goalType: def.goalType,
          goalValue: def.goalValue,
          successMessage: def.successMessage,
          failureMessage: def.failureMessage,
        },
      });
    } else {
      goal = await prisma.goal.create({
        data: {
          title: def.title,
          description: def.description,
          goalType: def.goalType,
          goalValue: def.goalValue,
          successMessage: def.successMessage,
          failureMessage: def.failureMessage,
        },
      });
    }
    console.log(`✅ Objectif: ${goal.title} (${def.goalType}, mandatory=${def.isMandatory})`);

    // LevelGoal
    let levelGoal = await prisma.levelGoal.findFirst({
      where: { levelId: level.id, goalId: goal.id },
    });

    if (!levelGoal) {
      levelGoal = await prisma.levelGoal.create({
        data: {
          levelId: level.id,
          goalId: goal.id,
          isMandatory: def.isMandatory,
        } as { levelId: number; goalId: number; isMandatory?: boolean },
      });
    }
    console.log(`  🔗 LevelGoal: Level ${level.number} ↔ "${goal.title}" (${def.isMandatory ? 'obligatoire' : 'bonus'})`);
  }

  // 7. Quiz MCQ pour le niveau 2
  console.log('❓ Création des questions et réponses pour le quiz MCQ...');

  const quizQuestions = [
    {
      text: 'Qu\'est-ce qu\'une assurance vie en fonds euros ?',
      explanation: 'L\'assurance vie en fonds euros est un placement où l\'assureur garantit le capital investi et verse un rendement annuel. C\'est l\'un des placements préférés des Français car il combine sécurité et rendement supérieur aux livrets.',
      answers: [
        { text: 'Un placement sécurisé avec un rendement garanti par l\'assureur', isCorrect: true },
        { text: 'Un contrat qui assure votre voiture', isCorrect: false },
        { text: 'Un placement boursier à haut risque', isCorrect: false },
        { text: 'Un compte courant rémunéré', isCorrect: false },
      ],
    },
    {
      text: 'Quelle est la différence principale entre un livret et une assurance vie ?',
      explanation: 'Le livret offre une disponibilité immédiate mais un rendement modeste. L\'assurance vie en fonds euros offre un meilleur rendement mais avec une disponibilité moindre et parfois des frais de retrait avant 8 ans.',
      answers: [
        { text: 'L\'assurance vie offre un meilleur rendement mais l\'argent est moins disponible', isCorrect: true },
        { text: 'Il n\'y a aucune différence', isCorrect: false },
        { text: 'Le livret rapporte plus', isCorrect: false },
        { text: 'L\'assurance vie est gratuite', isCorrect: false },
      ],
    },
    {
      text: 'Pourquoi les taux directeurs influencent-ils l\'assurance vie ?',
      explanation: 'Les fonds euros des assurances vie investissent principalement en obligations d\'État et d\'entreprises. Quand la banque centrale relève ses taux directeurs, les nouvelles obligations offrent de meilleurs rendements, ce qui profite aux fonds euros.',
      answers: [
        { text: 'Car les fonds euros investissent en obligations dont le rendement dépend des taux', isCorrect: true },
        { text: 'Car l\'État fixe le taux de l\'assurance vie', isCorrect: false },
        { text: 'Il n\'y a aucun lien', isCorrect: false },
        { text: 'Car les assureurs sont des banques', isCorrect: false },
      ],
    },
    {
      text: 'Après combien d\'années bénéficie-t-on d\'avantages fiscaux sur l\'assurance vie ?',
      explanation: 'Après 8 ans de détention, l\'assurance vie bénéficie d\'un abattement fiscal avantageux sur les gains. Les retraits avant 8 ans sont davantage taxés, ce qui encourage l\'épargne à long terme.',
      answers: [
        { text: '8 ans', isCorrect: true },
        { text: '1 an', isCorrect: false },
        { text: '5 ans', isCorrect: false },
        { text: 'Il n\'y a jamais d\'avantage fiscal', isCorrect: false },
      ],
    },
    {
      text: 'Quel est l\'avantage principal de combiner livret et assurance vie ?',
      explanation: 'Combiner livret et assurance vie permet d\'avoir une épargne de précaution immédiatement disponible (livret) tout en faisant fructifier le reste à un meilleur taux (assurance vie). C\'est le principe de la complémentarité des placements.',
      answers: [
        { text: 'Avoir une partie disponible immédiatement et une partie qui rapporte plus', isCorrect: true },
        { text: 'Payer moins d\'impôts', isCorrect: false },
        { text: 'Doubler ses intérêts automatiquement', isCorrect: false },
        { text: 'Aucun avantage, un seul placement suffit', isCorrect: false },
      ],
    },
  ];

  const createdQuestions = [];
  for (const q of quizQuestions) {
    let question = await prisma.question.findFirst({
      where: { text: q.text },
    });

    if (!question) {
      question = await prisma.question.create({
        data: { text: q.text, explanation: q.explanation },
      });

      await prisma.answer.createMany({
        data: q.answers.map((a) => ({
          questionId: question!.id,
          text: a.text,
          isCorrect: a.isCorrect,
        })),
      });
    } else {
      if (!question.explanation && q.explanation) {
        question = await prisma.question.update({
          where: { id: question.id },
          data: { explanation: q.explanation },
        });
      }

      const existingAnswers = await prisma.answer.findMany({
        where: { questionId: question.id },
      });

      if (existingAnswers.length === 0) {
        await prisma.answer.createMany({
          data: q.answers.map((a) => ({
            questionId: question!.id,
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        });
      }
    }

    createdQuestions.push(question);
  }
  console.log(`✅ ${createdQuestions.length} questions vérifiées/créées avec leurs réponses`);

  // 8. Créer le Quiz MCQ lié au niveau
  console.log('🧠 Création du quiz MCQ...');
  let mcqQuiz = await prisma.quiz.findFirst({
    where: {
      type: 'MCQ',
      title: 'Quiz assurance vie et fonds euros',
      levelId: level.id,
    },
  });

  if (!mcqQuiz) {
    mcqQuiz = await prisma.quiz.create({
      data: {
        type: 'MCQ',
        title: 'Quiz assurance vie et fonds euros',
        description: 'Teste tes connaissances sur l\'assurance vie en fonds euros, les taux directeurs et la fiscalité',
        levelId: level.id,
      },
    });
    console.log(`✅ Quiz MCQ créé: ${mcqQuiz.title}`);
  } else {
    console.log(`✅ Quiz MCQ existe déjà: ${mcqQuiz.title}`);
  }

  // 9. Lier les questions au quiz MCQ
  console.log('🔗 Liaison questions-quiz MCQ...');
  for (let i = 0; i < createdQuestions.length; i++) {
    const existingLink = await prisma.quizQuestion.findFirst({
      where: {
        quizId: mcqQuiz.id,
        questionId: createdQuestions[i].id,
      },
    });

    if (!existingLink) {
      await prisma.quizQuestion.create({
        data: {
          quizId: mcqQuiz.id,
          questionId: createdQuestions[i].id,
          position: i + 1,
        },
      });
    }
  }
  console.log(`✅ ${createdQuestions.length} questions liées au quiz MCQ`);

  // Résumé
  console.log('\n✨ ========================================');
  console.log('✅ Seeding du niveau 2 terminé avec succès !');
  console.log('========================================');
  console.log('📊 Résumé des données créées :');
  console.log(`   - Marché réutilisé: ${market.title}`);
  console.log(`   - 2 Submarkets réutilisés: Livret, Assurance Vie`);
  console.log(`   - 2 Assets: ${Object.keys(assets).join(', ')}`);
  console.log(`   - Pas de génération d'historique (réutilise celui d'ESP)`);
  console.log(`   - 1 Level: ${level.title} (ID: ${level.id}, Niveau ${level.number}, ~3min de jeu)`);
  console.log(`   - 1 Event: Hausse des taux directeurs`);
  console.log(`   - 1 Impact sur ASSURANCE_SERENITE`);
  console.log(`   - 3 Goals: 2 obligatoires + 1 bonus`);
  console.log(`   - 1 Quiz MCQ: ${createdQuestions.length} questions`);
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
