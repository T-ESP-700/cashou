import { PrismaClient } from '@cashou/db-app';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding du niveau 1: Premier pas dans l\'épargne...');

  // 1. Créer le Market "Épargne & Sécurité"
  console.log("📊 Création du marché Livret, plans et compte épargne...");
  let market = await prisma.market.findFirst({
    where: { title: "Livrets, plans et comptes d'épargne" },
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
        title: 'Livrets, plans et comptes d\'épargne',
        description: 'Marché regroupant les produits financiers sécurisés destinés à protéger le capital. Inclut livrets, comptes rémunérés et placements à court terme. Les valeurs sont stables et faiblement volatiles.'
      }
    });
  }
  console.log(`✅ Marché créé: ${market.title} (ID: ${market.id})`);

  // 2. Créer le Field "Épargne"
  /*console.log('🏭 Création du secteur Épargne...');
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
  console.log(`✅ Secteur créé: ${field.name} (ID: ${field.id})`); */

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
    where: { symbol: 'LIVRET_A' },
    update: {
      title: 'Livret A',
      fieldId: null,
      taux: 1.7,
      description: 'Produit d\'épargne sécurisé et toujours disponible. Le Livret A offre un rendement modéré mais garanti, idéal pour constituer une réserve d\'urgence et apprendre les bases de la gestion prudente. Aucun risque de perte et des retraits possibles à tout moment.',
      marketId: market.id,
      submarketId: submarket.id
    },
    create: {
      title: 'Livret A',
      symbol: 'LIVRET_A',
      fieldId: null,
      taux: 1.7,
      description: 'Produit d\'épargne sécurisé et toujours disponible. Le Livret A offre un rendement modéré mais garanti, idéal pour constituer une réserve d\'urgence et apprendre les bases de la gestion prudente. Aucun risque de perte et des retraits possibles à tout moment.',
      marketId: market.id,
      submarketId: submarket.id
    }
  });
  console.log(`✅ Actif créé: ${livretA.title} (${livretA.symbol}) - Taux: ${livretA.taux}%`);

  const livretLED = await prisma.asset.upsert({
    where: { symbol: 'LIVRET_DDS' },
    update: {
      title: 'Livret de Développement Durable et Solidaire',
      fieldId: null,
      taux: 1.7,
      description: 'Livret d\'épargne sécurisé dédié au financement de projets responsables et durables. Rendement stable et légèrement supérieur au Livret A dans l\'univers Cashou. Idéal pour initier le joueur à la notion d\'impact positif tout en conservant une gestion prudente et sans risque.',
      marketId: market.id,
      submarketId: submarket.id
    },
    create: {
      title: 'Livret de Développement Durable et Solidaire',
      symbol: 'LIVRET_DDS',
      fieldId: null,
      taux: 1.7,
      description: 'Livret d\'épargne sécurisé dédié au financement de projets responsables et durables. Rendement stable et légèrement supérieur au Livret A dans l\'univers Cashou. Idéal pour initier le joueur à la notion d\'impact positif tout en conservant une gestion prudente et sans risque.',
      marketId: market.id,
      submarketId: submarket.id
    }
  });
  console.log(`✅ Actif créé: ${livretLED.title} (${livretLED.symbol}) - Taux: ${livretLED.taux}%`);

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

  // 7. Créer l'Impact
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
        coef: 0.7
      }
    });
  } else {
    impact = await prisma.impact.create({
      data: {
        eventId: event.id,
        assetId: livretA.id,
        coef: 0.7
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
        description: 'Ne pas perdre d\'argent par rapport à ton capital initial.'
      }
    });
  } else {
    goal = await prisma.goal.create({
      data: {
        title: "Reste en positif",
        description:
          "Ne pas perdre d'argent par rapport à ton capital initial.",
      },
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
      explanation: 'Un livret d\'épargne réglementé est un produit d\'épargne sécurisé dont le taux d\'intérêt est fixé et garanti par l\'État. Contrairement aux comptes bancaires classiques, il génère des intérêts, et contrairement aux placements boursiers, il ne présente aucun risque de perte en capital. Les livrets réglementés comme le Livret A ou le Livret d\'Épargne Durable sont des produits idéaux pour débuter dans l\'épargne.',
      answers: [
        { text: 'Un produit d\'épargne sécurisé avec un taux d\'intérêt garanti par l\'État', isCorrect: true },
        { text: 'Un compte bancaire classique sans intérêts', isCorrect: false },
        { text: 'Un placement boursier à haut risque', isCorrect: false },
        { text: 'Une assurance-vie', isCorrect: false }
      ]
    },
    {
      text: 'Pourquoi est-il important de constituer une épargne de précaution ?',
      explanation: 'L\'épargne de précaution, aussi appelée épargne d\'urgence, permet de faire face aux imprévus de la vie (panne de voiture, perte d\'emploi, frais médicaux) sans avoir à s\'endetter ou à puiser dans d\'autres placements. Elle constitue une sécurité financière essentielle et doit être facilement accessible, d\'où l\'intérêt des livrets d\'épargne pour la stocker.',
      answers: [
        { text: 'Pour faire face aux imprévus sans s\'endetter', isCorrect: true },
        { text: 'Pour spéculer sur les marchés financiers', isCorrect: false },
        { text: 'Pour profiter d\'un effet de levier', isCorrect: false },
        { text: 'Pour payer ses impôts', isCorrect: false }
      ]
    },
    {
      text: 'Quel est l\'avantage principal du Livret A ?',
      explanation: 'Le principal avantage du Livret A est la combinaison de la disponibilité immédiate des fonds (vous pouvez retirer à tout moment) et de la sécurité totale (aucun risque de perte en capital). Bien que son rendement soit modéré, il reste un produit idéal pour constituer une réserve d\'urgence accessible. Le rendement n\'est pas très élevé, mais c\'est le prix de la sécurité et de la liquidité.',
      answers: [
        { text: 'Disponibilité immédiate des fonds et sécurité totale', isCorrect: true },
        { text: 'Rendement très élevé', isCorrect: false },
        { text: 'Protection contre l\'inflation', isCorrect: false },
        { text: 'Avantages fiscaux importants', isCorrect: false }
      ]
    },
    {
      text: 'Que signifie un taux d\'intérêt de 1,7% sur un livret d\'épargne ?',
      explanation: 'Un taux d\'intérêt de 1,7% signifie que votre capital augmente de 1,7% chaque année. Par exemple, si vous placez 1000€ sur un livret à 1,7%, vous aurez 1017€ après un an (1000€ × 1,017). Les intérêts sont calculés et versés annuellement, et ils sont cumulatifs : les intérêts de l\'année précédente génèrent eux-mêmes des intérêts l\'année suivante (intérêts composés).',
      answers: [
        { text: 'Votre capital augmente de 1,7% par an', isCorrect: true },
        { text: 'Vous payez 1,7% de frais de gestion', isCorrect: false },
        { text: 'Le capital diminue de 1,7% chaque année', isCorrect: false },
        { text: 'Vous gagnez 1,7€ par mois', isCorrect: false }
      ]
    },
    {
      text: 'Qu\'est-ce que l\'épargne durable ?',
      explanation: 'L\'épargne durable est une épargne dont les fonds sont investis dans des projets responsables, écologiques et à impact social positif. Contrairement à une épargne classique, elle permet de concilier rendement financier et impact environnemental ou social. Le Livret d\'Épargne Durable (LED) en est un exemple : il finance des projets durables tout en conservant les avantages de sécurité et de disponibilité des livrets réglementés.',
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
    let question = await prisma.question.findFirst({
      where: { text: q.text }
    });

    if (!question) {
      question = await prisma.question.create({
        data: {
          text: q.text,
          explanation: q.explanation
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
    } else {
      // Mettre à jour l'explication si elle n'existe pas ou est différente
      if (!question.explanation && q.explanation) {
        question = await prisma.question.update({
          where: { id: question.id },
          data: { explanation: q.explanation }
        });
      }

      // Vérifier que les réponses existent
      const existingAnswers = await prisma.answer.findMany({
        where: { questionId: question.id }
      });

      if (existingAnswers.length === 0) {
        for (const a of q.answers) {
          await prisma.answer.create({
            data: {
              questionId: question.id,
              text: a.text,
              isCorrect: a.isCorrect
            }
          });
        }
      }
    }

    createdQuestions.push(question);
  }
  console.log(`✅ ${createdQuestions.length} questions vérifiées/créées avec leurs réponses`);

  // 12. Créer le Quiz MCQ
  console.log('🧠 Création du quiz MCQ...');
  let mcqQuiz = await prisma.quiz.findFirst({
    where: {
      type: 'MCQ',
      title: 'Quiz d\'introduction à l\'épargne',
      levelId: level.id
    }
  });

  if (!mcqQuiz) {
    mcqQuiz = await prisma.quiz.create({
      data: {
        type: 'MCQ',
        title: 'Quiz d\'introduction à l\'épargne',
        description: 'Teste tes connaissances sur les bases de l\'épargne et les produits sécurisés',
        levelId: level.id
      }
    });
    console.log(`✅ Quiz MCQ créé: ${mcqQuiz.title}`);
  } else {
    console.log(`✅ Quiz MCQ existe déjà: ${mcqQuiz.title}`);
  }

  // 13. Lier les questions au quiz MCQ
  console.log('🔗 Liaison questions-quiz MCQ...');
  for (let i = 0; i < createdQuestions.length; i++) {
    const existingLink = await prisma.quizQuestion.findFirst({
      where: {
        quizId: mcqQuiz.id,
        questionId: createdQuestions[i].id
      }
    });

    if (!existingLink) {
      await prisma.quizQuestion.create({
        data: {
          quizId: mcqQuiz.id,
          questionId: createdQuestions[i].id,
          position: i + 1
        }
      });
    }
  }
  console.log(`✅ ${createdQuestions.length} questions vérifiées/liées au quiz MCQ`);

  // 14. Créer les Daily Quiz (hier et aujourd'hui)
  console.log('📅 Création des Daily Quiz...');

  const now = new Date();
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0));

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

  // Questions pour le Daily Quiz d'hier (3 questions)
  const dailyQuiz1Questions = [
    {
      text: 'Combien de temps faut-il généralement garder son épargne de précaution ?',
      explanation: 'L\'épargne de précaution doit représenter l\'équivalent de 3 à 6 mois de dépenses courantes. Cette durée permet de couvrir la plupart des imprévus (perte d\'emploi temporaire, frais médicaux, réparations importantes) sans avoir à s\'endetter. Elle doit être conservée en permanence et reconstituée si elle est utilisée. Moins de 3 mois peut être insuffisant, et plus de 6 mois peut être excessif car cet argent pourrait être mieux investi ailleurs pour un meilleur rendement.',
      answers: [
        { text: '3 à 6 mois de dépenses courantes', isCorrect: true },
        { text: '1 semaine de dépenses', isCorrect: false },
        { text: '10 ans minimum', isCorrect: false },
        { text: 'Pas besoin d\'épargne de précaution', isCorrect: false }
      ]
    },
    {
      text: 'Quel est le plafond maximum autorisé sur un Livret A en France ?',
      explanation: 'Le plafond du Livret A est fixé à 22 950 € (hors intérêts capitalisés). Au-delà de ce montant, les intérêts ne sont plus versés sur la partie excédentaire. Ce plafond peut être modifié par décret, mais il est resté stable à 22 950 € depuis plusieurs années. Les intérêts générés peuvent dépasser ce plafond car ils sont capitalisés.',
      answers: [
        { text: '22 950 €', isCorrect: true },
        { text: '10 000 €', isCorrect: false },
        { text: '50 000 €', isCorrect: false },
        { text: 'Aucun plafond', isCorrect: false }
      ]
    },
    {
      text: 'Quelle est la principale différence entre épargner et investir ?',
      explanation: 'L\'épargne vise à préserver le capital avec un risque minimal et une disponibilité immédiate (livrets, comptes rémunérés). L\'investissement cherche la croissance du capital à long terme mais comporte un risque de perte (actions, obligations, immobilier). L\'épargne est idéale pour les objectifs à court terme et la réserve d\'urgence, tandis que l\'investissement est adapté aux objectifs à long terme avec une tolérance au risque.',
      answers: [
        { text: 'L\'épargne préserve le capital, l\'investissement cherche la croissance avec risque', isCorrect: true },
        { text: 'Aucune différence, ce sont des synonymes', isCorrect: false },
        { text: 'L\'épargne est risquée, l\'investissement est sécurisé', isCorrect: false },
        { text: 'L\'épargne rapporte plus que l\'investissement', isCorrect: false }
      ]
    }
  ];

  const createdDailyQuestions1 = [];
  for (const q of dailyQuiz1Questions) {
    let question = await prisma.question.findFirst({
      where: { text: q.text }
    });

    if (!question) {
      question = await prisma.question.create({
        data: {
          text: q.text,
          explanation: q.explanation
        }
      });

      if (question) {
        await prisma.answer.createMany({
          data: q.answers.map(a => ({
            questionId: question!.id,
            text: a.text,
            isCorrect: a.isCorrect
          }))
        });
      }
    } else if (question) {
      // Mettre à jour l'explication si elle n'existe pas
      if (!question.explanation && q.explanation) {
        question = await prisma.question.update({
          where: { id: question.id },
          data: { explanation: q.explanation }
        });
      }

      const questionId = question.id;
      const existingAnswers = await prisma.answer.findMany({
        where: { questionId }
      });

      if (existingAnswers.length === 0) {
        await prisma.answer.createMany({
          data: q.answers.map(a => ({
            questionId,
            text: a.text,
            isCorrect: a.isCorrect
          }))
        });
      }
    }

    if (question) {
      createdDailyQuestions1.push(question);
    }
  }

  // Questions pour le Daily Quiz d'aujourd'hui (3 questions)
  const dailyQuiz2Questions = [
    {
      text: 'Quel est le principal risque d\'un livret d\'épargne réglementé ?',
      explanation: 'Le principal risque d\'un livret d\'épargne réglementé est que son rendement peut être inférieur au taux d\'inflation. Cela signifie que même si votre capital augmente en valeur nominale, son pouvoir d\'achat réel peut diminuer. Par exemple, si l\'inflation est à 2% et votre livret à 1,7%, vous perdez du pouvoir d\'achat. Cependant, contrairement aux autres options, il n\'y a aucun risque de perte en capital, pas de frais élevés, et votre argent n\'est pas bloqué.',
      answers: [
        { text: 'Le rendement peut être inférieur à l\'inflation', isCorrect: true },
        { text: 'Vous pouvez perdre tout votre capital', isCorrect: false },
        { text: 'Il y a des frais de gestion très élevés', isCorrect: false },
        { text: 'Votre argent est bloqué pendant 5 ans', isCorrect: false }
      ]
    },
    {
      text: 'Si vous placez 1000€ sur un livret à 1,7% par an, combien aurez-vous après 2 ans (intérêts simples) ?',
      explanation: 'Avec des intérêts simples, les intérêts sont calculés uniquement sur le capital initial chaque année. Pour 1000€ à 1,7% par an : première année = 1000€ × 1,7% = 17€, deuxième année = 1000€ × 1,7% = 17€. Total après 2 ans = 1000€ + 17€ + 17€ = 1034€. Les intérêts simples ne capitalisent pas les intérêts précédents, contrairement aux intérêts composés.',
      answers: [
        { text: '1034€', isCorrect: true },
        { text: '1034,29€', isCorrect: false },
        { text: '1170€', isCorrect: false },
        { text: '1000€', isCorrect: false }
      ]
    },
    {
      text: 'Peut-on retirer son argent d\'un livret d\'épargne réglementé à tout moment ?',
      explanation: 'Oui, l\'un des principaux avantages des livrets d\'épargne réglementés (Livret A, LED, etc.) est la disponibilité totale des fonds. Vous pouvez retirer votre argent à tout moment, sans frais, sans préavis et sans limite de montant. C\'est ce qui en fait des produits idéaux pour constituer une épargne de précaution. Contrairement aux placements bloqués ou aux investissements, votre liquidité est garantie.',
      answers: [
        { text: 'Oui, sans frais et sans préavis', isCorrect: true },
        { text: 'Oui, mais avec des frais de retrait', isCorrect: false },
        { text: 'Non, il faut attendre 1 an minimum', isCorrect: false },
        { text: 'Non, l\'argent est bloqué jusqu\'à la retraite', isCorrect: false }
      ]
    }
  ];

  const createdDailyQuestions2 = [];
  for (const q of dailyQuiz2Questions) {
    let question = await prisma.question.findFirst({
      where: { text: q.text }
    });

    if (!question) {
      question = await prisma.question.create({
        data: {
          text: q.text,
          explanation: q.explanation
        }
      });

      if (question) {
        await prisma.answer.createMany({
          data: q.answers.map(a => ({
            questionId: question!.id,
            text: a.text,
            isCorrect: a.isCorrect
          }))
        });
      }
    } else if (question) {
      // Mettre à jour l'explication si elle n'existe pas
      if (!question.explanation && q.explanation) {
        question = await prisma.question.update({
          where: { id: question.id },
          data: { explanation: q.explanation }
        });
      }

      const questionId = question.id;
      const existingAnswers = await prisma.answer.findMany({
        where: { questionId }
      });

      if (existingAnswers.length === 0) {
        await prisma.answer.createMany({
          data: q.answers.map(a => ({
            questionId,
            text: a.text,
            isCorrect: a.isCorrect
          }))
        });
      }
    }

    if (question) {
      createdDailyQuestions2.push(question);
    }
  }

  // Daily Quiz d'hier
  let dailyQuiz1 = await prisma.quiz.findFirst({
    where: {
      type: 'DAILY',
      date: yesterday,
      title: 'Daily Quiz - Épargne de précaution'
    }
  });

  if (!dailyQuiz1) {
    dailyQuiz1 = await prisma.quiz.create({
      data: {
        type: 'DAILY',
        title: 'Daily Quiz - Épargne de précaution',
        description: 'Questions du jour sur l\'épargne',
        date: yesterday,
        levelId: null
      }
    });
  }

  // Lier les 3 questions au Daily Quiz 1
  for (let i = 0; i < createdDailyQuestions1.length; i++) {
    const existingLink = await prisma.quizQuestion.findFirst({
      where: {
        quizId: dailyQuiz1.id,
        questionId: createdDailyQuestions1[i].id
      }
    });

    if (!existingLink) {
      await prisma.quizQuestion.create({
        data: {
          quizId: dailyQuiz1.id,
          questionId: createdDailyQuestions1[i].id,
          position: i + 1
        }
      });
    }
  }

  // Daily Quiz d'aujourd'hui
  let dailyQuiz2 = await prisma.quiz.findFirst({
    where: {
      type: 'DAILY',
      date: today,
      title: 'Daily Quiz - Risques de l\'épargne'
    }
  });

  if (!dailyQuiz2) {
    dailyQuiz2 = await prisma.quiz.create({
      data: {
        type: 'DAILY',
        title: 'Daily Quiz - Risques de l\'épargne',
        description: 'Questions du jour sur les risques',
        date: today,
        levelId: null
      }
    });
  }

  // Lier les 3 questions au Daily Quiz 2
  for (let i = 0; i < createdDailyQuestions2.length; i++) {
    const existingLink = await prisma.quizQuestion.findFirst({
      where: {
        quizId: dailyQuiz2.id,
        questionId: createdDailyQuestions2[i].id
      }
    });

    if (!existingLink) {
      await prisma.quizQuestion.create({
        data: {
          quizId: dailyQuiz2.id,
          questionId: createdDailyQuestions2[i].id,
          position: i + 1
        }
      });
    }
  }

  console.log(`✅ 2 Daily Quiz vérifiés/créés (hier et aujourd'hui) avec 3 questions chacun`);

  console.log('\n✨ ========================================');
  console.log('✅ Seeding du niveau 1 terminé avec succès !');
  console.log('========================================');
  console.log(`📊 Résumé des données créées :`);
  console.log(`   - 1 Market: ${market.title}`);
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
