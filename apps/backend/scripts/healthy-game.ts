/**
 * Test script pour valider la chaine complete du jeu
 * Simule: demarrer niveau 1, investir dans Livret A, terminer partie, verifier interets
 */
import { PrismaClient, Prisma } from '@cashou/db-app';
import { InvestmentService } from '../src/trpc/services/investment.service';
import { EndGameService } from '../src/trpc/services/end-game.service';
import { GameTimeService } from '../src/trpc/services/game-time.service';

const prisma = new PrismaClient();
const investmentService = new InvestmentService(prisma);
const endGameService = new EndGameService(prisma);
const gameTimeService = new GameTimeService();

// Configuration du test
const TEST_USER_EMAIL = 'test-healthy-game@cashou.fr';
const INVESTMENT_AMOUNT = 1000; // euros a investir
const SIMULATED_REAL_SECONDS = 60; // secondes reelles simulees

async function healthyGame() {
    console.log('='.repeat(60));
    console.log('  HEALTHY GAME - Test complet du systeme de jeu');
    console.log('='.repeat(60));
    console.log('');

    let gameInstance: any = null;
    let wallet: any = null;
    let testUser: any = null;

    try {
        // 1. Verifier que le niveau 1 existe
        console.log('1. Verification du niveau 1...');
        const level = await prisma.level.findFirst({
            where: { number: 1 },
            include: {
                levelGoals: {
                    include: { goal: true }
                }
            }
        });

        if (!level) {
            throw new Error('Niveau 1 non trouve. Lancez: bun run scripts/seed-level1.ts');
        }
        console.log(`   OK: Niveau "${level.title}" (duration: ${level.duration}j, speed: ${level.speed}x)`);
        console.log(`   OK: Goals: ${level.levelGoals.map(lg => lg.goal?.title).join(', ')}`);

        // 2. Verifier que le Livret A existe
        console.log('\n2. Verification du Livret A...');
        const livretA = await prisma.asset.findFirst({
            where: { symbol: 'LIVRET_A' }
        });

        if (!livretA) {
            throw new Error('Livret A non trouve. Lancez: bun run scripts/seed-level1.ts');
        }
        console.log(`   OK: "${livretA.title}" (taux: ${livretA.rate}%, plafond: ${livretA.maxAmount})`);

        // 3. Creer utilisateur de test
        console.log('\n3. Creation/recuperation utilisateur de test...');
        testUser = await prisma.user.findFirst({
            where: { email: TEST_USER_EMAIL }
        });

        if (!testUser) {
            testUser = await prisma.user.create({
                data: {
                    id: 'test-healthy-' + Date.now(),
                    email: TEST_USER_EMAIL,
                    name: 'Test Healthy Game',
                    levelId: level.id
                }
            });
            console.log('   OK: Utilisateur cree');
        } else {
            console.log('   OK: Utilisateur existant');
        }

        // 4. Creer une GameInstance
        console.log('\n4. Creation de la partie...');
        const startBalance = Number(level.startBalance) || 2000;

        // Simuler un demarrage dans le passe pour avoir du temps ecoule
        const fakeStartTime = new Date(Date.now() - (SIMULATED_REAL_SECONDS * 1000));

        gameInstance = await prisma.gameInstance.create({
            data: {
                userId: testUser.id,
                levelId: level.id,
                startBalance: startBalance,
                type: 'STANDARD',
                isPaused: false,
                createdAt: fakeStartTime,
            }
        });
        console.log(`   OK: Partie creee (ID: ${gameInstance.id})`);
        console.log(`   OK: Start balance: ${startBalance} EUR`);

        // 5. Creer un Wallet
        console.log('\n5. Creation du wallet...');
        wallet = await prisma.wallet.create({
            data: {
                userId: testUser.id,
                gameInstanceId: gameInstance.id,
                amount: startBalance
            }
        });
        console.log(`   OK: Wallet cree avec ${startBalance} EUR`);

        // 6. Investir dans le Livret A via InvestmentService
        console.log(`\n6. Investissement de ${INVESTMENT_AMOUNT} EUR dans le Livret A...`);

        // Creer le holding avec acquiredAt dans le passe
        const holding = await prisma.holding.create({
            data: {
                walletId: wallet.id,
                assetId: livretA.id,
                gameInstanceId: gameInstance.id,
                quantity: new Prisma.Decimal(INVESTMENT_AMOUNT),
                acquiredAt: fakeStartTime, // Meme date que le debut de partie
            },
            include: { asset: true }
        });

        // Debiter le wallet
        await prisma.wallet.update({
            where: { id: wallet.id },
            data: { amount: new Prisma.Decimal(startBalance - INVESTMENT_AMOUNT) }
        });

        // Creer la transaction
        await prisma.transaction.create({
            data: {
                walletId: wallet.id,
                assetId: livretA.id,
                gameInstanceId: gameInstance.id,
                type: 'BUY',
                quantity: INVESTMENT_AMOUNT,
                unitPrice: new Prisma.Decimal(1),
                totalValue: new Prisma.Decimal(INVESTMENT_AMOUNT),
                transactionDate: fakeStartTime,
                source: 'healthy_game_test'
            }
        });

        console.log(`   OK: Holding cree (ID: ${holding.id})`);
        console.log(`   OK: Wallet debite: ${startBalance - INVESTMENT_AMOUNT} EUR`);

        // 7. Calculer les interets
        console.log('\n7. Calcul des interets...');

        const gameInstanceWithLevel = await prisma.gameInstance.findUnique({
            where: { id: gameInstance.id },
            include: { level: true }
        });

        const elapsedRealSeconds = SIMULATED_REAL_SECONDS;
        const elapsedGameDays = gameTimeService.convertRealSecondsToGameDays(
            gameInstanceWithLevel!.level!,
            elapsedRealSeconds
        );

        console.log(`   Temps reel simule: ${elapsedRealSeconds} secondes`);
        console.log(`   Jours de jeu: ${elapsedGameDays.toFixed(4)} jours`);

        const holdingWithAsset = holding as any;
        const interests = investmentService.calculateInterests(
            holdingWithAsset,
            gameInstanceWithLevel as any
        );

        console.log(`   Interets calcules: ${interests.toFixed(4)} EUR`);
        console.log(`   Valeur totale holding: ${(INVESTMENT_AMOUNT + interests).toFixed(2)} EUR`);

        // 8. Recuperer le portfolio complet
        console.log('\n8. Recuperation du portfolio...');
        const portfolio = await investmentService.getPortfolio(wallet.id, gameInstance.id);

        console.log(`   Total investi: ${portfolio.totalInvested.toFixed(2)} EUR`);
        console.log(`   Total interets: ${portfolio.totalInterests.toFixed(4)} EUR`);
        console.log(`   Valeur portfolio: ${portfolio.totalValue.toFixed(2)} EUR`);
        console.log(`   Solde wallet: ${portfolio.walletBalance.toFixed(2)} EUR`);
        console.log(`   Valeur nette: ${portfolio.netWorth.toFixed(2)} EUR`);

        // 9. Terminer la partie
        console.log('\n9. Fin de la partie...');
        const endResult = await endGameService.endGame(gameInstance.id);

        console.log(`   Succes: ${endResult.success ? 'OUI' : 'NON'}`);
        console.log(`   Start balance: ${endResult.startBalance} EUR`);
        console.log(`   Wallet final: ${endResult.walletBalance.toFixed(2)} EUR`);
        console.log(`   Valeur assets: ${endResult.assetsValue.toFixed(2)} EUR`);
        console.log(`   Total final: ${endResult.totalValue.toFixed(2)} EUR`);
        console.log(`   Profit: ${(endResult.totalValue - endResult.startBalance).toFixed(2)} EUR`);

        console.log('\n   Goals:');
        for (const goal of endResult.goals) {
            console.log(`     - ${goal.title}: ${goal.validated ? 'VALIDE' : 'ECHOUE'}`);
        }

        // 10. Verification finale
        console.log('\n10. Verification finale...');

        const isSuccess =
            endResult.success &&
            endResult.totalValue >= endResult.startBalance &&
            endResult.goals.some(g => g.validated);

        if (isSuccess) {
            console.log('   TEST REUSSI: La chaine complete fonctionne correctement');
        } else {
            console.log('   TEST ECHOUE: Probleme detecte dans la chaine');
        }

        // Resume
        console.log('\n' + '='.repeat(60));
        console.log('  RESUME');
        console.log('='.repeat(60));
        console.log(`  Capital initial:     ${startBalance} EUR`);
        console.log(`  Investissement:      ${INVESTMENT_AMOUNT} EUR (Livret A)`);
        console.log(`  Temps simule:        ${elapsedRealSeconds}s => ${elapsedGameDays.toFixed(2)} jours de jeu`);
        console.log(`  Interets generes:    ${interests.toFixed(4)} EUR`);
        console.log(`  Valeur finale:       ${endResult.totalValue.toFixed(2)} EUR`);
        console.log(`  Profit:              ${(endResult.totalValue - startBalance).toFixed(2)} EUR`);
        console.log(`  Resultat:            ${isSuccess ? 'SUCCES' : 'ECHEC'}`);
        console.log('='.repeat(60));

        return isSuccess;

    } catch (error) {
        console.error('\nERREUR:', error);
        return false;

    } finally {
        // Nettoyage
        console.log('\nNettoyage des donnees de test...');
        if (gameInstance) {
            await prisma.transaction.deleteMany({ where: { gameInstanceId: gameInstance.id } });
            await prisma.holding.deleteMany({ where: { gameInstanceId: gameInstance.id } });
            await prisma.wallet.deleteMany({ where: { gameInstanceId: gameInstance.id } });
            await prisma.gameInstance.delete({ where: { id: gameInstance.id } });
        }
        console.log('OK: Donnees de test supprimees\n');
    }
}

// Execution
healthyGame()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Erreur fatale:', error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
