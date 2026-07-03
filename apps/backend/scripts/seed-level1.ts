import { PrismaClient } from '@cashou/db-app';
import { auth } from '@cashou/auth/server';

const prisma = new PrismaClient();

// Credentials from login-form.tsx
const TEST_USER_EMAIL = 'test@gmail.com';
const TEST_USER_PASSWORD = 'azerty123456';
const TEST_USER_NAME = 'Test User';

async function main() {
  console.log('🌱 Début du seeding du niveau 1: Tutoriel...');

  // 0. Créer l'utilisateur de test
  console.log('👤 Création de l\'utilisateur de test...');
  let testUser = await prisma.user.findFirst({
    where: { email: TEST_USER_EMAIL }
  });

  if (!testUser) {
    try {
      const signUpResult = await auth.api.signUpEmail({
        body: {
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
          name: TEST_USER_NAME
        }
      });

      if (signUpResult.user) {
        testUser = await prisma.user.findUnique({
          where: { id: signUpResult.user.id }
        });
        console.log(`✅ Utilisateur créé: ${testUser?.email} (ID: ${testUser?.id})`);
      } else {
        console.log('⚠️  Échec de la création de l\'utilisateur via Better-Auth');
      }
    } catch (error: unknown) {
      // Si l'utilisateur existe déjà (erreur 422), on le récupère
      const err = error as { status?: number; message?: string };
      if (err?.status === 422 || err?.message?.includes('already exists')) {
        testUser = await prisma.user.findFirst({
          where: { email: TEST_USER_EMAIL }
        });
        console.log(`ℹ️  Utilisateur existe déjà: ${testUser?.email} (ID: ${testUser?.id})`);
      } else {
        console.error('❌ Erreur lors de la création de l\'utilisateur:', error);
      }
    }
  } else {
    console.log(`ℹ️  Utilisateur existe déjà: ${testUser.email} (ID: ${testUser.id})`);
  }

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
        marketId: market.id,
        type: 'SAVINGS',
      }
    });
  } else {
    submarket = await prisma.submarket.create({
      data: {
        title: 'Livrets d\'épargne',
        description: 'Produits d\'épargne réglementés offrant un rendement faible mais garanti. Idéal pour introduire la notion de capital sécurisé et de réserve d\'urgence.',
        marketId: market.id,
        type: 'SAVINGS',
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
      rate: 1.7,
      description: 'Produit d\'épargne sécurisé et toujours disponible. Le Livret A offre un rendement modéré mais garanti, idéal pour constituer une réserve d\'urgence et apprendre les bases de la gestion prudente. Aucun risque de perte et des retraits possibles à tout moment.',
      marketId: market.id,
      submarketId: submarket.id,
      maxAmount: 22950, // Plafond réel du Livret A
      minAmount: 10     // Montant minimum de dépôt
    },
    create: {
      title: 'Livret A',
      symbol: 'LIVRET_A',
      fieldId: null,
      rate: 1.7,
      description: 'Produit d\'épargne sécurisé et toujours disponible. Le Livret A offre un rendement modéré mais garanti, idéal pour constituer une réserve d\'urgence et apprendre les bases de la gestion prudente. Aucun risque de perte et des retraits possibles à tout moment.',
      marketId: market.id,
      submarketId: submarket.id,
      maxAmount: 22950, // Plafond réel du Livret A
      minAmount: 10     // Montant minimum de dépôt
    }
  });
  console.log(`✅ Actif créé: ${livretA.title} (${livretA.symbol}) - Rate: ${livretA.rate}% - Plafond: ${livretA.maxAmount}€`);

  const livretLED = await prisma.asset.upsert({
    where: { symbol: 'LIVRET_CASHOU' },
    update: {
      title: 'Livret Cashou',
      fieldId: null,
      rate: 2,
      description: 'Livret d\'épargne sécurisé dédié au financement de projets responsables et durables. Rendement stable et légèrement supérieur au Livret A dans l\'univers Cashou. Idéal pour initier le joueur à la notion d\'impact positif tout en conservant une gestion prudente et sans risque.',
      marketId: market.id,
      submarketId: submarket.id,
      maxAmount: 12000, // Plafond réel du LDDS
      minAmount: 10     // Montant minimum de dépôt
    },
    create: {
      title: 'Livret Cashou',
      symbol: 'LIVRET_CASHOU',
      fieldId: null,
      rate: 2,
      description: 'Livret d\'épargne sécurisé dédié au financement de projets responsables et durables. Rendement stable et légèrement supérieur au Livret A dans l\'univers Cashou. Idéal pour initier le joueur à la notion d\'impact positif tout en conservant une gestion prudente et sans risque.',
      marketId: market.id,
      submarketId: submarket.id,
      maxAmount: 12000, // Plafond réel du LDDS
      minAmount: 10     // Montant minimum de dépôt
    }
  });
  console.log(`✅ Actif créé: ${livretLED.title} (${livretLED.symbol}) - Rate: ${livretLED.rate}% - Plafond: ${livretLED.maxAmount}€`);

  // 5. Créer le Level (Tutoriel)
  console.log('📚 Création du niveau...');
  const LEVEL_FIELDS = {
    title: 'Tutoriel',
    duration: 435,
    speed: 1314000, // speed conservé (rythme actuel)
    startBalance: 2000,
    pointsRequired: 0,
    startDate: new Date(Date.UTC(2025, 11, 1)), // jour 0 = 15/06/2025 (ancre calendaire in-game)
    description:
      'Bienvenue dans Cashou !\n\n' +
      'Ce premier niveau a pour objectif de vous présenter le fonctionnement d’une partie.\n\n' +
      'Triomphez de vos premiers objectifs tout en découvrant comment jouer 😃',
  };
  let level = await prisma.level.findFirst({
    where: { number: 1 }
  });

  if (level) {
    level = await prisma.level.update({
      where: { id: level.id },
      data: LEVEL_FIELDS,
    });
  } else {
    level = await prisma.level.create({
      data: { number: 1, ...LEVEL_FIELDS },
    });
  }
  console.log(`✅ Niveau créé: ${level.title} (Niveau ${level.number}) — durée ${level.duration}j, speed ${level.speed}`);

  await prisma.levelAsset.deleteMany({ where: { levelId: level.id } });
  await prisma.levelAsset.createMany({
    data: [
      { levelId: level.id, assetId: livretA.id },
      { levelId: level.id, assetId: livretLED.id },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Assets du niveau liés: ${livretA.symbol}, ${livretLED.symbol}`);

  // 6. Créer l'Event "Baisse du taux du Livret A"
  console.log('🎯 Création de l\'événement...');
  const EVENT_TITLE = 'Baisse du taux du Livret A';
  const EVENT_DESCRIPTION =
    'Breaking News : Les instances gouvernementales ont pris la décision de baisser le taux du Livret A. Actuellement égal à 1,7%, celui-ci sera de 1,5% à partir du 1er février.';
  let event = await prisma.event.findFirst({
    where: { title: EVENT_TITLE }
  });

  if (event) {
    event = await prisma.event.update({
      where: { id: event.id },
      data: {
        description: EVENT_DESCRIPTION,
        hasImpact: true
      }
    });
  } else {
    event = await prisma.event.create({
      data: {
        title: EVENT_TITLE,
        description: EVENT_DESCRIPTION,
        hasImpact: true
      }
    });
  }
  console.log(`✅ Événement créé: ${event.title}`);

  // 7. Créer l'Impact (RATE : baisse du TAUX du Livret A, pas de son cours)
  // coef 0.882 → nouveau taux = round(1.7 × 0.882, 2) = 1.50 %
  console.log('💥 Création de l\'impact (taux)...');
  const RATE_COEF = 0.882;
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
        coef: RATE_COEF,
        impactType: 'RATE'
      }
    });
  } else {
    impact = await prisma.impact.create({
      data: {
        eventId: event.id,
        assetId: livretA.id,
        coef: RATE_COEF,
        impactType: 'RATE'
      }
    });
  }
  console.log(`✅ Impact créé: Event ${event.title} → Asset ${livretA.symbol} (TAUX × ${impact.coef} ≈ ${Math.round((livretA.rate ?? 1.7) * RATE_COEF * 100) / 100}%)`);

  // 8. Créer le Goal obligatoire "Terminer le niveau"
  // goalType null → toujours validé (cf. end-game.service validateGoal).
  // Comme la réussite du niveau ne dépend que des objectifs obligatoires,
  // le niveau 1 (tutoriel) est toujours réussi quel que soit le solde final.
  console.log('🎯 Création de l\'objectif obligatoire...');
  let goal = await prisma.goal.findFirst({
    where: { title: 'Terminer le niveau' }
  });

  if (goal) {
    goal = await prisma.goal.update({
      where: { id: goal.id },
      data: {
        description: 'Va au bout de ce premier niveau pour découvrir les bases de l\'épargne.',
        successMessage: 'Bravo, tu as terminé ton premier niveau !',
        failureMessage: '',
        goalType: null,
        goalValue: null
      }
    });
  } else {
    goal = await prisma.goal.create({
      data: {
        title: "Terminer le niveau",
        description: "Va au bout de ce premier niveau pour découvrir les bases de l'épargne.",
        successMessage: "Bravo, tu as terminé ton premier niveau !",
        failureMessage: "",
        goalType: null,
        goalValue: null
      },
    });
  }
  console.log(`✅ Objectif obligatoire créé: ${goal.title} (type: ${goal.goalType ?? 'toujours validé'})`);

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
        goalId: goal.id,
        isMandatory: true
      } as { levelId: number; goalId: number; isMandatory?: boolean }
    });
  }
  console.log(`✅ Level-Goal créé: Level ${level.number} ↔ Goal "${goal.title}" (obligatoire)`);

  // 9b. Objectif bonus "S'amuser !" (goalType null → toujours validé).
  // Les objectifs bonus n'affectent QUE les étoiles (pas la réussite). Avec un bonus
  // toujours validé, le niveau 1 garantit 2 étoiles, et 3 si le quiz est réussi.
  const bonusGoalTitle = "S'amuser !";
  let bonusGoal = await prisma.goal.findFirst({
    where: { title: bonusGoalTitle }
  });
  if (bonusGoal) {
    bonusGoal = await prisma.goal.update({
      where: { id: bonusGoal.id },
      data: {
        description: "Profite du jeu et explore sans pression !",
        successMessage: "Et en plus tu t'es amusé(e) : c'est l'essentiel !",
        failureMessage: "",
        goalType: null,
        goalValue: null
      }
    });
    console.log(`✅ Objectif bonus mis à jour: ${bonusGoal.title}`);
  } else {
    bonusGoal = await prisma.goal.create({
      data: {
        title: bonusGoalTitle,
        description: "Profite du jeu et explore sans pression !",
        successMessage: "Et en plus tu t'es amusé(e) : c'est l'essentiel !",
        failureMessage: "",
        goalType: null,
        goalValue: null
      }
    });
    console.log(`✅ Objectif bonus créé: ${bonusGoal.title}`);
  }
  let bonusLevelGoal = await prisma.levelGoal.findFirst({
    where: {
      levelId: level.id,
      goalId: bonusGoal.id
    }
  });
  if (!bonusLevelGoal) {
    bonusLevelGoal = await prisma.levelGoal.create({
      data: {
        levelId: level.id,
        goalId: bonusGoal.id,
        isMandatory: false
      } as { levelId: number; goalId: number; isMandatory?: boolean }
    });
    console.log(`✅ Level-Goal bonus créé: Level ${level.number} ↔ Goal "${bonusGoal.title}"`);
  }

  // 10. Créer le LevelEvent (déclenchement à 16% de la durée = "1er février")
  console.log('🔗 Liaison niveau-événement...');
  const EVENT_TRIGGER_PERCENT = 16;
  let levelEvent = await prisma.levelEvent.findFirst({
    where: {
      levelId: level.id,
      eventId: event.id
    }
  });

  if (levelEvent) {
    levelEvent = await prisma.levelEvent.update({
      where: { id: levelEvent.id },
      data: {
        triggerPercent: EVENT_TRIGGER_PERCENT,
        position: 1
      }
    });
  } else {
    levelEvent = await prisma.levelEvent.create({
      data: {
        levelId: level.id,
        eventId: event.id,
        triggerPercent: EVENT_TRIGGER_PERCENT,
        position: 1
      }
    });
  }
  // Date calendaire déduite : startDate + jour de jeu de l'event
  const eventGameDay = Math.floor((level.duration ?? 0) * (levelEvent.triggerPercent / 100));
  let eventDateLabel = `${levelEvent.triggerPercent}% (jour ${eventGameDay})`;
  if (level.startDate) {
    const eventDate = new Date(level.startDate.getTime() + eventGameDay * 86400 * 1000);
    eventDateLabel += ` → ${eventDate.toISOString().slice(0, 10)}`;
  }
  console.log(`✅ Level-Event créé: Level ${level.number} ↔ Event "${event.title}" (déclenche à ${eventDateLabel})`);

  // 10b. Verrouiller le Livret Cashou jusqu'à l'event (démo du gating d'asset par niveau).
  // Il n'apparaît (grisé) puis devient achetable qu'après "Baisse du taux du Livret A".
  console.log('🔒 Verrouillage du Livret Cashou jusqu\'à l\'événement...');
  const existingUnlock = await prisma.assetUnlock.findFirst({
    where: { levelId: level.id, assetId: livretLED.id },
  });
  if (existingUnlock) {
    await prisma.assetUnlock.update({
      where: { id: existingUnlock.id },
      data: { levelEventId: levelEvent.id, unlockPercent: null },
    });
  } else {
    await prisma.assetUnlock.create({
      data: { levelId: level.id, assetId: livretLED.id, levelEventId: levelEvent.id },
    });
  }
  console.log(`✅ Verrou créé: ${livretLED.symbol} débloqué après "${event.title}"`);

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

  // 15. Créer les Notions pédagogiques et les lier au niveau 1
  console.log('📖 Création des notions...');
  const notionsData = [
    {
      name: 'Taux d’intérêt',
      description:
        'Le taux d’intérêt est le pourcentage qui permet de calculer l’argent gagné grâce à une somme placée sur un livret. Il représente donc la rémunération de l’épargne : plus le taux est élevé, plus le livret rapporte d’argent au titulaire.',
      tags: ['Vocabulaire', 'base'],
    },
    {
      name: 'Livret A',
      description:
        'Le Livret A est un produit d’épargne réglementé, ce qui signifie que ses principales caractéristiques, notamment son taux d’intérêt et son plafond de dépôt, sont fixées par les pouvoirs publics. Depuis le 1er février 2026, son taux d’intérêt est de 1,5 %. Son plafond est fixé à 22 950 €. Les intérêts sont calculés par quinzaine (le 1er et le 16 de chaque mois) en fonction des sommes déposées et de leur durée de présence sur le livret, puis capitalisés une seule fois par an, le 31 décembre.',
      tags: ['Livret', 'Epargne', 'produit bancaire'],
    },
    {
      name: 'Livret Cashou',
      description:
        'Le Livret Cashou est un livret un peu spécial. Il n’existe pas en dehors du jeu. Ses caractéristiques, comme son taux d’intérêt et son plafond, sont évolutives en fonction des besoins pédagogiques.',
      tags: ['Livret', 'Epargne'],
    },
  ];

  for (const n of notionsData) {
    let notion = await prisma.notion.findFirst({ where: { name: n.name } });
    if (notion) {
      notion = await prisma.notion.update({
        where: { id: notion.id },
        data: { description: n.description, tags: n.tags },
      });
    } else {
      notion = await prisma.notion.create({
        data: { name: n.name, description: n.description, tags: n.tags },
      });
    }

    // Lier la notion au niveau 1 (contrainte unique [notionId, levelId])
    const existingLink = await prisma.notionLevel.findFirst({
      where: { notionId: notion.id, levelId: level.id },
    });
    if (!existingLink) {
      await prisma.notionLevel.create({
        data: { notionId: notion.id, levelId: level.id },
      });
    }
    console.log(`✅ Notion: ${notion.name} [${notion.tags.join(', ')}] ↔ Level ${level.number}`);
  }

  // // Optional: create a UserLevelCompletion for demo stars if a user exists
  // const demoUser = await prisma.user.findFirst({
  //   where: { email: 'test-stars@cashou.fr' }
  // }) ?? await prisma.user.findFirst({ take: 1 });
  // if (demoUser) {
  //   await (prisma as any).userLevelCompletion.upsert({
  //     where: {
  //       userId_levelId: { userId: demoUser.id, levelId: level.id }
  //     },
  //     create: {
  //       userId: demoUser.id,
  //       levelId: level.id,
  //       stars: 2,
  //       mandatoryGoalsMet: true,
  //       bonusGoalsMet: false,
  //       quizPassed: true,
  //       completedAt: new Date()
  //     },
  //     update: {
  //       stars: 2,
  //       mandatoryGoalsMet: true,
  //       bonusGoalsMet: false,
  //       quizPassed: true,
  //       completedAt: new Date()
  //     }
  //   });
  //   console.log(`✅ UserLevelCompletion créée pour démo (user: ${demoUser.email ?? demoUser.id}, level 1, 2 étoiles)`);
  // }

  console.log('\n✨ ========================================');
  console.log('✅ Seeding du niveau 1 terminé avec succès !');
  console.log('========================================');
  console.log(`📊 Résumé des données créées :`);
  console.log(`   - 1 Market: ${market.title}`);
  console.log(`   - 1 Submarket: ${submarket.title}`);
  console.log(`   - 2 Assets: ${livretA.symbol}, ${livretLED.symbol}`);
  console.log(`   - 1 Level: ${level.title} (Niveau ${level.number})`);
  console.log(`   - 1 Event: ${event.title} (déclenche à ${levelEvent.triggerPercent}%)`);
  console.log(`   - 1 Impact TAUX: ${livretA.symbol} ×${impact.coef} (1,7% → 1,5%)`);
  console.log(`   - 2 Goals: ${goal.title} (obligatoire), ${bonusGoal.title} (bonus)`);
  console.log(`   - 1 Quiz MCQ avec ${createdQuestions.length} questions`);
  console.log(`   - 2 Daily Quiz (hier et aujourd'hui)`);
  console.log(`   - 3 Notions liées au niveau 1`);
  console.log(`   - 1 Verrou: ${livretLED.symbol} débloqué après l'événement`);
  if (testUser) {
    console.log(`   - 1 User de test: ${testUser.email}`);
  }
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
