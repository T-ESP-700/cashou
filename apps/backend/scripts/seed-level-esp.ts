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
    title: 'Niveau Démo ESP',
    number: 99,
    duration: 365,
    speed: 262800,
    startBalance: 5000,
    pointsRequired: 0,
    historyStartDay: HISTORY_START_DAY, // Game starts at day 365 (year 2), player sees 1 year of past
    description: 'Niveau de démonstration pour l\'événement ESP. Partie de 2 minutes avec 3 enveloppes et 2 événements dramatiques.',
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
      triggerPercent: 88,
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
