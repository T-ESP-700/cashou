import { PrismaClient } from '@cashou/db-app';

const prisma = new PrismaClient();

// --- Price history generation utilities ---

const HISTORY_START_DATE = new Date('2022-01-01');
const TOTAL_HISTORY_DAYS = 1095; // 3 years
const HISTORY_START_DAY = 365;   // Game starts at year 2, player sees 1 year of past

/**
 * Generate realistic daily price history for an asset over N days.
 * Pure market data — NO event impacts. Events are applied at runtime by the backend.
 */
function generatePriceHistory(
  assetId: number,
  startPrice: number, // in cents
  annualRate: number,  // e.g. 8 for 8%
  dailyVolatility: number, // e.g. 0.01 for 1%
  days: number = TOTAL_HISTORY_DAYS,
): { assetId: number; timestamp: Date; value: number }[] {
  const dailyDrift = Math.pow(1 + annualRate / 100, 1 / 365) - 1;
  const points: { assetId: number; timestamp: Date; value: number }[] = [];

  let price = startPrice;

  for (let d = 0; d < days; d++) {
    const date = new Date(HISTORY_START_DATE);
    date.setDate(date.getDate() + d);

    // Random walk with drift (no events — those are applied at runtime)
    const random = (Math.random() - 0.5) * 2; // [-1, 1]
    const dailyReturn = dailyDrift + dailyVolatility * random;
    price = Math.round(price * (1 + dailyReturn));

    // Floor at 1 cent
    if (price < 1) price = 1;

    points.push({ assetId, timestamp: date, value: price });
  }

  return points;
}

