import { PrismaClient } from '@cashou/db-app';

const prisma = new PrismaClient();

async function main() {
  console.log('Debut du seeding des enveloppes et assets avec frais...');

  // ============================================================
  // 1. MARKET: Marches financiers
  // ============================================================
  console.log('Creation du marche "Marches financiers"...');
  let marketFinancier = await prisma.market.findFirst({
    where: { title: 'Marches financiers' },
  });

  if (marketFinancier) {
    marketFinancier = await prisma.market.update({
      where: { id: marketFinancier.id },
      data: {
        description: 'Marche regroupant les enveloppes fiscales pour investir en bourse : CTO, PEA et autres.',
      },
    });
  } else {
    marketFinancier = await prisma.market.create({
      data: {
        title: 'Marches financiers',
        description: 'Marche regroupant les enveloppes fiscales pour investir en bourse : CTO, PEA et autres.',
      },
    });
  }
  console.log(`  Market: ${marketFinancier.title} (ID: ${marketFinancier.id})`);

  // --- Submarket: CTO ---
  console.log('  Creation du sous-marche "CTO"...');
  let smCTO = await prisma.submarket.findFirst({
    where: { title: 'CTO', marketId: marketFinancier.id },
  });

  if (smCTO) {
    smCTO = await prisma.submarket.update({
      where: { id: smCTO.id },
      data: {
        description: 'Compte-Titres Ordinaire. Enveloppe flexible sans plafond, frais reduits.',
        entryFee: 0.5,
        exitFee: 0.5,
        managementFee: 0.25,
        maxAmount: null,
        marketId: marketFinancier.id,
      },
    });
  } else {
    smCTO = await prisma.submarket.create({
      data: {
        title: 'CTO',
        description: 'Compte-Titres Ordinaire. Enveloppe flexible sans plafond, frais reduits.',
        entryFee: 0.5,
        exitFee: 0.5,
        managementFee: 0.25,
        maxAmount: null,
        marketId: marketFinancier.id,
      },
    });
  }
  console.log(`    Submarket: ${smCTO.title} (ID: ${smCTO.id}) - Frais: ${smCTO.entryFee}%/${smCTO.exitFee}%/${smCTO.managementFee}%`);

  // Assets CTO
  const ctoAssets = [
    { title: 'TotalEnergies', symbol: 'CTO_TOTAL', rate: 6.5, description: 'Action TotalEnergies via CTO. Rendement eleve mais soumis a la volatilite du marche energetique.' },
    { title: 'LVMH', symbol: 'CTO_LVMH', rate: 7.0, description: 'Action LVMH via CTO. Leader mondial du luxe avec un rendement attractif.' },
    { title: 'ETF MSCI World', symbol: 'CTO_ETF_W', rate: 8.0, description: 'ETF diversifie mondial via CTO. Exposition aux marches internationaux avec un bon rendement.' },
  ];

  for (const a of ctoAssets) {
    const asset = await prisma.asset.upsert({
      where: { symbol: a.symbol },
      update: { title: a.title, rate: a.rate, description: a.description, marketId: marketFinancier.id, submarketId: smCTO.id },
      create: { title: a.title, symbol: a.symbol, rate: a.rate, description: a.description, marketId: marketFinancier.id, submarketId: smCTO.id },
    });
    console.log(`      Asset: ${asset.title} (${asset.symbol}) - Rate: ${asset.rate}%`);
  }

  // --- Submarket: PEA ---
  console.log('  Creation du sous-marche "PEA"...');
  let smPEA = await prisma.submarket.findFirst({
    where: { title: 'PEA', marketId: marketFinancier.id },
  });

  if (smPEA) {
    smPEA = await prisma.submarket.update({
      where: { id: smPEA.id },
      data: {
        description: 'Plan Epargne en Actions. Enveloppe fiscalement avantageuse, plafonnee a 150 000 EUR.',
        entryFee: 1.0,
        exitFee: 0.5,
        managementFee: 0.3,
        maxAmount: 150000,
        marketId: marketFinancier.id,
      },
    });
  } else {
    smPEA = await prisma.submarket.create({
      data: {
        title: 'PEA',
        description: 'Plan Epargne en Actions. Enveloppe fiscalement avantageuse, plafonnee a 150 000 EUR.',
        entryFee: 1.0,
        exitFee: 0.5,
        managementFee: 0.3,
        maxAmount: 150000,
        marketId: marketFinancier.id,
      },
    });
  }
  console.log(`    Submarket: ${smPEA.title} (ID: ${smPEA.id}) - Frais: ${smPEA.entryFee}%/${smPEA.exitFee}%/${smPEA.managementFee}% - Plafond: ${smPEA.maxAmount}`);

  // Assets PEA
  const peaAssets = [
    { title: 'Air Liquide', symbol: 'PEA_AI', rate: 6.0, description: 'Action Air Liquide via PEA. Valeur de croissance stable dans le secteur chimie/gaz.' },
    { title: 'Schneider Electric', symbol: 'PEA_SU', rate: 7.0, description: 'Action Schneider Electric via PEA. Leader de la gestion energetique.' },
    { title: 'ETF CAC 40', symbol: 'PEA_ETF_C', rate: 6.5, description: 'ETF replicant le CAC 40 via PEA. Diversification sur les grandes entreprises francaises.' },
  ];

  for (const a of peaAssets) {
    const asset = await prisma.asset.upsert({
      where: { symbol: a.symbol },
      update: { title: a.title, rate: a.rate, description: a.description, marketId: marketFinancier.id, submarketId: smPEA.id },
      create: { title: a.title, symbol: a.symbol, rate: a.rate, description: a.description, marketId: marketFinancier.id, submarketId: smPEA.id },
    });
    console.log(`      Asset: ${asset.title} (${asset.symbol}) - Rate: ${asset.rate}%`);
  }

  // ============================================================
  // 2. MARKET: Assurance & Placements
  // ============================================================
  console.log('Creation du marche "Assurance & Placements"...');
  let marketAssurance = await prisma.market.findFirst({
    where: { title: 'Assurance & Placements' },
  });

  if (marketAssurance) {
    marketAssurance = await prisma.market.update({
      where: { id: marketAssurance.id },
      data: {
        description: 'Marche regroupant les produits d\'assurance vie et placements securises.',
      },
    });
  } else {
    marketAssurance = await prisma.market.create({
      data: {
        title: 'Assurance & Placements',
        description: 'Marche regroupant les produits d\'assurance vie et placements securises.',
      },
    });
  }
  console.log(`  Market: ${marketAssurance.title} (ID: ${marketAssurance.id})`);

  // --- Submarket: Assurance Vie ---
  console.log('  Creation du sous-marche "Assurance Vie"...');
  let smAV = await prisma.submarket.findFirst({
    where: { title: 'Assurance Vie', marketId: marketAssurance.id },
  });

  if (smAV) {
    smAV = await prisma.submarket.update({
      where: { id: smAV.id },
      data: {
        description: 'Assurance Vie. Enveloppe polyvalente avec frais d\'entree eleves mais avantages fiscaux a long terme.',
        entryFee: 3.0,
        exitFee: 1.0,
        managementFee: 0.75,
        maxAmount: 150000,
        marketId: marketAssurance.id,
      },
    });
  } else {
    smAV = await prisma.submarket.create({
      data: {
        title: 'Assurance Vie',
        description: 'Assurance Vie. Enveloppe polyvalente avec frais d\'entree eleves mais avantages fiscaux a long terme.',
        entryFee: 3.0,
        exitFee: 1.0,
        managementFee: 0.75,
        maxAmount: 150000,
        marketId: marketAssurance.id,
      },
    });
  }
  console.log(`    Submarket: ${smAV.title} (ID: ${smAV.id}) - Frais: ${smAV.entryFee}%/${smAV.exitFee}%/${smAV.managementFee}% - Plafond: ${smAV.maxAmount}`);

  // Assets AV
  const avAssets = [
    { title: 'Fonds Euro', symbol: 'AV_EURO', rate: 2.5, description: 'Fonds en euros securise dans l\'assurance vie. Capital garanti avec rendement modere.' },
    { title: 'UC Actions', symbol: 'AV_UC', rate: 5.0, description: 'Unites de Compte en actions dans l\'assurance vie. Plus risque mais meilleur rendement potentiel.' },
  ];

  for (const a of avAssets) {
    const asset = await prisma.asset.upsert({
      where: { symbol: a.symbol },
      update: { title: a.title, rate: a.rate, description: a.description, marketId: marketAssurance.id, submarketId: smAV.id },
      create: { title: a.title, symbol: a.symbol, rate: a.rate, description: a.description, marketId: marketAssurance.id, submarketId: smAV.id },
    });
    console.log(`      Asset: ${asset.title} (${asset.symbol}) - Rate: ${asset.rate}%`);
  }

  // ============================================================
  // 3. MARKET: Investissements alternatifs
  // ============================================================
  console.log('Creation du marche "Investissements alternatifs"...');
  let marketAlternatif = await prisma.market.findFirst({
    where: { title: 'Investissements alternatifs' },
  });

  if (marketAlternatif) {
    marketAlternatif = await prisma.market.update({
      where: { id: marketAlternatif.id },
      data: {
        description: 'Marche regroupant les investissements alternatifs : Private Equity, SCPI, etc.',
      },
    });
  } else {
    marketAlternatif = await prisma.market.create({
      data: {
        title: 'Investissements alternatifs',
        description: 'Marche regroupant les investissements alternatifs : Private Equity, SCPI, etc.',
      },
    });
  }
  console.log(`  Market: ${marketAlternatif.title} (ID: ${marketAlternatif.id})`);

  // --- Submarket: Private Equity ---
  console.log('  Creation du sous-marche "Private Equity"...');
  let smPE = await prisma.submarket.findFirst({
    where: { title: 'Private Equity', marketId: marketAlternatif.id },
  });

  if (smPE) {
    smPE = await prisma.submarket.update({
      where: { id: smPE.id },
      data: {
        description: 'Private Equity. Investissement dans des entreprises non cotees. Rendement potentiel eleve mais frais importants.',
        entryFee: 5.0,
        exitFee: 3.0,
        managementFee: 2.0,
        maxAmount: null,
        marketId: marketAlternatif.id,
      },
    });
  } else {
    smPE = await prisma.submarket.create({
      data: {
        title: 'Private Equity',
        description: 'Private Equity. Investissement dans des entreprises non cotees. Rendement potentiel eleve mais frais importants.',
        entryFee: 5.0,
        exitFee: 3.0,
        managementFee: 2.0,
        maxAmount: null,
        marketId: marketAlternatif.id,
      },
    });
  }
  console.log(`    Submarket: ${smPE.title} (ID: ${smPE.id}) - Frais: ${smPE.entryFee}%/${smPE.exitFee}%/${smPE.managementFee}%`);

  const peFund = await prisma.asset.upsert({
    where: { symbol: 'PE_FUND' },
    update: { title: 'Fonds PE', rate: 10.0, description: 'Fonds de Private Equity. Haut rendement potentiel mais illiquide et frais eleves.', marketId: marketAlternatif.id, submarketId: smPE.id },
    create: { title: 'Fonds PE', symbol: 'PE_FUND', rate: 10.0, description: 'Fonds de Private Equity. Haut rendement potentiel mais illiquide et frais eleves.', marketId: marketAlternatif.id, submarketId: smPE.id },
  });
  console.log(`      Asset: ${peFund.title} (${peFund.symbol}) - Rate: ${peFund.rate}%`);

  // --- Submarket: SCPI ---
  console.log('  Creation du sous-marche "SCPI"...');
  let smSCPI = await prisma.submarket.findFirst({
    where: { title: 'SCPI', marketId: marketAlternatif.id },
  });

  if (smSCPI) {
    smSCPI = await prisma.submarket.update({
      where: { id: smSCPI.id },
      data: {
        description: 'SCPI Immobilier. Investissement immobilier collectif avec frais d\'entree eleves mais pas de frais de sortie.',
        entryFee: 8.0,
        exitFee: 0.0,
        managementFee: 0.5,
        maxAmount: null,
        marketId: marketAlternatif.id,
      },
    });
  } else {
    smSCPI = await prisma.submarket.create({
      data: {
        title: 'SCPI',
        description: 'SCPI Immobilier. Investissement immobilier collectif avec frais d\'entree eleves mais pas de frais de sortie.',
        entryFee: 8.0,
        exitFee: 0.0,
        managementFee: 0.5,
        maxAmount: null,
        marketId: marketAlternatif.id,
      },
    });
  }
  console.log(`    Submarket: ${smSCPI.title} (ID: ${smSCPI.id}) - Frais: ${smSCPI.entryFee}%/${smSCPI.exitFee}%/${smSCPI.managementFee}%`);

  const scpiImo = await prisma.asset.upsert({
    where: { symbol: 'SCPI_IMO' },
    update: { title: 'SCPI Immobilier', rate: 4.5, description: 'SCPI diversifiee investie dans l\'immobilier tertiaire. Rendement stable de 4.5% par an.', marketId: marketAlternatif.id, submarketId: smSCPI.id },
    create: { title: 'SCPI Immobilier', symbol: 'SCPI_IMO', rate: 4.5, description: 'SCPI diversifiee investie dans l\'immobilier tertiaire. Rendement stable de 4.5% par an.', marketId: marketAlternatif.id, submarketId: smSCPI.id },
  });
  console.log(`      Asset: ${scpiImo.title} (${scpiImo.symbol}) - Rate: ${scpiImo.rate}%`);

  // ============================================================
  // 4. MARKET: Crypto
  // ============================================================
  console.log('Creation du marche "Crypto"...');
  let marketCrypto = await prisma.market.findFirst({
    where: { title: 'Crypto' },
  });

  if (marketCrypto) {
    marketCrypto = await prisma.market.update({
      where: { id: marketCrypto.id },
      data: {
        description: 'Marche des crypto-monnaies. Volatilite elevee, sans rendement garanti.',
      },
    });
  } else {
    marketCrypto = await prisma.market.create({
      data: {
        title: 'Crypto',
        description: 'Marche des crypto-monnaies. Volatilite elevee, sans rendement garanti.',
      },
    });
  }
  console.log(`  Market: ${marketCrypto.title} (ID: ${marketCrypto.id})`);

  // --- Submarket: Crypto ---
  console.log('  Creation du sous-marche "Crypto"...');
  let smCrypto = await prisma.submarket.findFirst({
    where: { title: 'Crypto', marketId: marketCrypto.id },
  });

  if (smCrypto) {
    smCrypto = await prisma.submarket.update({
      where: { id: smCrypto.id },
      data: {
        description: 'Crypto-monnaies. Frais de transaction a chaque achat/vente, pas de frais de gestion.',
        entryFee: 1.5,
        exitFee: 1.5,
        managementFee: 0.0,
        maxAmount: null,
        marketId: marketCrypto.id,
      },
    });
  } else {
    smCrypto = await prisma.submarket.create({
      data: {
        title: 'Crypto',
        description: 'Crypto-monnaies. Frais de transaction a chaque achat/vente, pas de frais de gestion.',
        entryFee: 1.5,
        exitFee: 1.5,
        managementFee: 0.0,
        maxAmount: null,
        marketId: marketCrypto.id,
      },
    });
  }
  console.log(`    Submarket: ${smCrypto.title} (ID: ${smCrypto.id}) - Frais: ${smCrypto.entryFee}%/${smCrypto.exitFee}%/${smCrypto.managementFee}%`);

  const btc = await prisma.asset.upsert({
    where: { symbol: 'CRYPTO_BTC' },
    update: { title: 'Bitcoin (BTC)', rate: 0.0, description: 'Bitcoin, la premiere crypto-monnaie. Pas de rendement garanti, valeur basee sur la speculation.', marketId: marketCrypto.id, submarketId: smCrypto.id },
    create: { title: 'Bitcoin (BTC)', symbol: 'CRYPTO_BTC', rate: 0.0, description: 'Bitcoin, la premiere crypto-monnaie. Pas de rendement garanti, valeur basee sur la speculation.', marketId: marketCrypto.id, submarketId: smCrypto.id },
  });
  console.log(`      Asset: ${btc.title} (${btc.symbol}) - Rate: ${btc.rate}%`);

  // ============================================================
  // Resume
  // ============================================================
  console.log('\n========================================');
  console.log('Seeding des enveloppes et assets termine !');
  console.log('========================================');
  console.log('Resume :');
  console.log('  - 4 Markets crees/mis a jour');
  console.log('  - 6 Submarkets avec frais configures');
  console.log('  - 10 Assets crees/mis a jour');
  console.log('========================================');
  console.log('');
  console.log('Tableau recapitulatif des frais :');
  console.log('  CTO          : entree 0.5%, sortie 0.5%, gestion 0.25%');
  console.log('  PEA          : entree 1.0%, sortie 0.5%, gestion 0.3%, plafond 150k');
  console.log('  Assurance Vie: entree 3.0%, sortie 1.0%, gestion 0.75%, plafond 150k');
  console.log('  Private Equity: entree 5.0%, sortie 3.0%, gestion 2.0%');
  console.log('  SCPI         : entree 8.0%, sortie 0.0%, gestion 0.5%');
  console.log('  Crypto       : entree 1.5%, sortie 1.5%, gestion 0.0%');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Erreur lors du seeding des enveloppes :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
