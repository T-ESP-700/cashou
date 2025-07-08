import {
  createLevel,
  createUser,
  createMarketWithSubmarkets,
  createAsset,
  createGameInstance,
  createTransaction,
  createNotification,
  getUserStats,
  getAllUsers
} from './examples/user-operations'
import prisma from './database'

/**
 * Fonction pour créer un jeu de données de test complet
 * Exécutez: bun run src/seed-data.ts
 */
async function seedDatabase() {
  console.log('🌱 Création de données de test pour Cashou...')
  
  try {
    await prisma.$connect()
    
    // 1. Créer un niveau
    console.log('1️⃣ Création d\'un niveau...')
    const level = await createLevel(
      'Niveau Débutant',
      1,
      3600, // 1 heure
      10000, // 10,000 de balance de départ
      1000, // 1,000 points requis
      'Premier niveau pour apprendre les bases du trading'
    )
    
    // 2. Créer un utilisateur
    console.log('2️⃣ Création d\'un utilisateur...')
    const user = await createUser(
      'trader_pro',
      'trader@example.com',
      level.id,
      'hashed_password_123'
    )
    
    // 3. Créer un marché avec des sous-marchés
    console.log('3️⃣ Création d\'un marché financier...')
    const market = await createMarketWithSubmarkets(
      'Marché des Cryptomonnaies',
      'Marché principal pour les actifs numériques',
      [
        { name: 'Bitcoin & Altcoins', description: 'Principales cryptomonnaies' },
        { name: 'DeFi', description: 'Finance décentralisée' },
        { name: 'NFT', description: 'Tokens non fongibles' }
      ]
    )
    
    // 4. Créer quelques actifs
    console.log('4️⃣ Création d\'actifs...')
    const bitcoinAsset = await createAsset(
      'Bitcoin',
      'BTC',
      market.id,
      market.submarkets[0].id,
      'La première et plus connue des cryptomonnaies'
    )
    
    const ethereumAsset = await createAsset(
      'Ethereum',
      'ETH',
      market.id,
      market.submarkets[1].id,
      'Plateforme blockchain pour smart contracts'
    )
    
    // 5. Créer une instance de jeu
    console.log('5️⃣ Création d\'une instance de jeu...')
    const gameInstance = await createGameInstance(
      user.id,
      level.id,
      'simulation',
      10000
    )
    
    // 6. Simuler quelques transactions
    console.log('6️⃣ Simulation de transactions...')
    
    // Récupérer le wallet créé automatiquement
    const wallet = await prisma.wallet.findFirst({
      where: { gameInstanceId: gameInstance.id }
    })
    
    if (wallet) {
      await createTransaction(
        wallet.id,
        bitcoinAsset.id,
        gameInstance.id,
        'BUY',
        2, // Acheter 2 BTC
        45000 // à 45,000 l'unité
      )
      
      await createTransaction(
        wallet.id,
        ethereumAsset.id,
        gameInstance.id,
        'BUY',
        10, // Acheter 10 ETH
        3000 // à 3,000 l'unité
      )
    }
    
    // 7. Créer une notification
    console.log('7️⃣ Création d\'une notification...')
    await createNotification(
      user.id,
      'Bienvenue sur Cashou !',
      'Votre compte a été créé avec succès. Commencez votre aventure trading !',
      'Profile'
    )
    
    // 8. Afficher les statistiques de l'utilisateur
    console.log('8️⃣ Statistiques de l\'utilisateur...')
    await getUserStats(user.id)
    
    console.log('\n🎉 Données de test créées avec succès !')
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter seulement si ce fichier est appelé directement
if (import.meta.main) {
  seedDatabase()
} 