async function resetSequences() {
  const tables = ['levels', 'markets', 'submarkets', 'events', 'impacts', 'level_events', 'level_goals', 'goals'];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`
    );
  }
}

async function main() {
  console.log('🌱 Début du seeding du niveau ESP démo...');

  // Reset all sequences to avoid ID conflicts
  await resetSequences();

  // 1. Market
  console.log('📊 Création du marché général...');
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

  // 3b. Asset Price History (3 years = 1095 days per asset, NO events baked in)
  console.log('📈 Generation de l\'historique des prix (3 ans, sans events)...');

  const assetHistoryConfigs: Record<string, {
    startPrice: number; // cents
    annualRate: number;
    dailyVolatility: number;
  }> = {
    LIVRET_CASHOU: {
      startPrice: 10000, // 100.00 EUR
      annualRate: 1.7,
      dailyVolatility: 0, // livret = taux fixe, zéro volatilité
    },
    ASSURANCE_SERENITE: {
      startPrice: 10000,
      annualRate: 2.5,
      dailyVolatility: 0.002, // 0.2%
    },
    ETF_CAP41: {
      startPrice: 10000,
      annualRate: 8,
      dailyVolatility: 0.012, // 1.2%
    },
    ETF_PS501: {
      startPrice: 10000,
      annualRate: 10,
      dailyVolatility: 0.018, // 1.8%
    },
  };

  // Delete existing history for these assets
  for (const symbol of Object.keys(assetHistoryConfigs)) {
    const asset = assets[symbol];
    if (asset) {
      await prisma.assetHistory.deleteMany({ where: { assetId: asset.id } });
    }
  }

  // Generate and insert history
  let totalHistoryCount = 0;
  for (const [symbol, config] of Object.entries(assetHistoryConfigs)) {
    const asset = assets[symbol];
    if (!asset) continue;

    const history = generatePriceHistory(
      asset.id,
      config.startPrice,
      config.annualRate,
      config.dailyVolatility,
    );

    // Insert in batches of 500
    for (let i = 0; i < history.length; i += 500) {
      await prisma.assetHistory.createMany({
        data: history.slice(i, i + 500),
        skipDuplicates: true,
      });
    }

    totalHistoryCount += history.length;
    const lastPrice = history[history.length - 1].value;
    console.log(`  ✅ ${symbol}: ${history.length} points (${config.startPrice/100}€ → ${(lastPrice/100).toFixed(2)}€)`);
  }
  console.log(`✅ Total: ${totalHistoryCount} points d'historique generes (${TOTAL_HISTORY_DAYS} jours/asset)`);

  // 4. Level — Update Level 1 (default user level) with ESP config
  console.log('📚 Mise à jour du niveau par défaut (Level 1) avec config ESP...');

  const levelData = {
    title: 'Découverte des marchés',
    number: 25,
    duration: 365,
    speed: 262800,
    startBalance: 5000,
    pointsRequired: 0,
    historyStartDay: HISTORY_START_DAY, // Game starts at day 365 (year 2), player sees 1 year of past
    description: 'Découvre les bases de l\'investissement avec 3 enveloppes et 2 événements de marché. Un premier niveau pour comprendre la diversification et la gestion du risque.',
  };

  // Upsert on id=1 so the default user level is always the ESP demo
  let level = await prisma.level.upsert({
    where: { id: 1 },
    update: levelData,
    create: { id: 1, ...levelData },
  });
  console.log(`✅ Niveau mis à jour: ${level.title} (ID: ${level.id}, Niveau ${level.number})`);

  // 5. Events + Impacts
  console.log('🎯 Création des événements et impacts...');

  const eventDefs = [
    {
      title: 'Boom technologique',
      description: 'Une vague d\'innovation tech secoue les marchés ! Les entreprises explosent en bourse.',
      hasImpact: true,
      impacts: [
        { symbol: 'ETF_CAP41', coef: 1.3 },
        { symbol: 'ETF_PS501', coef: 1.5 },
      ],
      triggerPercent: 8,
      position: 1,
    },
    {
      title: 'Crise géopolitique',
      description: 'Des tensions géopolitiques éclatent. Les marchés financiers plongent.',
      hasImpact: true,
      impacts: [
        { symbol: 'ETF_CAP41', coef: 0.7 },
        { symbol: 'ETF_PS501', coef: 0.6 },
        { symbol: 'ASSURANCE_SERENITE', coef: 0.95 },
      ],
      triggerPercent: 60,
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
      title: 'Diversifie tes placements',
      description: 'Investis dans au moins 3 enveloppes différentes.',
      goalType: 'min_submarkets_invested',
      goalValue: 3,
      isMandatory: true,
      successMessage: 'Bravo ! Tu as bien diversifié tes placements dans les 3 enveloppes.',
      failureMessage: 'Tu n\'as pas suffisamment diversifié. Pense à répartir tes investissements dans les 3 enveloppes !',
    },
    {
      title: 'Fais grandir ton capital',
      description: 'Termine avec au moins 5 200 € de capital total.',
      goalType: 'wallet_min',
      goalValue: 5200,
      isMandatory: true,
      successMessage: 'Excellent ! Ton capital a bien grandi grâce à tes placements.',
      failureMessage: 'Tu n\'as pas atteint les 5 200 €. Essaie de placer plus tôt et dans des produits plus rémunérateurs !',
    },
    {
      title: 'Expert financier',
      description: 'Termine avec au moins 5 500 € de capital total.',
      goalType: 'wallet_min',
      goalValue: 5500,
      isMandatory: false,
      successMessage: 'Impressionnant ! Tu es un vrai expert de la finance !',
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

  // 7. Quiz MCQ pour le niveau ESP
  console.log('❓ Création des questions et réponses pour le quiz MCQ...');

  const quizQuestions = [
    {
      text: 'Pourquoi est-il important de diversifier ses placements ?',
      explanation: 'La diversification consiste à répartir son argent sur plusieurs types de placements (livret, assurance vie, bourse) pour réduire le risque global. Si un placement perd de la valeur — par exemple les ETF lors d\'une crise — les autres peuvent compenser. C\'est le principe du « ne pas mettre tous ses œufs dans le même panier ». Un portefeuille diversifié est plus résistant aux aléas du marché.',
      answers: [
        { text: 'Pour réduire le risque en répartissant sur plusieurs types de placements', isCorrect: true },
        { text: 'Pour payer moins d\'impôts', isCorrect: false },
        { text: 'Pour avoir plus de comptes bancaires', isCorrect: false },
        { text: 'Parce que c\'est obligatoire par la loi', isCorrect: false },
      ],
    },
    {
      text: 'Lors d\'une crise géopolitique, quels placements sont généralement les plus touchés ?',
      explanation: 'Les placements boursiers comme les ETF (fonds indiciels) sont directement liés à la performance des entreprises cotées. En cas de crise géopolitique, les marchés actions chutent souvent fortement car les investisseurs craignent l\'incertitude. À l\'inverse, les livrets réglementés sont protégés par l\'État et leur taux est garanti, ils ne sont pas impactés par les fluctuations de marché.',
      answers: [
        { text: 'Les placements en bourse (actions, ETF)', isCorrect: true },
        { text: 'Les livrets d\'épargne réglementés', isCorrect: false },
        { text: 'Tous les placements perdent la même chose', isCorrect: false },
        { text: 'Aucun placement n\'est impacté', isCorrect: false },
      ],
    },
    {
      text: 'Qu\'est-ce qu\'un ETF (Exchange Traded Fund) ?',
      explanation: 'Un ETF, ou fonds indiciel coté en bourse, est un placement qui réplique la performance d\'un indice boursier (par exemple les 40 plus grandes entreprises françaises). Il permet d\'investir sur un large panier d\'entreprises en une seule opération, offrant ainsi une diversification automatique au sein du marché boursier. Les ETF sont plus risqués qu\'un livret mais offrent un potentiel de rendement plus élevé sur le long terme.',
      answers: [
        { text: 'Un fonds qui réplique un indice boursier et regroupe de nombreuses entreprises', isCorrect: true },
        { text: 'Un compte d\'épargne avec un taux garanti', isCorrect: false },
        { text: 'Une assurance contre les pertes en bourse', isCorrect: false },
        { text: 'Un type de cryptomonnaie', isCorrect: false },
      ],
    },
    {
      text: 'Quelle est la différence principale entre un livret d\'épargne et une assurance vie en fonds euros ?',
      explanation: 'Le livret d\'épargne offre un taux garanti par l\'État avec une disponibilité immédiate et zéro risque, mais un rendement modeste (ex: 1,7%). L\'assurance vie en fonds euros propose un rendement légèrement supérieur (ex: 2,5%) avec une très faible volatilité, mais l\'argent est moins immédiatement disponible et les frais peuvent réduire le rendement réel. Les deux sont des placements sécurisés, mais avec des niveaux de rendement et de liquidité différents.',
      answers: [
        { text: 'Le livret est garanti par l\'État avec accès immédiat, l\'assurance vie a un meilleur rendement mais moins de liquidité', isCorrect: true },
        { text: 'Il n\'y a aucune différence, ce sont les mêmes produits', isCorrect: false },
        { text: 'L\'assurance vie est un placement boursier à haut risque', isCorrect: false },
        { text: 'Le livret rapporte toujours plus que l\'assurance vie', isCorrect: false },
      ],
    },
    {
      text: 'Après un boom technologique qui fait monter les ETF, quelle stratégie est la plus prudente ?',
      explanation: 'Après une forte hausse des marchés boursiers, il est souvent prudent de sécuriser une partie de ses gains en vendant une portion de ses ETF et en plaçant cet argent sur des produits plus sûrs (livret, assurance vie). Les marchés peuvent corriger à la baisse après un boom. Garder tous ses gains en bourse expose au risque de les perdre lors d\'une correction. Emprunter pour investir davantage (effet de levier) est très risqué et déconseillé aux débutants.',
      answers: [
        { text: 'Sécuriser une partie des gains en les transférant vers des placements plus sûrs', isCorrect: true },
        { text: 'Investir encore plus en bourse pour maximiser les profits', isCorrect: false },
        { text: 'Retirer tout son argent et le garder en liquide', isCorrect: false },
        { text: 'Emprunter pour investir davantage en bourse', isCorrect: false },
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
      title: 'Quiz diversification et gestion du risque',
      levelId: level.id,
    },
  });

  if (!mcqQuiz) {
    mcqQuiz = await prisma.quiz.create({
      data: {
        type: 'MCQ',
        title: 'Quiz diversification et gestion du risque',
        description: 'Teste tes connaissances sur la diversification, les enveloppes financières et la gestion des événements de marché',
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

  // 10. Créer les Daily Quiz (hier et aujourd'hui)
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
        { text: 'Pas besoin d\'épargne de précaution', isCorrect: false },
      ],
    },
    {
      text: 'Quel est le plafond maximum autorisé sur un Livret A en France ?',
      explanation: 'Le plafond du Livret A est fixé à 22 950 € (hors intérêts capitalisés). Au-delà de ce montant, les intérêts ne sont plus versés sur la partie excédentaire. Ce plafond peut être modifié par décret, mais il est resté stable à 22 950 € depuis plusieurs années. Les intérêts générés peuvent dépasser ce plafond car ils sont capitalisés.',
      answers: [
        { text: '22 950 €', isCorrect: true },
        { text: '10 000 €', isCorrect: false },
        { text: '50 000 €', isCorrect: false },
        { text: 'Aucun plafond', isCorrect: false },
      ],
    },
    {
      text: 'Quelle est la principale différence entre épargner et investir ?',
      explanation: 'L\'épargne vise à préserver le capital avec un risque minimal et une disponibilité immédiate (livrets, comptes rémunérés). L\'investissement cherche la croissance du capital à long terme mais comporte un risque de perte (actions, obligations, immobilier). L\'épargne est idéale pour les objectifs à court terme et la réserve d\'urgence, tandis que l\'investissement est adapté aux objectifs à long terme avec une tolérance au risque.',
      answers: [
        { text: 'L\'épargne préserve le capital, l\'investissement cherche la croissance avec risque', isCorrect: true },
        { text: 'Aucune différence, ce sont des synonymes', isCorrect: false },
        { text: 'L\'épargne est risquée, l\'investissement est sécurisé', isCorrect: false },
        { text: 'L\'épargne rapporte plus que l\'investissement', isCorrect: false },
      ],
    },
  ];

  const createdDailyQuestions1 = [];
  for (const q of dailyQuiz1Questions) {
    let question = await prisma.question.findFirst({
      where: { text: q.text },
    });

    if (!question) {
      question = await prisma.question.create({
        data: { text: q.text, explanation: q.explanation },
      });

      if (question) {
        await prisma.answer.createMany({
          data: q.answers.map((a) => ({
            questionId: question!.id,
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        });
      }
    } else if (question) {
      if (!question.explanation && q.explanation) {
        question = await prisma.question.update({
          where: { id: question.id },
          data: { explanation: q.explanation },
        });
      }

      const questionId = question.id;
      const existingAnswers = await prisma.answer.findMany({
        where: { questionId },
      });

      if (existingAnswers.length === 0) {
        await prisma.answer.createMany({
          data: q.answers.map((a) => ({
            questionId,
            text: a.text,
            isCorrect: a.isCorrect,
          })),
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
        { text: 'Votre argent est bloqué pendant 5 ans', isCorrect: false },
      ],
    },
    {
      text: 'Si vous placez 1000€ sur un livret à 1,7% par an, combien aurez-vous après 2 ans (intérêts simples) ?',
      explanation: 'Avec des intérêts simples, les intérêts sont calculés uniquement sur le capital initial chaque année. Pour 1000€ à 1,7% par an : première année = 1000€ × 1,7% = 17€, deuxième année = 1000€ × 1,7% = 17€. Total après 2 ans = 1000€ + 17€ + 17€ = 1034€. Les intérêts simples ne capitalisent pas les intérêts précédents, contrairement aux intérêts composés.',
      answers: [
        { text: '1034€', isCorrect: true },
        { text: '1034,29€', isCorrect: false },
        { text: '1170€', isCorrect: false },
        { text: '1000€', isCorrect: false },
      ],
    },
    {
      text: 'Peut-on retirer son argent d\'un livret d\'épargne réglementé à tout moment ?',
      explanation: 'Oui, l\'un des principaux avantages des livrets d\'épargne réglementés (Livret A, LED, etc.) est la disponibilité totale des fonds. Vous pouvez retirer votre argent à tout moment, sans frais, sans préavis et sans limite de montant. C\'est ce qui en fait des produits idéaux pour constituer une épargne de précaution. Contrairement aux placements bloqués ou aux investissements, votre liquidité est garantie.',
      answers: [
        { text: 'Oui, sans frais et sans préavis', isCorrect: true },
        { text: 'Oui, mais avec des frais de retrait', isCorrect: false },
        { text: 'Non, il faut attendre 1 an minimum', isCorrect: false },
        { text: 'Non, l\'argent est bloqué jusqu\'à la retraite', isCorrect: false },
      ],
    },
  ];

  const createdDailyQuestions2 = [];
  for (const q of dailyQuiz2Questions) {
    let question = await prisma.question.findFirst({
      where: { text: q.text },
    });

    if (!question) {
      question = await prisma.question.create({
        data: { text: q.text, explanation: q.explanation },
      });

      if (question) {
        await prisma.answer.createMany({
          data: q.answers.map((a) => ({
            questionId: question!.id,
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        });
      }
    } else if (question) {
      if (!question.explanation && q.explanation) {
        question = await prisma.question.update({
          where: { id: question.id },
          data: { explanation: q.explanation },
        });
      }

      const questionId = question.id;
      const existingAnswers = await prisma.answer.findMany({
        where: { questionId },
      });

      if (existingAnswers.length === 0) {
        await prisma.answer.createMany({
          data: q.answers.map((a) => ({
            questionId,
            text: a.text,
            isCorrect: a.isCorrect,
          })),
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
      title: 'Daily Quiz - Épargne de précaution',
    },
  });

  if (!dailyQuiz1) {
    dailyQuiz1 = await prisma.quiz.create({
      data: {
        type: 'DAILY',
        title: 'Daily Quiz - Épargne de précaution',
        description: 'Questions du jour sur l\'épargne',
        date: yesterday,
        levelId: null,
      },
    });
  }

  // Lier les 3 questions au Daily Quiz 1
  for (let i = 0; i < createdDailyQuestions1.length; i++) {
    const existingLink = await prisma.quizQuestion.findFirst({
      where: {
        quizId: dailyQuiz1.id,
        questionId: createdDailyQuestions1[i].id,
      },
    });

    if (!existingLink) {
      await prisma.quizQuestion.create({
        data: {
          quizId: dailyQuiz1.id,
          questionId: createdDailyQuestions1[i].id,
          position: i + 1,
        },
      });
    }
  }

  // Daily Quiz d'aujourd'hui
  let dailyQuiz2 = await prisma.quiz.findFirst({
    where: {
      type: 'DAILY',
      date: today,
      title: 'Daily Quiz - Risques de l\'épargne',
    },
  });

  if (!dailyQuiz2) {
    dailyQuiz2 = await prisma.quiz.create({
      data: {
        type: 'DAILY',
        title: 'Daily Quiz - Risques de l\'épargne',
        description: 'Questions du jour sur les risques',
        date: today,
        levelId: null,
      },
    });
  }

  // Lier les 3 questions au Daily Quiz 2
  for (let i = 0; i < createdDailyQuestions2.length; i++) {
    const existingLink = await prisma.quizQuestion.findFirst({
      where: {
        quizId: dailyQuiz2.id,
        questionId: createdDailyQuestions2[i].id,
      },
    });

    if (!existingLink) {
      await prisma.quizQuestion.create({
        data: {
          quizId: dailyQuiz2.id,
          questionId: createdDailyQuestions2[i].id,
          position: i + 1,
        },
      });
    }
  }

  console.log(`✅ 2 Daily Quiz créés (hier et aujourd'hui) avec 3 questions chacun`);

  // Résumé
  console.log('\n✨ ========================================');
  console.log('✅ Seeding du niveau ESP terminé avec succès !');
  console.log('========================================');
  console.log('📊 Résumé des données créées :');
  console.log(`   - 1 Market: ${market.title}`);
  console.log(`   - 3 Submarkets: Livret, Assurance Vie, Bourse - ETF`);
  console.log(`   - 4 Assets: ${Object.keys(assets).join(', ')}`);
  console.log(`   - ${totalHistoryCount} AssetHistory points (${TOTAL_HISTORY_DAYS}/asset, historyStartDay=${HISTORY_START_DAY})`);
  console.log(`   - 1 Level: ${level.title} (ID: ${level.id}, Niveau ${level.number}, ~2min de jeu)`);
  console.log(`   - 2 Events: Boom technologique, Crise géopolitique`);
  console.log(`   - 5 Impacts sur les assets`);
  console.log(`   - 3 Goals: 2 obligatoires + 1 bonus`);
  console.log(`   - 1 Quiz MCQ: ${createdQuestions.length} questions`);
  console.log(`   - 2 Daily Quiz (hier et aujourd'hui) avec 3 questions chacun`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding du niveau ESP :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
