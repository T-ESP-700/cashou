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
  console.log('🌱 Début du seeding du niveau 5 : Gérer les crises...');

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
  console.log(`✅ Marché: ${market.title} (ID: ${market.id})`);

  // 2. Submarkets (3 enveloppes)
  console.log('🌐 Récupération des sous-marchés...');

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
  console.log('💰 Récupération des actifs...');

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

  // 4. Level — Find or create Level 5
  console.log('📚 Création du niveau 5 : Gérer les crises...');

  const levelData = {
    title: 'Gérer les crises',
    number: 29,
    duration: 548,
    speed: 394650,
    startBalance: 6000,
    pointsRequired: 800,
    historyStartDay: 365,
    description: 'Affronte des crises financières sévères. Apprends à protéger ton patrimoine quand les marchés s\'effondrent et à saisir les opportunités de rebond.',
  };

  let level = await prisma.level.findFirst({
    where: { number: 29 },
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
  console.log(`✅ Niveau créé: ${level.title} (ID: ${level.id}, Niveau ${level.number})`);

  // 5. Events + Impacts
  console.log('🎯 Création des événements et impacts...');

  const eventDefs = [
    {
      title: 'Krach financier mondial',
      description: 'Une crise financière mondiale secoue tous les marchés. Les actions s\'effondrent et même les placements sécurisés tremblent.',
      hasImpact: true,
      impacts: [
        { symbol: 'ETF_CAP41', coef: 0.6 },
        { symbol: 'ETF_PS501', coef: 0.5 },
        { symbol: 'ASSURANCE_SERENITE', coef: 0.9 },
      ],
      triggerPercent: 25,
      position: 1,
    },
    {
      title: 'Plan de sauvetage international',
      description: 'Les banques centrales mondiales interviennent massivement. Les marchés rebondissent progressivement.',
      hasImpact: true,
      impacts: [
        { symbol: 'ETF_CAP41', coef: 1.5 },
        { symbol: 'ETF_PS501', coef: 1.6 },
        { symbol: 'ASSURANCE_SERENITE', coef: 1.15 },
      ],
      triggerPercent: 65,
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
      title: 'Survis à la crise',
      description: 'Ne perds pas d\'argent malgré le krach.',
      goalType: 'wallet_gte_start',
      goalValue: 0,
      isMandatory: true,
      successMessage: 'Bravo ! Tu as survécu à la crise sans perdre d\'argent.',
      failureMessage: 'Tu as perdu de l\'argent pendant la crise. Pense à diversifier et à protéger ton capital !',
    },
    {
      title: 'Diversification solide',
      description: 'Maintiens des investissements dans les 3 enveloppes.',
      goalType: 'min_submarkets_invested',
      goalValue: 3,
      isMandatory: true,
      successMessage: 'Excellent ! Tu as maintenu une diversification solide pendant la crise.',
      failureMessage: 'Tu n\'as pas diversifié suffisamment. En période de crise, il est crucial de répartir ses placements dans les 3 enveloppes !',
    },
    {
      title: 'Profiteur de crise',
      description: 'Termine avec au moins 6 800 € en profitant du rebond.',
      goalType: 'wallet_min',
      goalValue: 6800,
      isMandatory: false,
      successMessage: 'Impressionnant ! Tu as su profiter du rebond pour faire fructifier ton capital !',
      failureMessage: 'L\'objectif bonus n\'est pas atteint. Essaie d\'acheter pendant la baisse pour profiter du rebond !',
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

  // 7. Quiz MCQ pour le niveau 5
  console.log('❓ Création des questions et réponses pour le quiz MCQ...');

  const quizQuestions = [
    {
      text: 'Qu\'est-ce qu\'un krach boursier ?',
      explanation: 'Un krach boursier est une chute rapide et importante (souvent plus de 20%) des cours sur les marchés financiers. Il est souvent déclenché par une perte de confiance des investisseurs et peut être amplifié par la panique.',
      answers: [
        { text: 'Une chute brutale et importante des cours sur les marchés financiers', isCorrect: true },
        { text: 'Une hausse soudaine des prix', isCorrect: false },
        { text: 'La fermeture définitive d\'une bourse', isCorrect: false },
        { text: 'Un bug informatique dans les systèmes bancaires', isCorrect: false },
      ],
    },
    {
      text: 'Comment les banques centrales interviennent-elles en cas de crise ?',
      explanation: 'Les banques centrales disposent de plusieurs outils : baisser les taux directeurs pour faciliter l\'emprunt, acheter des obligations pour injecter des liquidités, et communiquer pour rassurer les marchés. Ces mesures visent à stabiliser l\'économie.',
      answers: [
        { text: 'En baissant les taux directeurs et en injectant des liquidités dans l\'économie', isCorrect: true },
        { text: 'En fermant les marchés boursiers', isCorrect: false },
        { text: 'En distribuant de l\'argent directement aux citoyens', isCorrect: false },
        { text: 'En interdisant les ventes d\'actions', isCorrect: false },
      ],
    },
    {
      text: 'Pourquoi les livrets restent-ils stables pendant un krach ?',
      explanation: 'Les livrets réglementés sont garantis par l\'État français. Leur taux est fixé administrativement et ne dépend pas des fluctuations des marchés financiers. C\'est ce qui en fait des valeurs refuges en période de crise.',
      answers: [
        { text: 'Car leur taux est garanti par l\'État et indépendant des marchés', isCorrect: true },
        { text: 'Car personne ne retire son argent pendant une crise', isCorrect: false },
        { text: 'Car les banques cachent les pertes', isCorrect: false },
        { text: 'Les livrets perdent aussi de la valeur', isCorrect: false },
      ],
    },
    {
      text: 'Quelle est la meilleure attitude face à un krach quand on est jeune investisseur ?',
      explanation: 'Pour un jeune investisseur avec un horizon long, un krach peut être une opportunité d\'acheter des actifs à prix réduit. Historiquement, les marchés se sont toujours remis des crises. La clé est de ne pas paniquer et de continuer à investir régulièrement.',
      answers: [
        { text: 'Considérer la baisse comme une opportunité d\'achat à prix réduit', isCorrect: true },
        { text: 'Vendre tout et ne plus jamais investir', isCorrect: false },
        { text: 'Emprunter pour investir massivement', isCorrect: false },
        { text: 'Ignorer complètement ses placements', isCorrect: false },
      ],
    },
    {
      text: 'Qu\'est-ce que l\'effet \'flight to quality\' en période de crise ?',
      explanation: 'Le \'flight to quality\' (fuite vers la qualité) décrit le comportement des investisseurs qui, en période de crise, vendent leurs actifs risqués pour se réfugier dans des placements sûrs comme les obligations d\'État ou les livrets. C\'est pourquoi les actifs sécurisés résistent mieux.',
      answers: [
        { text: 'Le mouvement des investisseurs vers des placements plus sûrs', isCorrect: true },
        { text: 'La hausse des prix des billets d\'avion', isCorrect: false },
        { text: 'L\'amélioration de la qualité des produits financiers', isCorrect: false },
        { text: 'La fermeture des mauvais placements', isCorrect: false },
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
      title: 'Quiz crises financières et protection du patrimoine',
      levelId: level.id,
    },
  });

  if (!mcqQuiz) {
    mcqQuiz = await prisma.quiz.create({
      data: {
        type: 'MCQ',
        title: 'Quiz crises financières et protection du patrimoine',
        description: 'Teste tes connaissances sur les crises financières, le comportement des investisseurs et le rôle des banques centrales',
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
  console.log('✅ Seeding du niveau 5 terminé avec succès !');
  console.log('========================================');
  console.log('📊 Résumé des données créées :');
  console.log(`   - 1 Market: ${market.title}`);
  console.log(`   - 3 Submarkets: Livret, Assurance Vie, Bourse - ETF`);
  console.log(`   - 4 Assets: ${Object.keys(assets).join(', ')}`);
  console.log(`   - 1 Level: ${level.title} (ID: ${level.id}, Niveau ${level.number}, ~3min de jeu)`);
  console.log(`   - 2 Events: Krach financier mondial, Plan de sauvetage international`);
  console.log(`   - 6 Impacts sur les assets`);
  console.log(`   - 3 Goals: 2 obligatoires + 1 bonus`);
  console.log(`   - 1 Quiz MCQ: ${createdQuestions.length} questions`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding du niveau 5 :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
