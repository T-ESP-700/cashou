/**
 * Test script pour valider la logique de fin de partie
 * Simule: création d'une partie, achat d'assets, passage du temps, validation des goals
 */
import { PrismaClient } from '@cashou/db-app';

const prisma = new PrismaClient();

async function testLevel1GoalValidation() {
    console.log('🧪 Test de validation du Goal - Niveau 1\n');

    // 1. Récupérer le niveau 1 et ses données
    console.log('📚 Récupération du niveau 1...');
    const level = await prisma.level.findFirst({
        where: { number: 1 },
        include: {
            levelGoals: {
                include: { goal: true }
            }
        }
    });

    if (!level) {
        console.error('❌ Niveau 1 non trouvé. Lancez d\'abord: bun run scripts/seed-level1.ts');
        return;
    }

    console.log(`✅ Niveau trouvé: ${level.title}`);
    console.log(`   - Start Balance: ${level.startBalance}€`);
    console.log(`   - Goals: ${level.levelGoals.map(lg => lg.goal?.title).join(', ')}`);

    // 2. Récupérer le Livret A
    console.log('\n💰 Récupération du Livret A...');
    const livretA = await prisma.asset.findFirst({
        where: { symbol: 'LIVRET_A' }
    });

    if (!livretA) {
        console.error('❌ Livret A non trouvé');
        return;
    }
    console.log(`✅ Asset trouvé: ${livretA.title} (rate: ${livretA.rate}%)`);

    // 3. Créer un utilisateur de test si nécessaire
    console.log('\n👤 Création/récupération de l\'utilisateur de test...');
    let testUser = await prisma.user.findFirst({
        where: { email: 'test-goal@cashou.fr' }
    });

    if (!testUser) {
        testUser = await prisma.user.create({
            data: {
                id: 'test-goal-user-' + Date.now(),
                email: 'test-goal@cashou.fr',
                name: 'Testeur Goal',
                levelId: level.id
            }
        });
        console.log('✅ Utilisateur créé');
    } else {
        console.log('✅ Utilisateur existant');
    }

    // 4. Créer une GameInstance
    console.log('\n🎮 Création de la partie...');
    const startBalance = Number(level.startBalance) || 2000;

    const gameInstance = await prisma.gameInstance.create({
        data: {
            userId: testUser.id,
            levelId: level.id,
            startBalance: startBalance,
            type: 'STANDARD',
            isPaused: false
        }
    });
    console.log(`✅ Partie créée (ID: ${gameInstance.id})`);

    // 5. Créer un Wallet avec le startBalance
    console.log('\n💳 Création du wallet...');
    const wallet = await prisma.wallet.create({
        data: {
            userId: testUser.id,
            gameInstanceId: gameInstance.id,
            amount: startBalance
        }
    });
    console.log(`✅ Wallet créé avec ${startBalance}€`);

    // 6. Acheter du Livret A (500€)
    const buyAmount = 500;
    const buyPrice = 1; // Prix unitaire de 1€ par part
    const quantity = buyAmount / buyPrice;

    console.log(`\n📈 Achat de ${quantity} parts de Livret A à ${buyPrice}€...`);

    await prisma.transaction.create({
        data: {
            walletId: wallet.id,
            assetId: livretA.id,
            gameInstanceId: gameInstance.id,
            type: 'BUY',
            quantity: quantity,
            unitPrice: buyPrice,
            totalValue: buyAmount,
            transactionDate: new Date(),
            source: 'TEST_BUY'
        }
    });

    // Débiter le wallet
    await prisma.wallet.update({
        where: { id: wallet.id },
        data: { amount: startBalance - buyAmount }
    });

    console.log(`✅ Achat effectué: ${quantity} x Livret A = ${buyAmount}€`);
    console.log(`   Wallet après achat: ${startBalance - buyAmount}€`);

    // 7. Simuler le passage du temps (les intérêts)
    console.log('\n⏰ Simulation du passage du temps (1 an avec 1.7% d\'intérêts)...');

    // Après 1 an à 1.7%, les 500€ deviennent ~508.50€
    const interestRate = livretA.rate || 1.7;
    const assetValueAfter1Year = buyAmount * (1 + interestRate / 100);

    console.log(`   Valeur initiale: ${buyAmount}€`);
    console.log(`   Après 1 an (+${interestRate}%): ${assetValueAfter1Year.toFixed(2)}€`);

    // Note: le calcul du nouveau prix unitaire (assetValueAfter1Year / quantity)
    // n'est pas nécessaire car on ne modifie pas la transaction existante, le service endGame 
    // utilise le lastPrice de la transaction, donc on crée une transaction "INTEREST"
    // Pour ce test, on va simplement faire un check manuel

    // 8. Calculer le total (wallet + assets)
    const walletBalance = startBalance - buyAmount; // 1500€
    const assetsValue = assetValueAfter1Year; // ~508.50€
    const totalValue = walletBalance + assetsValue; // ~2008.50€

    console.log('\n📊 État final simulé:');
    console.log(`   Wallet: ${walletBalance}€`);
    console.log(`   Assets (Livret A): ${assetsValue.toFixed(2)}€`);
    console.log(`   Total: ${totalValue.toFixed(2)}€`);
    console.log(`   Start Balance: ${startBalance}€`);
    console.log(`   Différence: +${(totalValue - startBalance).toFixed(2)}€`);

    // 9. Vérifier manuellement le goal
    const goal = level.levelGoals[0]?.goal;
    if (goal) {
        console.log(`\n🎯 Validation du Goal "${goal.title}":`);
        console.log(`   Type: ${goal.goalType}`);
        console.log(`   Value: ${goal.goalValue}`);

        if (goal.goalType === 'wallet_gte_start') {
            const isValidated = totalValue >= startBalance;
            console.log(`   Check: ${totalValue.toFixed(2)} >= ${startBalance} ?`);
            console.log(`   Résultat: ${isValidated ? '✅ VALIDÉ' : '❌ ÉCHOUÉ'}`);
        }
    }

    // 10. Appeler le vrai endpoint endGame via le service
    console.log('\n🔄 Appel du service EndGame...');

    // Import dynamique pour éviter les problèmes de module
    const { EndGameService } = await import('../src/trpc/services/end-game.service');
    const endGameService = new EndGameService();

    try {
        const result = await endGameService.endGame(gameInstance.id);

        console.log('\n📋 Résultat du EndGame:');
        console.log(`   Success: ${result.success ? '✅' : '❌'}`);
        console.log(`   Start Balance: ${result.startBalance}€`);
        console.log(`   Wallet: ${result.walletBalance}€`);
        console.log(`   Assets: ${result.assetsValue}€`);
        console.log(`   Total: ${result.totalValue}€`);
        console.log(`   Goals:`);
        for (const g of result.goals) {
            console.log(`     - ${g.title}: ${g.validated ? '✅ VALIDÉ' : '❌ ÉCHOUÉ'}`);
        }
        console.log(`\n   ${result.message}`);
    } catch (error) {
        console.error('❌ Erreur lors de l\'appel EndGame:', error);
    }

    // Cleanup: supprimer les données de test
    console.log('\n🧹 Nettoyage des données de test...');
    await prisma.transaction.deleteMany({ where: { gameInstanceId: gameInstance.id } });
    await prisma.wallet.deleteMany({ where: { gameInstanceId: gameInstance.id } });
    await prisma.gameInstance.delete({ where: { id: gameInstance.id } });
    console.log('✅ Données de test supprimées');

    console.log('\n✨ Test terminé !');
}

testLevel1GoalValidation()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
