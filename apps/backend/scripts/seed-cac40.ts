import { PrismaClient } from '@cashou/db-app';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

interface CAC40Row {
  nom: string;
  ticker: string;
  secteur: string;
  market: string;
  submarket: string;
}

async function parseCSV(filePath: string): Promise<CAC40Row[]> {
  const fileContent = readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  // Skip header and parse rows
  const data: CAC40Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV with potential quoted fields
    const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
    if (!matches || matches.length < 5) continue;
    
    const fields = matches.map(field => {
      let cleaned = field.replace(/^,/, '').trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1).replace(/""/g, '"');
      }
      return cleaned;
    });
    
    if (fields[0] && fields[1]) { // Ensure we have at least name and ticker
      data.push({
        nom: fields[0],
        ticker: fields[1],
        secteur: fields[2] || '',
        market: fields[3] || '',
        submarket: fields[4] || ''
      });
    }
  }
  
  return data;
}

async function seedCAC40Data() {
  console.log('🌱 Seed CAC40 - Market, Submarket, Field et Asset uniquement\n');

  try {
    // Parse CSV file
    const csvPath = '/Users/chloee/Documents/epitech/finance/cac40_liste_finale.csv';
    console.log(`📂 Lecture du fichier: ${csvPath}`);
    const data = await parseCSV(csvPath);
    console.log(`✅ ${data.length} lignes parsées\n`);

    let marketCount = 0;
    let submarketCount = 0;
    let fieldCount = 0;
    let assetCount = 0;

    // Process each row
    for (const row of data) {
      console.log(`\n📊 Traitement: ${row.nom} (${row.ticker})`);

      // 1. Ensure Market exists
      let market = await prisma.market.findFirst({
        where: { title: row.market }
      });

      if (!market && row.market) {
        console.log(`  ➕ Création du market: ${row.market}`);
        market = await prisma.market.create({
          data: {
            title: row.market,
            description: `Market ${row.market}`
          }
        });
        marketCount++;
      } else if (market) {
        console.log(`  ✓ Market existe déjà: ${row.market}`);
      }

      // 2. Ensure Submarket exists
      let submarket = null;
      if (row.submarket && market) {
        submarket = await prisma.submarket.findFirst({
          where: {
            title: row.submarket,
            marketId: market.id
          }
        });

        if (!submarket) {
          console.log(`  ➕ Création du submarket: ${row.submarket}`);
          submarket = await prisma.submarket.create({
            data: {
              title: row.submarket,
              description: `Submarket ${row.submarket}`,
              marketId: market.id
            }
          });
          submarketCount++;
        } else {
          console.log(`  ✓ Submarket existe déjà: ${row.submarket}`);
        }
      }

      // 3. Ensure Field exists
      let field = null;
      if (row.secteur) {
        field = await prisma.field.findUnique({
          where: { name: row.secteur }
        });

        if (!field) {
          console.log(`  ➕ Création du field: ${row.secteur}`);
          field = await prisma.field.create({
            data: {
              name: row.secteur,
              marketId: market?.id
            }
          });
          fieldCount++;
        } else {
          console.log(`  ✓ Field existe déjà: ${row.secteur}`);
        }
      }

      // 4. Ensure Asset exists
      const existingAsset = await prisma.asset.findUnique({
        where: { symbol: row.ticker }
      });

      if (!existingAsset) {
        console.log(`  ➕ Création de l'asset: ${row.nom} (${row.ticker})`);
        await prisma.asset.create({
          data: {
            title: row.nom,
            symbol: row.ticker,
            field: row.secteur,
            description: `Asset ${row.nom} dans le secteur ${row.secteur}`,
            marketId: market?.id,
            submarketId: submarket?.id
          }
        });
        assetCount++;
      } else {
        console.log(`  ✓ Asset existe déjà: ${row.nom} (${row.ticker})`);
      }
    }

    console.log('\n\n📈 Résumé du seed:');
    console.log('─'.repeat(50));
    console.log(`✅ Markets créés: ${marketCount}`);
    console.log(`✅ Submarkets créés: ${submarketCount}`);
    console.log(`✅ Fields créés: ${fieldCount}`);
    console.log(`✅ Assets créés: ${assetCount}`);
    console.log('─'.repeat(50));
    console.log('\n✨ Seed terminé avec succès!\n');

  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    throw error;
  }
}

// Execute seed
seedCAC40Data()
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

