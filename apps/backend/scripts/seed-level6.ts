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
  console.log('🌱 Début du seeding du niveau 6 - Expert financier...');

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

  // 4. Level 6 — Expert financier
  console.log('📚 Création du niveau 6 - Expert financier...');

  let level = await prisma.level.findFirst({
    where: { number: 30 },
  });

  const levelData = {
    title: 'Expert financier',
    number: 30,
    duration: 730,
    speed: 525800,
    startBalance: 8000,
    pointsRequired: 1200,
    historyStartDay: 365,
    description: 'Le niveau ultime ! Gère un portefeuille complet avec tous les produits, affronte 3 événements majeurs et prouve que tu maîtrises la finance personnelle.',
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
  console.log(`✅ Niveau créé: ${level.title} (ID: ${level.id}, Niveau ${level.number})`);

  // 5. Events + Impacts
  console.log('🎯 Création des événements et impacts...');

  const eventDefs = [
    {
      title: 'Innovation disruptive',
      description: 'Une révolution technologique bouleverse les marchés. Les entreprises tech explosent.',
      hasImpact: true,
      impacts: [
        { symbol: 'ETF_CAP41', coef: 1.25 },
        { symbol: 'ETF_PS501', coef: 1.4 },
      ],
      triggerPercent: 20,
      position: 1,
    },
    {
      title: 'Crise de la dette souveraine',
      description: 'Plusieurs pays européens font face à une crise de la dette. Les marchés plongent et l\'assurance vie est touchée.',
      hasImpact: true,
      impacts: [
        { symbol: 'ETF_CAP41', coef: 0.65 },
        { symbol: 'ETF_PS501', coef: 0.7 },
        { symbol: 'ASSURANCE_SERENITE', coef: 0.85 },
      ],
      triggerPercent: 50,
      position: 2,
    },
    {
      title: 'Reprise et inflation',
      description: 'L\'économie repart mais l\'inflation s\'installe. Les actifs réels prennent de la valeur.',
      hasImpact: true,
      impacts: [
        { symbol: 'ETF_CAP41', coef: 1.2 },
        { symbol: 'ETF_PS501', coef: 1.3 },
        { symbol: 'ASSURANCE_SERENITE', coef: 1.05 },
      ],
      triggerPercent: 80,
      position: 3,
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
      title: 'Portefeuille complet',
      description: 'Investis dans les 3 types d\'enveloppes.',
      goalType: 'min_submarkets_invested',
      goalValue: 3,
      isMandatory: true,
      successMessage: 'Bravo ! Tu as investi dans les 3 types d\'enveloppes.',
      failureMessage: 'Tu n\'as pas investi dans les 3 types d\'enveloppes. Pense à diversifier !',
    },
    {
      title: 'Performance solide',
      description: 'Termine avec au moins 8 800 €.',
      goalType: 'wallet_min',
      goalValue: 8800,
      isMandatory: true,
      successMessage: 'Excellent ! Tu as atteint une performance solide avec au moins 8 800 €.',
      failureMessage: 'Tu n\'as pas atteint les 8 800 €. Essaie d\'investir plus tôt et de mieux diversifier !',
    },
    {
      title: 'Vrai expert',
      description: 'Termine avec au moins 9 500 €.',
      goalType: 'wallet_min',
      goalValue: 9500,
      isMandatory: false,
      successMessage: 'Impressionnant ! Tu es un vrai expert de la finance personnelle !',
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

  // 7. Quiz MCQ pour le niveau 6
  console.log('❓ Création des questions et réponses pour le quiz MCQ...');

  const quizQuestions = [
    {
      text: 'Qu\'est-ce que l\'inflation et comment affecte-t-elle l\'épargne ?',
      explanation: 'L\'inflation est la hausse généralisée et durable des prix. Si votre épargne rapporte 1,7% mais que l\'inflation est à 3%, vous perdez du pouvoir d\'achat. C\'est pourquoi il est important d\'investir une partie de son argent dans des actifs qui battent l\'inflation.',
      answers: [
        { text: 'La hausse générale des prix qui réduit le pouvoir d\'achat de l\'épargne', isCorrect: true },
        { text: 'La baisse des taux d\'intérêt', isCorrect: false },
        { text: 'L\'augmentation du nombre de billets en circulation', isCorrect: false },
        { text: 'La hausse des salaires', isCorrect: false },
      ],
    },
    {
      text: 'Qu\'est-ce qu\'une crise de la dette souveraine ?',
      explanation: 'Une crise de la dette souveraine survient quand les investisseurs doutent de la capacité d\'un État à rembourser ses emprunts. Cela peut entraîner une hausse des taux d\'intérêt, une baisse des marchés et affecter l\'ensemble de l\'économie.',
      answers: [
        { text: 'Quand un État a des difficultés à rembourser sa dette publique', isCorrect: true },
        { text: 'Quand les particuliers ne peuvent plus payer leurs crédits', isCorrect: false },
        { text: 'Quand les entreprises font faillite', isCorrect: false },
        { text: 'Quand les banques ferment', isCorrect: false },
      ],
    },
    {
      text: 'Pourquoi l\'horizon de placement est-il important ?',
      explanation: 'Sur le long terme, les marchés boursiers ont historiquement toujours progressé malgré les crises. Un horizon de placement long permet d\'absorber les baisses temporaires et de profiter de la croissance. C\'est pourquoi les jeunes investisseurs peuvent se permettre plus de risque.',
      answers: [
        { text: 'Car plus l\'horizon est long, plus on peut tolérer de risque et espérer un meilleur rendement', isCorrect: true },
        { text: 'Car les placements expirent après une certaine durée', isCorrect: false },
        { text: 'Car les banques exigent un engagement minimum', isCorrect: false },
        { text: 'L\'horizon n\'a aucune importance', isCorrect: false },
      ],
    },
    {
      text: 'Quelle est la règle d\'or pour un portefeuille bien construit ?',
      explanation: 'Un bon portefeuille est diversifié entre différentes classes d\'actifs et adapté à votre profil (âge, objectifs, tolérance au risque). La diversification réduit le risque sans forcément réduire le rendement espéré.',
      answers: [
        { text: 'Ne jamais mettre tous ses œufs dans le même panier et adapter selon son profil', isCorrect: true },
        { text: 'Investir 100% en bourse pour maximiser les gains', isCorrect: false },
        { text: 'Ne garder que des livrets pour la sécurité', isCorrect: false },
        { text: 'Changer de stratégie à chaque événement de marché', isCorrect: false },
      ],
    },
    {
      text: 'Après avoir traversé plusieurs crises, que retient-on comme leçon principale ?',
      explanation: 'L\'histoire financière montre que les investisseurs qui réussissent le mieux sont ceux qui restent disciplinés, diversifient, et ne paniquent pas pendant les crises. La patience est récompensée sur le long terme.',
      answers: [
        { text: 'La patience et la discipline sont les qualités les plus importantes d\'un investisseur', isCorrect: true },
        { text: 'Il faut toujours suivre les tendances du moment', isCorrect: false },
        { text: 'Les crises ne se reproduisent jamais', isCorrect: false },
        { text: 'Seuls les experts peuvent investir en bourse', isCorrect: false },
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
      title: 'Quiz stratégie globale et gestion de crises',
      levelId: level.id,
    },
  });

  if (!mcqQuiz) {
    mcqQuiz = await prisma.quiz.create({
      data: {
        type: 'MCQ',
        title: 'Quiz stratégie globale et gestion de crises',
        description: 'Teste tes connaissances sur l\'inflation, la dette souveraine, l\'horizon de placement et la construction de portefeuille',
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
  console.log('✅ Seeding du niveau 6 - Expert financier terminé avec succès !');
  console.log('========================================');
  console.log('📊 Résumé des données créées :');
  console.log(`   - 1 Market: ${market.title}`);
  console.log(`   - 3 Submarkets: Livret, Assurance Vie, Bourse - ETF`);
  console.log(`   - 4 Assets: ${Object.keys(assets).join(', ')}`);
  console.log(`   - 1 Level: ${level.title} (ID: ${level.id}, Niveau ${level.number}, ~3min de jeu)`);
  console.log(`   - 3 Events: Innovation disruptive, Crise de la dette souveraine, Reprise et inflation`);
  console.log(`   - 8 Impacts sur les assets`);
  console.log(`   - 3 Goals: 2 obligatoires + 1 bonus`);
  console.log(`   - 1 Quiz MCQ: ${createdQuestions.length} questions`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding du niveau 6 :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
