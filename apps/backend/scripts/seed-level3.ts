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
  console.log('🌱 Début du seeding du niveau 3 : Premiers pas en bourse...');

  // Reset all sequences to avoid ID conflicts
  await resetSequences();

  // 1. Market (reuse existing)
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

  // 2. Submarkets (reuse existing 3 enveloppes)
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

  // 3. Assets (reuse 3 existing assets by symbol, same data as ESP)
  console.log('💰 Récupération/création des actifs...');

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

  // NO price history generation — reuses ESP's history

  // 4. Level
  console.log('📚 Création du niveau 3 : Premiers pas en bourse...');

  const levelData = {
    title: 'Premiers pas en bourse',
    number: 27,
    duration: 730,
    speed: 525800,
    startBalance: 4000,
    pointsRequired: 250,
    historyStartDay: 365,
    description: 'Découvre les ETF et le monde de la bourse. Apprends à gérer le risque et la volatilité tout en cherchant un meilleur rendement.',
  };

  let level = await prisma.level.findFirst({
    where: { number: 27 },
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
      title: 'Correction boursière',
      description: 'Les marchés corrigent après plusieurs mois de hausse. Les actions perdent de la valeur.',
      hasImpact: true,
      impacts: [
        { symbol: 'ETF_CAP41', coef: 0.75 },
      ],
      triggerPercent: 40,
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
      title: 'Investis en bourse',
      description: 'Investis dans au moins 2 enveloppes dont la bourse.',
      goalType: 'min_submarkets_invested',
      goalValue: 2,
      isMandatory: true,
      successMessage: 'Bravo ! Tu as investi dans plusieurs enveloppes dont la bourse.',
      failureMessage: 'Tu n\'as pas investi dans suffisamment d\'enveloppes. Pense à diversifier tes placements dont la bourse !',
    },
    {
      title: 'Protège ton capital',
      description: 'Ne perds pas d\'argent malgré la volatilité.',
      goalType: 'wallet_gte_start',
      goalValue: 0,
      isMandatory: true,
      successMessage: 'Excellent ! Tu as su protéger ton capital malgré la volatilité des marchés.',
      failureMessage: 'Tu as perdu de l\'argent. La gestion du risque est essentielle en bourse !',
    },
    {
      title: 'Trader en herbe',
      description: 'Termine avec au moins 4 400 €.',
      goalType: 'wallet_min',
      goalValue: 4400,
      isMandatory: false,
      successMessage: 'Impressionnant ! Tu as su faire fructifier ton capital au-delà de 4 400 € !',
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

  // 7. Quiz MCQ pour le niveau 3
  console.log('❓ Création des questions et réponses pour le quiz MCQ...');

  const quizQuestions = [
    {
      text: 'Qu\'est-ce que la volatilité en bourse ?',
      explanation: 'La volatilité mesure l\'ampleur des fluctuations de prix. Un actif très volatil voit son prix varier fortement, ce qui représente un risque mais aussi une opportunité de gain.',
      answers: [
        { text: 'L\'amplitude des variations de prix d\'un actif', isCorrect: true },
        { text: 'Le nombre de transactions par jour', isCorrect: false },
        { text: 'Le prix d\'une action', isCorrect: false },
        { text: 'Les frais de courtage', isCorrect: false },
      ],
    },
    {
      text: 'Que se passe-t-il quand un ETF perd 25% de sa valeur ?',
      explanation: 'Les mathématiques des pertes sont asymétriques. Si un actif à 100€ perd 25%, il vaut 75€. Pour revenir à 100€, il faut une hausse de 33% (75 × 1.33 = 100). Plus la perte est grande, plus le chemin du retour est difficile.',
      answers: [
        { text: 'Il faut une hausse de 33% pour retrouver le niveau initial', isCorrect: true },
        { text: 'Il suffit d\'une hausse de 25% pour récupérer', isCorrect: false },
        { text: 'L\'argent perdu est remboursé par l\'État', isCorrect: false },
        { text: 'L\'ETF est automatiquement fermé', isCorrect: false },
      ],
    },
    {
      text: 'Pourquoi un ETF est-il considéré comme diversifié ?',
      explanation: 'Un ETF réplique un indice boursier qui contient de nombreuses entreprises. Par exemple, un ETF CAC 40 investit dans les 40 plus grandes entreprises françaises simultanément, ce qui réduit le risque lié à une seule entreprise.',
      answers: [
        { text: 'Car il regroupe des dizaines ou centaines d\'entreprises en un seul produit', isCorrect: true },
        { text: 'Car il ne contient qu\'une seule entreprise très stable', isCorrect: false },
        { text: 'Car il est garanti par l\'État', isCorrect: false },
        { text: 'Car son prix ne change jamais', isCorrect: false },
      ],
    },
    {
      text: 'Quelle stratégie adopter lors d\'une correction boursière ?',
      explanation: 'Les corrections boursières sont normales et temporaires. Vendre dans la panique cristallise les pertes. Historiquement, les marchés se sont toujours remis des corrections. La patience et la diversification sont les meilleures protections.',
      answers: [
        { text: 'Garder son calme et ne pas vendre dans la panique', isCorrect: true },
        { text: 'Vendre immédiatement tous ses actifs', isCorrect: false },
        { text: 'Emprunter pour acheter plus', isCorrect: false },
        { text: 'Déplacer tout sur un livret', isCorrect: false },
      ],
    },
    {
      text: 'Quel est le lien entre risque et rendement en investissement ?',
      explanation: 'C\'est un principe fondamental de la finance : le rendement est la rémunération du risque. Un livret (faible risque) rapporte peu, un ETF actions (risque élevé) peut rapporter beaucoup plus mais aussi perdre de la valeur.',
      answers: [
        { text: 'Plus le rendement potentiel est élevé, plus le risque est important', isCorrect: true },
        { text: 'Il n\'y a aucun lien', isCorrect: false },
        { text: 'Les placements risqués rapportent toujours moins', isCorrect: false },
        { text: 'Seuls les placements sûrs rapportent', isCorrect: false },
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
      title: 'Quiz bourse, ETF et gestion du risque',
      levelId: level.id,
    },
  });

  if (!mcqQuiz) {
    mcqQuiz = await prisma.quiz.create({
      data: {
        type: 'MCQ',
        title: 'Quiz bourse, ETF et gestion du risque',
        description: 'Teste tes connaissances sur la bourse, les ETF, la volatilité et la gestion du risque',
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
  console.log('✅ Seeding du niveau 3 terminé avec succès !');
  console.log('========================================');
  console.log('📊 Résumé des données créées :');
  console.log(`   - 1 Market: ${market.title} (réutilisé)`);
  console.log(`   - 3 Submarkets: Livret, Assurance Vie, Bourse - ETF (réutilisés)`);
  console.log(`   - 3 Assets: ${Object.keys(assets).join(', ')} (réutilisés)`);
  console.log(`   - Pas de génération d'historique de prix (réutilise l'historique ESP)`);
  console.log(`   - 1 Level: ${level.title} (ID: ${level.id}, Niveau ${level.number}, ~3min de jeu)`);
  console.log(`   - 1 Event: Correction boursière`);
  console.log(`   - 1 Impact sur ETF_CAP41`);
  console.log(`   - 3 Goals: 2 obligatoires + 1 bonus`);
  console.log(`   - 1 Quiz MCQ: ${createdQuestions.length} questions`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding du niveau 3 :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
