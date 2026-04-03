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
  console.log('🌱 Début du seeding du niveau 4 - Diversification avancée...');

  // Reset all sequences to avoid ID conflicts
  await resetSequences();

  // 1. Market
  console.log('📊 Récupération du marché général...');
  let market = await prisma.market.findFirst({
    where: { title: 'Marché général ESP' },
  });

  if (market) {
    market = await prisma.market.update({
      where: { id: market.id },
      data: {
        description: 'Marché regroupant les enveloppes disponibles pour la démo ESP : livret, assurance vie et bourse ETF.',
      },
    });
  } else {
    market = await prisma.market.create({
      data: {
        title: 'Marché général ESP',
        description: 'Marché regroupant les enveloppes disponibles pour la démo ESP : livret, assurance vie et bourse ETF.',
      },
    });
  }
  console.log(`✅ Marché créé: ${market.title} (ID: ${market.id})`);

  // 2. Submarkets (3 enveloppes)
  console.log('🌐 Création des sous-marchés...');

  const submarketDefs = [
    { title: 'Livret', description: 'Épargne sécurisée à taux garanti.', type: 'SAVINGS' as const },
    { title: 'Assurance Vie', description: 'Placement à moyen terme avec rendement modéré.', type: 'INSURANCE' as const },
    { title: 'Bourse - ETF', description: 'Fonds indiciels cotés en bourse, plus risqués mais plus rémunérateurs.', type: 'STOCK' as const },
  ];

  const submarkets: Record<string, Awaited<ReturnType<typeof prisma.submarket.create>>> = {};
  for (const def of submarketDefs) {
    let sub = await prisma.submarket.findFirst({
      where: { title: def.title, marketId: market.id },
    });

    if (sub) {
      sub = await prisma.submarket.update({
        where: { id: sub.id },
        data: { description: def.description, marketId: market.id, type: def.type },
      });
    } else {
      sub = await prisma.submarket.create({
        data: { title: def.title, description: def.description, marketId: market.id, type: def.type },
      });
    }
    submarkets[def.title] = sub;
    console.log(`✅ Sous-marché: ${sub.title} (ID: ${sub.id})`);
  }

  // 3. Assets (4 produits financiers)
  console.log('💰 Création des actifs...');

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
    {
      symbol: 'ETF_CAP41',
      title: 'ETF CAP 41',
      rate: 8,
      maxAmount: null,
      minAmount: 10,
      submarket: 'Bourse - ETF',
      description: 'Fonds indiciel répliquant les 41 plus grandes entreprises françaises. Rendement élevé, risque modéré.',
    },
    {
      symbol: 'ETF_PS501',
      title: 'ETF P&S 501',
      rate: 10,
      maxAmount: null,
      minAmount: 10,
      submarket: 'Bourse - ETF',
      description: 'Fonds indiciel répliquant les 501 plus grandes entreprises américaines. Rendement très élevé, risque élevé.',
    },
  ];

  const assets: Record<string, Awaited<ReturnType<typeof prisma.asset.upsert>>> = {};
  for (const def of assetDefs) {
    const sub = submarkets[def.submarket];
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

  // 4. Level — Find or create Level 4
  console.log('📚 Création du niveau 4 - Diversification avancée...');

  const levelData = {
    title: 'Diversification avancée',
    number: 28,
    duration: 548,
    speed: 394650,
    startBalance: 5000,
    pointsRequired: 500,
    historyStartDay: 365,
    description: 'Maîtrise l\'art de la diversification entre livret, assurance vie et ETF. Gère deux événements de marché pour protéger et faire croître ton capital.',
  };

  let level = await prisma.level.findFirst({
    where: { number: 28 },
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
  console.log(`✅ Niveau mis à jour: ${level.title} (ID: ${level.id}, Niveau ${level.number})`);

  // 5. Events + Impacts
  console.log('🎯 Création des événements et impacts...');

  const eventDefs = [
    {
      title: 'Bulle immobilière',
      description: 'Une bulle immobilière éclate. Les marchés financiers sont secoués mais les placements sécurisés résistent.',
      hasImpact: true,
      impacts: [
        { symbol: 'ETF_CAP41', coef: 0.8 },
        { symbol: 'ETF_PS501', coef: 0.75 },
      ],
      triggerPercent: 30,
      position: 1,
    },
    {
      title: 'Relance économique',
      description: 'Le gouvernement lance un plan de relance massif. Les marchés rebondissent fortement.',
      hasImpact: true,
      impacts: [
        { symbol: 'ETF_CAP41', coef: 1.35 },
        { symbol: 'ETF_PS501', coef: 1.4 },
        { symbol: 'ASSURANCE_SERENITE', coef: 1.1 },
      ],
      triggerPercent: 70,
      position: 2,
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
      title: 'Diversifie sur 3 enveloppes',
      description: 'Investis dans les 3 types d\'enveloppes.',
      goalType: 'min_submarkets_invested',
      goalValue: 3,
      isMandatory: true,
      successMessage: 'Bravo ! Tu as bien diversifié tes placements dans les 3 enveloppes.',
      failureMessage: 'Tu n\'as pas suffisamment diversifié. Pense à répartir tes investissements dans les 3 enveloppes !',
    },
    {
      title: 'Capital en croissance',
      description: 'Termine avec au moins 5 300 €.',
      goalType: 'wallet_min',
      goalValue: 5300,
      isMandatory: true,
      successMessage: 'Excellent ! Ton capital a bien grandi grâce à tes placements.',
      failureMessage: 'Tu n\'as pas atteint les 5 300 €. Essaie de placer plus tôt et dans des produits plus rémunérateurs !',
    },
    {
      title: 'Maître de la diversification',
      description: 'Termine avec au moins 5 800 €.',
      goalType: 'wallet_min',
      goalValue: 5800,
      isMandatory: false,
      successMessage: 'Impressionnant ! Tu es un vrai maître de la diversification !',
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

  // 7. Quiz MCQ pour le niveau 4
  console.log('❓ Création des questions et réponses pour le quiz MCQ...');

  const quizQuestions = [
    {
      text: 'Qu\'est-ce que la corrélation entre deux placements ?',
      explanation: 'La corrélation mesure comment deux actifs évoluent l\'un par rapport à l\'autre. Diversifier avec des actifs faiblement corrélés (ex: livret + ETF) réduit le risque global car quand l\'un baisse, l\'autre peut rester stable.',
      answers: [
        { text: 'La tendance de deux actifs à évoluer dans le même sens ou en sens opposé', isCorrect: true },
        { text: 'Le fait que deux placements aient le même prix', isCorrect: false },
        { text: 'Le nombre de placements dans un portefeuille', isCorrect: false },
        { text: 'Les frais partagés entre deux placements', isCorrect: false },
      ],
    },
    {
      text: 'Pourquoi combiner des placements sécurisés et risqués ?',
      explanation: 'Un portefeuille équilibré combine la stabilité des placements sécurisés et le potentiel de croissance des placements risqués. Cela permet de limiter les pertes en cas de crise tout en profitant des hausses de marché.',
      answers: [
        { text: 'Pour équilibrer sécurité et performance dans son portefeuille', isCorrect: true },
        { text: 'Pour compliquer sa gestion financière', isCorrect: false },
        { text: 'Car c\'est obligatoire légalement', isCorrect: false },
        { text: 'Pour payer plus de frais', isCorrect: false },
      ],
    },
    {
      text: 'Qu\'est-ce que le rééquilibrage de portefeuille ?',
      explanation: 'Le rééquilibrage consiste à vendre une partie des actifs qui ont trop monté et acheter ceux qui ont baissé pour revenir à la répartition souhaitée. Cela force à acheter bas et vendre haut.',
      answers: [
        { text: 'Ajuster la répartition de ses placements pour revenir à sa stratégie initiale', isCorrect: true },
        { text: 'Vendre tous ses actifs et recommencer', isCorrect: false },
        { text: 'Investir uniquement dans le placement qui a le plus monté', isCorrect: false },
        { text: 'Retirer tout son argent et le mettre en banque', isCorrect: false },
      ],
    },
    {
      text: 'Lors d\'une crise, quel comportement est le plus adapté ?',
      explanation: 'En période de crise, la priorité est de s\'assurer que son épargne de précaution (livret) est suffisante. Les placements boursiers fluctuent mais récupèrent historiquement.',
      answers: [
        { text: 'Vérifier que son épargne de précaution est intacte et attendre la reprise', isCorrect: true },
        { text: 'Tout vendre immédiatement', isCorrect: false },
        { text: 'Investir massivement en bourse', isCorrect: false },
        { text: 'Fermer tous ses comptes', isCorrect: false },
      ],
    },
    {
      text: 'Quel pourcentage de son capital est-il prudent de placer en bourse pour un débutant ?',
      explanation: 'Pour un débutant, il est recommandé de ne pas investir plus de 20 à 30% en bourse. Le reste doit être placé en produits sécurisés. Cette proportion peut augmenter avec l\'expérience et la tolérance au risque.',
      answers: [
        { text: '20 à 30% maximum, le reste en placements sécurisés', isCorrect: true },
        { text: '100%, c\'est le meilleur rendement', isCorrect: false },
        { text: '0%, la bourse est trop dangereuse', isCorrect: false },
        { text: '50% minimum pour que ça vaille le coup', isCorrect: false },
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
      title: 'Quiz diversification avancée',
      levelId: level.id,
    },
  });

  if (!mcqQuiz) {
    mcqQuiz = await prisma.quiz.create({
      data: {
        type: 'MCQ',
        title: 'Quiz diversification avancée',
        description: 'Teste tes connaissances sur la diversification, le rééquilibrage et la corrélation entre placements',
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
  console.log('✅ Seeding du niveau 4 terminé avec succès !');
  console.log('========================================');
  console.log('📊 Résumé des données créées :');
  console.log(`   - 1 Market: ${market.title}`);
  console.log(`   - 3 Submarkets: Livret, Assurance Vie, Bourse - ETF`);
  console.log(`   - 4 Assets: ${Object.keys(assets).join(', ')}`);
  console.log(`   - 1 Level: ${level.title} (ID: ${level.id}, Niveau ${level.number}, ~3min de jeu)`);
  console.log(`   - 2 Events: Bulle immobilière, Relance économique`);
  console.log(`   - 5 Impacts sur les assets`);
  console.log(`   - 3 Goals: 2 obligatoires + 1 bonus`);
  console.log(`   - 1 Quiz MCQ: ${createdQuestions.length} questions`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding du niveau 4 :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
