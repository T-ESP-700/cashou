import prisma from './backend/src/database'

async function main() {
  console.log('🚀 Connexion à la base de données Cashou...')
  
  try {
    // Test de connexion à la base de données
    await prisma.$connect()
    console.log('✅ Connexion à la base de données réussie !')
    
    // Vérifier le nombre d'enregistrements dans les tables principales
    const userCount = await prisma.user.count()
    const levelCount = await prisma.level.count()
    const marketCount = await prisma.market.count()
    const assetCount = await prisma.asset.count()
    
    console.log('\n📊 État actuel de la base de données:')
    console.log(`👤 Utilisateurs: ${userCount}`)
    console.log(`🎯 Niveaux: ${levelCount}`)
    console.log(`🏪 Marchés: ${marketCount}`)
    console.log(`💰 Actifs: ${assetCount}`)
    
    if (userCount === 0) {
      console.log('\n✨ Base de données vide et prête à être utilisée !')
      console.log('\n💡 Pour créer des données de test, utilisez les fonctions dans src/examples/user-operations.ts')
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 Déconnexion de la base de données')
  }
}

// Exécuter seulement si ce fichier est appelé directement
if (import.meta.main) {
  main()
}