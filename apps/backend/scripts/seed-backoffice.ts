import path from 'path'
import { config as loadEnv } from 'dotenv'
import { PrismaClient } from '@prisma/client'

const envPath = path.resolve(process.cwd(), '../../.env')
loadEnv({ path: envPath })

const prisma = new PrismaClient()

type MarketSeed = {
  key: string
  title: string
  description?: string
  submarkets: Array<{ key: string; title: string; description?: string }>
  fields: Array<{ key: string; name: string }>
  assets: Array<{
    title: string
    symbol: string
    field?: string
    fieldKey?: string
    description?: string
    submarketKey?: string
    histories?: Array<{ daysAgo: number; value: number; volume: number }>
  }>
  events: Array<{
    title: string
    description?: string
    hasImpact?: boolean
    impacts?: Array<{ fieldKey?: string; submarketKey?: string; coef: number }>
    assetLinks?: Array<{ symbol: string; value: number; volume: number }>
  }>
}

const levelSeeds = [
  {
    title: 'Onboarding',
    number: 1,
    duration: 10,
    speed: 1,
    startBalance: 10000,
    pointsRequired: 0,
    description: 'Introduction aux mécanismes de Cashou',
  },
  {
    title: 'Accélération',
    number: 2,
    duration: 15,
    speed: 2,
    startBalance: 25000,
    pointsRequired: 750,
    description: 'Débloque les projections avancées et les quiz experts',
  },
  {
    title: 'Stratégie',
    number: 3,
    duration: 20,
    speed: 3,
    startBalance: 50000,
    pointsRequired: 1800,
    description: 'Gestion multi-marchés et scénarios d’impact complexes',
  },
]

const marketSeeds: MarketSeed[] = [
  {
    key: 'tech',
    title: 'Tech & IA',
    description: 'Écosystème IA européenne, SaaS et data infrastructure',
    submarkets: [
      { key: 'ai-infra', title: 'AI Infrastructure', description: 'GPU souverains et data centers' },
      { key: 'vertical-saas', title: 'Vertical SaaS', description: 'Solutions SaaS spécialisées' },
    ],
    fields: [
      { key: 'gen-ai', name: 'Generative AI' },
      { key: 'health-saas', name: 'HealthTech SaaS' },
    ],
    assets: [
      {
        title: 'ComputeForge',
        symbol: 'CFOR',
        field: 'Generative AI',
        fieldKey: 'gen-ai',
        description: 'Opérateur souverain de GPU européens',
        submarketKey: 'ai-infra',
        histories: [
          { daysAgo: 5, value: 118000, volume: 180 },
          { daysAgo: 2, value: 125000, volume: 220 },
          { daysAgo: 0, value: 131000, volume: 260 },
        ],
      },
      {
        title: 'ClinicOS',
        symbol: 'CLIN',
        field: 'HealthTech SaaS',
        fieldKey: 'health-saas',
        description: 'Suite SaaS médicale augmentée par IA',
        submarketKey: 'vertical-saas',
        histories: [
          { daysAgo: 7, value: 72000, volume: 160 },
          { daysAgo: 1, value: 81000, volume: 210 },
        ],
      },
    ],
    events: [
      {
        title: 'Plan GPU européen',
        description: 'Capex public pour doubler la capacité de calcul souveraine',
        hasImpact: true,
        impacts: [
          { submarketKey: 'ai-infra', coef: 12 },
          { fieldKey: 'gen-ai', coef: 8 },
        ],
        assetLinks: [{ symbol: 'CFOR', value: 134000, volume: 300 }],
      },
    ],
  },
  {
    key: 'energy',
    title: 'Énergie & Climat',
    description: 'Hydrogène vert, grid intelligence et stockage longue durée',
    submarkets: [
      { key: 'hydrogen', title: 'Hydrogène vert', description: 'Production et distribution H2' },
      { key: 'storage', title: 'Stockage longue durée', description: 'Batteries et power-to-heat' },
    ],
    fields: [
      { key: 'grid', name: 'Smart Grid' },
      { key: 'hydrogen', name: 'HydrogenTech' },
    ],
    assets: [
      {
        title: 'VoltStack',
        symbol: 'VOLT',
        field: 'Smart Grid',
        fieldKey: 'grid',
        description: 'Plateforme d’optimisation des réseaux électriques',
        submarketKey: 'storage',
        histories: [
          { daysAgo: 10, value: 54000, volume: 140 },
          { daysAgo: 3, value: 60000, volume: 200 },
        ],
      },
      {
        title: 'H2Pulse',
        symbol: 'H2P',
        field: 'HydrogenTech',
        fieldKey: 'hydrogen',
        description: 'Electrolyseurs modulaires',
        submarketKey: 'hydrogen',
        histories: [
          { daysAgo: 6, value: 88000, volume: 120 },
          { daysAgo: 1, value: 94000, volume: 150 },
        ],
      },
    ],
    events: [
      {
        title: 'Programme Hydrogène France 2030',
        description: 'Nouveau budget de 2,4Md€ pour soutenir les projets H2',
        hasImpact: true,
        impacts: [
          { submarketKey: 'hydrogen', coef: 10 },
          { fieldKey: 'hydrogen', coef: 7 },
        ],
        assetLinks: [{ symbol: 'H2P', value: 98000, volume: 200 }],
      },
    ],
  },
]

