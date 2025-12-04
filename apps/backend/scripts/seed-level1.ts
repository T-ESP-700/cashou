import { PrismaClient } from '@cashou/db-app';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding du niveau 1: Premier pas dans l\'épargne...');

  // 1. Créer le Market "Épargne & Sécurité"
  console.log('📊 Création du marché Épargne & Sécurité...');
  let market = await prisma.market.findFirst({
    where: { title: 'Épargne & Sécurité' }
  });

  if (market) {
    market = await prisma.market.update({
      where: { id: market.id },
      data: {
        description: 'Marché regroupant les produits financiers sécurisés destinés à protéger le capital. Inclut livrets, comptes rémunérés et placements à court terme. Les valeurs sont stables et faiblement volatiles.'
      }
    });
  } else {
    market = await prisma.market.create({
      data: {
        title: 'Épargne & Sécurité',
        description: 'Marché regroupant les produits financiers sécurisés destinés à protéger le capital. Inclut livrets, comptes rémunérés et placements à court terme. Les valeurs sont stables et faiblement volatiles.'
      }
    });
  }
  console.log(`✅ Marché créé: ${market.title} (ID: ${market.id})`);

  // 2. Créer le Field "Épargne"
  console.log('🏭 Création du secteur Épargne...');
  const field = await prisma.field.upsert({
    where: { name: 'Épargne' },
    update: {
      marketId: market.id
    },
    create: {
      name: 'Épargne',
      marketId: market.id
    }
  });
  console.log(`✅ Secteur créé: ${field.name} (ID: ${field.id})`);

  // 3. Créer le Submarket "Livrets d'épargne"
  console.log('🌐 Création du sous-marché Livrets d\'épargne...');
  let submarket = await prisma.submarket.findFirst({
    where: {
      title: 'Livrets d\'épargne',
      marketId: market.id
    }
  });

  if (submarket) {
    submarket = await prisma.submarket.update({
      where: { id: submarket.id },
      data: {
        description: 'Produits d\'épargne réglementés offrant un rendement faible mais garanti. Idéal pour introduire la notion de capital sécurisé et de réserve d\'urgence.',
        marketId: market.id
      }
    });
  } else {
    submarket = await prisma.submarket.create({
      data: {
        title: 'Livrets d\'épargne',
        description: 'Produits d\'épargne réglementés offrant un rendement faible mais garanti. Idéal pour introduire la notion de capital sécurisé et de réserve d\'urgence.',
        marketId: market.id
      }
    });
  }
  console.log(`✅ Sous-marché créé: ${submarket.title} (ID: ${submarket.id})`);

  // 4. Créer les Assets (Livret A et LED)
  console.log('💰 Création des actifs...');

  const livretA = await prisma.asset.upsert({
    where: { symbol: 'LVA' },
    update: {
      title: 'Livret A',
      fieldId: field.id,
      rate: 1.7,
      description: 'Produit d\'épargne sécurisé et toujours disponible. Le Livret A offre un rendement modéré mais garanti, idéal pour constituer une réserve d\'urgence et apprendre les bases de la gestion prudente. Aucun risque de perte et des retraits possibles à tout moment.',
      marketId: market.id,
      submarketId: submarket.id
    },
    create: {
      title: 'Livret A',
      symbol: 'LVA',
      fieldId: field.id,
      rate: 1.7,
      description: 'Produit d\'épargne sécurisé et toujours disponible. Le Livret A offre un rendement modéré mais garanti, idéal pour constituer une réserve d\'urgence et apprendre les bases de la gestion prudente. Aucun risque de perte et des retraits possibles à tout moment.',
      marketId: market.id,
      submarketId: submarket.id
    }
  });
  console.log(`✅ Actif créé: ${livretA.title} (${livretA.symbol}) - Rate: ${livretA.rate}%`);

  const livretLED = await prisma.asset.upsert({
    where: { symbol: 'LED' },
    update: {
      title: 'Livret d\'Épargne Durable',
      fieldId: field.id,
      rate: 1.7,
      description: 'Livret d\'épargne sécurisé dédié au financement de projets responsables et durables. Rendement stable et légèrement supérieur au Livret A dans l\'univers Cashou. Idéal pour initier le joueur à la notion d\'impact positif tout en conservant une gestion prudente et sans risque.',
      marketId: market.id,
      submarketId: submarket.id
    },
    create: {
      title: 'Livret d\'Épargne Durable',
      symbol: 'LED',
      fieldId: field.id,
      rate: 1.7,
      description: 'Livret d\'épargne sécurisé dédié au financement de projets responsables et durables. Rendement stable et légèrement supérieur au Livret A dans l\'univers Cashou. Idéal pour initier le joueur à la notion d\'impact positif tout en conservant une gestion prudente et sans risque.',
      marketId: market.id,
      submarketId: submarket.id
    }
  });
  console.log(`✅ Actif créé: ${livretLED.title} (${livretLED.symbol}) - Rate: ${livretLED.rate}%`);

  // 5. Créer le Level
  console.log('📚 Création du niveau...');
  let level = await prisma.level.findFirst({
    where: { number: 1 }
  });

  if (level) {
    level = await prisma.level.update({
      where: { id: level.id },
      data: {
        title: 'Premier pas dans l\'épargne',
        duration: 1825,
        speed: 5258000,
        startBalance: 2000,
        pointsRequired: 0,
        description: 'Découvre les bases de l\'épargne avec des produits sécurisés. Apprends à gérer ton capital sans risque et à comprendre les notions essentielles de la finance personnelle.'
      }
    });
  } else {
    level = await prisma.level.create({
      data: {
        title: 'Premier pas dans l\'épargne',
        number: 1,
        duration: 1825,
        speed: 5258000,
        startBalance: 2000,
        pointsRequired: 0,
        description: 'Découvre les bases de l\'épargne avec des produits sécurisés. Apprends à gérer ton capital sans risque et à comprendre les notions essentielles de la finance personnelle.'
      }
    });
  }
  console.log(`✅ Niveau créé: ${level.title} (Niveau ${level.number})`);

  // 6. Créer l'Event "Baisse du livret A"
  console.log('🎯 Création de l\'événement...');
  let event = await prisma.event.findFirst({
    where: { title: 'Baisse du livret A' }
  });

  if (event) {
    event = await prisma.event.update({
      where: { id: event.id },
      data: {
        description: 'Le taux d\'intérêt du livret passe de 1,7% à 1,2%',
        hasImpact: true
      }
    });
  } else {
    event = await prisma.event.create({
      data: {
        title: 'Baisse du livret A',
        description: 'Le taux d\'intérêt du livret passe de 1,7% à 1,2%',
        hasImpact: true
      }
    });
  }
  console.log(`✅ Événement créé: ${event.title}`);

  // 7. Créer l'Impact (coef 70 = 70%)
  console.log('💥 Création de l\'impact...');
  let impact = await prisma.impact.findFirst({
    where: {
      eventId: event.id,
      assetId: livretA.id
    }
  });

  if (impact) {
    impact = await prisma.impact.update({
      where: { id: impact.id },
      data: {
        coef: 70
      }
    });
  } else {
    impact = await prisma.impact.create({
      data: {
        eventId: event.id,
        assetId: livretA.id,
        coef: 70
      }
    });
  }
  console.log(`✅ Impact créé: Event ${event.title} → Asset ${livretA.symbol} (Coef: ${impact.coef}%)`);

  // 8. Créer le Goal
  console.log('🎯 Création de l\'objectif...');
  let goal = await prisma.goal.findFirst({
    where: { title: 'Reste en positif' }
  });

  if (goal) {
    goal = await prisma.goal.update({
      where: { id: goal.id },
      data: {
        description: 'Maintenir ton solde total au-dessus de 0 Cashou pendant toute la durée du scénario. Cet objectif enseigne la gestion prudente du portefeuille et l\'importance de ne jamais se retrouver à découvert.'
      }
    });
  } else {
    goal = await prisma.goal.create({
      data: {
        title: 'Reste en positif',
        description: 'Maintenir ton solde total au-dessus de 0 Cashou pendant toute la durée du scénario. Cet objectif enseigne la gestion prudente du portefeuille et l\'importance de ne jamais se retrouver à découvert.'
      }
    });
  }
  console.log(`✅ Objectif créé: ${goal.title}`);

  // 9. Créer le LevelGoal
  console.log('🔗 Liaison niveau-objectif...');
  let levelGoal = await prisma.levelGoal.findFirst({
    where: {
      levelId: level.id,
      goalId: goal.id
    }
  });

  if (!levelGoal) {
    levelGoal = await prisma.levelGoal.create({
      data: {
        levelId: level.id,
        goalId: goal.id
      }
    });
  }
  console.log(`✅ Level-Goal créé: Level ${level.number} ↔ Goal "${goal.title}"`);

  // 10. Créer le LevelEvent (timing: ~608 jours = 1/3 de 1825)
  console.log('🔗 Liaison niveau-événement...');
  let levelEvent = await prisma.levelEvent.findFirst({
    where: {
      levelId: level.id,
      eventId: event.id
    }
  });

  if (!levelEvent) {
    levelEvent = await prisma.levelEvent.create({
      data: {
        levelId: level.id,
        eventId: event.id
      }
    });
  }
  console.log(`✅ Level-Event créé: Level ${level.number} ↔ Event "${event.title}"`);

  // 11. Créer les Questions et Réponses pour le Quiz MCQ
  console.log('❓ Création des questions et réponses pour le quiz MCQ...');

  const quizQuestions = [
    {
      text: 'Qu\'est-ce qu\'un livret d\'épargne réglementé ?',
      answers: [
        { text: 'Un produit d\'épargne sécurisé avec un taux d\'intérêt garanti par l\'État', isCorrect: true },
        { text: 'Un compte bancaire classique sans intérêts', isCorrect: false },
        { text: 'Un placement boursier à haut risque', isCorrect: false },
        { text: 'Une assurance-vie', isCorrect: false }
      ]
    },
    {
      text: 'Pourquoi est-il important de constituer une épargne de précaution ?',
      answers: [
        { text: 'Pour faire face aux imprévus sans s\'endetter', isCorrect: true },
        { text: 'Pour spéculer sur les marchés financiers', isCorrect: false },
        { text: 'Pour profiter d\'un effet de levier', isCorrect: false },
        { text: 'Pour payer ses impôts', isCorrect: false }
      ]
    },
    {
      text: 'Quel est l\'avantage principal du Livret A ?',
      answers: [
        { text: 'Disponibilité immédiate des fonds et sécurité totale', isCorrect: true },
        { text: 'Rendement très élevé', isCorrect: false },
        { text: 'Protection contre l\'inflation', isCorrect: false },
        { text: 'Avantages fiscaux importants', isCorrect: false }
      ]
    },
    {
      text: 'Que signifie un taux d\'intérêt de 1,7% sur un livret d\'épargne ?',
      answers: [
        { text: 'Votre capital augmente de 1,7% par an', isCorrect: true },
        { text: 'Vous payez 1,7% de frais de gestion', isCorrect: false },
        { text: 'Le capital diminue de 1,7% chaque année', isCorrect: false },
        { text: 'Vous gagnez 1,7€ par mois', isCorrect: false }
      ]
    },
    {
      text: 'Qu\'est-ce que l\'épargne durable ?',
      answers: [
        { text: 'Une épargne investie dans des projets responsables et écologiques', isCorrect: true },
        { text: 'Une épargne qui dure longtemps', isCorrect: false },
        { text: 'Un compte bloqué pendant 10 ans', isCorrect: false },
        { text: 'Une épargne sans intérêts', isCorrect: false }
      ]
    }
  ];

  const createdQuestions = [];
  for (const q of quizQuestions) {
    const question = await prisma.question.create({
      data: {
        text: q.text
      }
    });

    for (const a of q.answers) {
      await prisma.answer.create({
        data: {
          questionId: question.id,
          text: a.text,
          isCorrect: a.isCorrect
        }
      });
    }

    createdQuestions.push(question);
  }
  console.log(`✅ ${createdQuestions.length} questions créées avec leurs réponses`);

  // 12. Créer le Quiz MCQ
  console.log('🧠 Création du quiz MCQ...');
  const mcqQuiz = await prisma.quiz.create({
    data: {
      type: 'MCQ',
      title: 'Quiz d\'introduction à l\'épargne',
      description: 'Teste tes connaissances sur les bases de l\'épargne et les produits sécurisés',
      levelId: level.id
    }
  });
  console.log(`✅ Quiz MCQ créé: ${mcqQuiz.title}`);

  // 13. Lier les questions au quiz MCQ
  console.log('🔗 Liaison questions-quiz MCQ...');
  for (let i = 0; i < createdQuestions.length; i++) {
    await prisma.quizQuestion.create({
      data: {
        quizId: mcqQuiz.id,
        questionId: createdQuestions[i].id,
        position: i + 1
      }
    });
  }
  console.log(`✅ ${createdQuestions.length} questions liées au quiz MCQ`);

  // 14. Créer les Daily Quiz (hier et aujourd'hui)
  console.log('📅 Création des Daily Quiz...');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Question pour le Daily Quiz d'hier
  const dailyQuestion1 = await prisma.question.create({
    data: {
      text: 'Combien de temps faut-il généralement garder son épargne de précaution ?'
    }
  });

  await prisma.answer.createMany({
    data: [
      { questionId: dailyQuestion1.id, text: '3 à 6 mois de dépenses courantes', isCorrect: true },
      { questionId: dailyQuestion1.id, text: '1 semaine de dépenses', isCorrect: false },
      { questionId: dailyQuestion1.id, text: '10 ans minimum', isCorrect: false },
      { questionId: dailyQuestion1.id, text: 'Pas besoin d\'épargne de précaution', isCorrect: false }
    ]
  });

  // Question pour le Daily Quiz d'aujourd'hui
  const dailyQuestion2 = await prisma.question.create({
    data: {
      text: 'Quel est le principal risque d\'un livret d\'épargne réglementé ?'
    }
  });

  await prisma.answer.createMany({
    data: [
      { questionId: dailyQuestion2.id, text: 'Le rendement peut être inférieur à l\'inflation', isCorrect: true },
      { questionId: dailyQuestion2.id, text: 'Vous pouvez perdre tout votre capital', isCorrect: false },
      { questionId: dailyQuestion2.id, text: 'Il y a des frais de gestion très élevés', isCorrect: false },
      { questionId: dailyQuestion2.id, text: 'Votre argent est bloqué pendant 5 ans', isCorrect: false }
    ]
  });

  // Daily Quiz d'hier
  const dailyQuiz1 = await prisma.quiz.create({
    data: {
      type: 'DAILY',
      title: 'Daily Quiz - Épargne de précaution',
      description: 'Question du jour sur l\'épargne',
      date: yesterday,
      levelId: null
    }
  });

  await prisma.quizQuestion.create({
    data: {
      quizId: dailyQuiz1.id,
      questionId: dailyQuestion1.id,
      position: 1
    }
  });

  // Daily Quiz d'aujourd'hui
  const dailyQuiz2 = await prisma.quiz.create({
    data: {
      type: 'DAILY',
      title: 'Daily Quiz - Risques de l\'épargne',
      description: 'Question du jour sur les risques',
      date: today,
      levelId: null
    }
  });

  await prisma.quizQuestion.create({
    data: {
      quizId: dailyQuiz2.id,
      questionId: dailyQuestion2.id,
      position: 1
    }
  });

  console.log(`✅ 2 Daily Quiz créés (hier et aujourd'hui)`);

  console.log('\n✨ ========================================');
  console.log('✅ Seeding du niveau 1 terminé avec succès !');
  console.log('========================================');
  console.log(`📊 Résumé des données créées :`);
  console.log(`   - 1 Market: ${market.title}`);
  console.log(`   - 1 Field: ${field.name}`);
  console.log(`   - 1 Submarket: ${submarket.title}`);
  console.log(`   - 2 Assets: ${livretA.symbol}, ${livretLED.symbol}`);
  console.log(`   - 1 Level: ${level.title} (Niveau ${level.number})`);
  console.log(`   - 1 Event: ${event.title}`);
  console.log(`   - 1 Impact: ${impact.coef}% sur ${livretA.symbol}`);
  console.log(`   - 1 Goal: ${goal.title}`);
  console.log(`   - 1 Quiz MCQ avec ${createdQuestions.length} questions`);
  console.log(`   - 2 Daily Quiz (hier et aujourd'hui)`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding du niveau 1 :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