const daysAgoToDate = (daysAgo: number) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date
}

async function clearTables() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "impacts","event_assets","asset_histories","assets","fields","submarkets","markets","events","levels" RESTART IDENTITY CASCADE`,
  )
}

async function seedLevels() {
  await prisma.level.createMany({ data: levelSeeds })
  return prisma.level.findMany()
}

async function seedMarkets() {
  const marketMap = new Map<string, number>()
  const submarketMap = new Map<string, number>()
  const fieldMap = new Map<string, number>()
  const fieldNameMap = new Map<string, number>()
  const assetMap = new Map<string, number>()

  for (const marketSeed of marketSeeds) {
    const market = await prisma.market.create({
      data: {
        title: marketSeed.title,
        description: marketSeed.description,
      },
    })
    marketMap.set(marketSeed.key, market.id)

    for (const sub of marketSeed.submarkets) {
      const createdSub = await prisma.submarket.create({
        data: {
          title: sub.title,
          description: sub.description,
          marketId: market.id,
        },
      })
      submarketMap.set(`${marketSeed.key}:${sub.key}`, createdSub.id)
    }

    for (const field of marketSeed.fields) {
      const createdField = await prisma.field.create({
        data: {
          name: field.name,
          marketId: market.id,
        },
      })
      fieldMap.set(`${marketSeed.key}:${field.key}`, createdField.id)
      fieldNameMap.set(`${marketSeed.key}:${field.name.trim().toLowerCase()}`, createdField.id)
    }

    for (const asset of marketSeed.assets) {
      const fieldId = (() => {
        if (asset.fieldKey) {
          return fieldMap.get(`${marketSeed.key}:${asset.fieldKey}`) ?? null
        }
        if (asset.field) {
          return fieldNameMap.get(`${marketSeed.key}:${asset.field.trim().toLowerCase()}`) ?? null
        }
        return null
      })()

      const createdAsset = await prisma.asset.create({
        data: {
          title: asset.title,
          symbol: asset.symbol,
          description: asset.description,
          fieldId,
          marketId: market.id,
          submarketId: asset.submarketKey
            ? submarketMap.get(`${marketSeed.key}:${asset.submarketKey}`) ?? null
            : null,
        },
      })
      assetMap.set(asset.symbol, createdAsset.id)

      if (asset.histories?.length) {
        await prisma.assetHistory.createMany({
          data: asset.histories.map((history) => ({
            assetId: createdAsset.id,
            timestamp: daysAgoToDate(history.daysAgo),
            value: history.value,
            volume: history.volume,
          })),
        })
      }
    }

    for (const event of marketSeed.events) {
      const createdEvent = await prisma.event.create({
        data: {
          title: event.title,
          description: event.description,
          hasImpact: event.hasImpact ?? true,
        },
      })

      if (event.impacts?.length) {
        for (const impact of event.impacts) {
          await prisma.impact.create({
            data: {
              eventId: createdEvent.id,
              fieldId: impact.fieldKey
                ? fieldMap.get(`${marketSeed.key}:${impact.fieldKey}`) ?? null
                : null,
              submarketId: impact.submarketKey
                ? submarketMap.get(`${marketSeed.key}:${impact.submarketKey}`) ?? null
                : null,
              coef: impact.coef,
            },
          })
        }
      }

      if (event.assetLinks?.length) {
        for (const link of event.assetLinks) {
          const assetId = assetMap.get(link.symbol)
          if (!assetId) continue
          await prisma.eventAsset.create({
            data: {
              eventId: createdEvent.id,
              assetId,
              date: new Date(),
              value: link.value,
              volume: link.volume,
            },
          })
        }
      }
    }
  }

  return { marketMap, submarketMap, fieldMap, assetMap }
}

async function main() {
  console.log('🌱 Seed Cashou Backoffice')
  await clearTables()
  console.log('🧹 Tables nettoyées')

  await seedLevels()
  console.log('📚 Niveaux créés')

  await seedMarkets()
  console.log('📈 Marchés, sous-marchés, assets et impacts créés')

  console.log('✅ Seed terminé avec succès')
}

main()
  .catch((error) => {
    console.error('❌ Seed échoué', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
