/**
 * Test script pour valider la chaine complete du jeu
 * Simule: authentification, demarrer niveau 1, acheter/vendre asset, terminer partie, verifier interets
 */
import { PrismaClient, GameInstance, Wallet, User, Level, Asset, LevelGoal, Goal } from '@cashou/db-app';
import { auth } from '@cashou/auth/server';
import { InvestmentService } from '../src/trpc/services/investment.service';
import { EndGameService } from '../src/trpc/services/end-game.service';
import { GameTimeService } from '../src/trpc/services/game-time.service';

const prisma = new PrismaClient();
const investmentService = new InvestmentService(prisma);
const endGameService = new EndGameService(prisma);
const gameTimeService = new GameTimeService();

// Configuration du test
const TEST_USER_EMAIL = 'test-healthy-game@cashou.fr';
const TEST_PASSWORD = 'TestPassword123!';
const INVESTMENT_AMOUNT = 1000; // euros a investir
const SELL_AMOUNT = 500; // euros a vendre
const SIMULATED_REAL_SECONDS = 60; // secondes reelles simulees
const INTEREST_TOLERANCE = 0.01; // tolerance pour la verification des interets

// Symboles des assets accessibles au niveau 1
const LEVEL1_ASSET_SYMBOLS = ['LIVRET_A', 'LIVRET_DDS'];

type LevelWithGoals = Level & {
    levelGoals: (LevelGoal & { goal: Goal | null })[];
};

interface TestContext {
    gameInstance: GameInstance | null;
    wallet: Wallet | null;
    testUser: User | null;
    level: LevelWithGoals | null;
    selectedAsset: Asset | null;
}

async function cleanupTestData(ctx: Partial<TestContext>) {
    console.log('\nNettoyage des donnees de test...');

    try {
        // Supprimer les donnees de jeu
        if (ctx.gameInstance) {
            await prisma.transaction.deleteMany({ where: { gameInstanceId: ctx.gameInstance.id } });
            await prisma.holding.deleteMany({ where: { gameInstanceId: ctx.gameInstance.id } });
            await prisma.wallet.deleteMany({ where: { gameInstanceId: ctx.gameInstance.id } });
            await prisma.gameInstance.delete({ where: { id: ctx.gameInstance.id } }).catch(() => {});
            console.log('   OK: Donnees de jeu supprimees');
        }

        // Supprimer l'utilisateur et ses donnees associees
        if (ctx.testUser) {
            await prisma.session.deleteMany({ where: { userId: ctx.testUser.id } });
            await prisma.account.deleteMany({ where: { userId: ctx.testUser.id } });
            await prisma.user.delete({ where: { id: ctx.testUser.id } }).catch(() => {});
            console.log('   OK: Utilisateur test supprime');
        }
    } catch (error) {
        console.error('   Erreur lors du nettoyage:', error);
    }
}

async function healthyGame(): Promise<boolean> {
    console.log('='.repeat(60));
    console.log('  HEALTHY GAME - Test complet du systeme de jeu');
    console.log('='.repeat(60));
    console.log('');

    const ctx: Partial<TestContext> = {};

    try {
        // ============================================================
        // 1. VERIFICATIONS PREALABLES
        // ============================================================
        console.log('1. Verifications prealables...');

        // Verifier que le niveau 1 existe
        ctx.level = await prisma.level.findFirst({
            where: { number: 1 },
            include: {
                levelGoals: {
                    include: { goal: true }
                }
            }
        });

        if (!ctx.level) {
            throw new Error('Niveau 1 non trouve. Lancez: bun run scripts/seed-level1.ts');
        }
        console.log(`   OK: Niveau "${ctx.level.title}" (duration: ${ctx.level.duration}j, speed: ${ctx.level.speed}x)`);
        console.log(`   OK: Goals: ${ctx.level.levelGoals.map((lg) => lg.goal?.title).join(', ')}`);

        // Recuperer les assets accessibles au niveau 1
        const accessibleAssets = await prisma.asset.findMany({
            where: {
                symbol: { in: LEVEL1_ASSET_SYMBOLS }
            }
        });

        if (accessibleAssets.length === 0) {
            throw new Error('Aucun asset accessible au niveau 1. Lancez: bun run scripts/seed-level1.ts');
        }
        console.log(`   OK: ${accessibleAssets.length} assets accessibles: ${accessibleAssets.map(a => a.symbol).join(', ')}`);

        // Selectionner un asset aleatoire
        ctx.selectedAsset = accessibleAssets[Math.floor(Math.random() * accessibleAssets.length)];
        console.log(`   OK: Asset selectionne aleatoirement: ${ctx.selectedAsset.title} (${ctx.selectedAsset.symbol})`);

        // ============================================================
        // 2. AUTHENTIFICATION
        // ============================================================
        console.log('\n2. Authentification...');

        // Nettoyer l'utilisateur existant s'il existe
        const existingUser = await prisma.user.findFirst({
            where: { email: TEST_USER_EMAIL }
        });
        if (existingUser) {
            console.log('   Nettoyage utilisateur existant...');
            await prisma.transaction.deleteMany({
                where: { wallet: { userId: existingUser.id } }
            });
            await prisma.holding.deleteMany({
                where: { wallet: { userId: existingUser.id } }
            });
            await prisma.wallet.deleteMany({ where: { userId: existingUser.id } });
            await prisma.gameInstance.deleteMany({ where: { userId: existingUser.id } });
            await prisma.session.deleteMany({ where: { userId: existingUser.id } });
            await prisma.account.deleteMany({ where: { userId: existingUser.id } });
            await prisma.user.delete({ where: { id: existingUser.id } });
        }

        // Inscription via Better-Auth
        console.log('   Inscription du nouvel utilisateur...');
        const signUpResult = await auth.api.signUpEmail({
            body: {
                email: TEST_USER_EMAIL,
                password: TEST_PASSWORD,
                name: 'Test Healthy Game'
            }
        });

        if (!signUpResult.user) {
            throw new Error('Echec de l\'inscription: utilisateur non cree');
        }
        console.log(`   OK: Inscription reussie (ID: ${signUpResult.user.id})`);

        // Connexion via Better-Auth
        console.log('   Connexion de l\'utilisateur...');
        const signInResult = await auth.api.signInEmail({
            body: {
                email: TEST_USER_EMAIL,
                password: TEST_PASSWORD
            }
        });

        if (!signInResult.user || !signInResult.token) {
            throw new Error('Echec de la connexion: session non creee');
        }
        console.log(`   OK: Connexion reussie (Token: ${signInResult.token.substring(0, 20)}...)`);

        // Recuperer l'utilisateur complet
        ctx.testUser = await prisma.user.findUnique({
            where: { id: signUpResult.user.id }
        });

        if (!ctx.testUser) {
            throw new Error('Utilisateur non trouve apres inscription');
        }

        // Mettre a jour le levelId de l'utilisateur
        await prisma.user.update({
            where: { id: ctx.testUser.id },
            data: { levelId: ctx.level.id }
        });
        console.log(`   OK: Utilisateur associe au niveau ${ctx.level.number}`);

        // ============================================================
        // 3. CREATION DE LA PARTIE
        // ============================================================
        console.log('\n3. Creation de la partie...');
        const startBalance = Number(ctx.level.startBalance) || 2000;

        // Simuler un demarrage dans le passe pour avoir du temps ecoule
        const fakeStartTime = new Date(Date.now() - (SIMULATED_REAL_SECONDS * 1000));

        ctx.gameInstance = await prisma.gameInstance.create({
            data: {
                userId: ctx.testUser.id,
                levelId: ctx.level.id,
                startBalance: startBalance,
                type: 'STANDARD',
                isPaused: false,
                createdAt: fakeStartTime,
            }
        });
        console.log(`   OK: Partie creee (ID: ${ctx.gameInstance.id})`);
        console.log(`   OK: Start balance: ${startBalance} EUR`);

        // Creer le Wallet
        ctx.wallet = await prisma.wallet.create({
            data: {
                userId: ctx.testUser.id,
                gameInstanceId: ctx.gameInstance.id,
                amount: startBalance
            }
        });
        console.log(`   OK: Wallet cree (ID: ${ctx.wallet.id}) avec ${startBalance} EUR`);

        // ============================================================
        // 4. ACHAT D'UN ASSET VIA InvestmentService
        // ============================================================
        console.log(`\n4. Achat de ${INVESTMENT_AMOUNT} EUR via InvestmentService...`);

        const buyResult = await investmentService.buy({
            walletId: ctx.wallet.id,
            assetId: ctx.selectedAsset.id,
            amount: INVESTMENT_AMOUNT,
            gameInstanceId: ctx.gameInstance.id
        });

        console.log(`   OK: Holding cree (ID: ${buyResult.id})`);

        // Verifier que le wallet a ete debite
        const walletAfterBuy = await prisma.wallet.findUnique({ where: { id: ctx.wallet.id } });
        const balanceAfterBuy = Number(walletAfterBuy?.amount || 0);
        const expectedBalanceAfterBuy = startBalance - INVESTMENT_AMOUNT;

        if (Math.abs(balanceAfterBuy - expectedBalanceAfterBuy) > 0.01) {
            throw new Error(`Wallet mal debite: attendu ${expectedBalanceAfterBuy}, obtenu ${balanceAfterBuy}`);
        }
        console.log(`   OK: Wallet debite correctement: ${balanceAfterBuy} EUR`);

        // Verifier que la transaction a ete creee
        const buyTransactions = await prisma.transaction.findMany({
            where: {
                gameInstanceId: ctx.gameInstance.id,
                type: 'BUY'
            }
        });
        if (buyTransactions.length === 0) {
            throw new Error('Transaction d\'achat non creee');
        }
        console.log(`   OK: Transaction d'achat enregistree`);

        // ============================================================
        // 5. VENTE PARTIELLE VIA InvestmentService
        // ============================================================
        console.log(`\n5. Vente de ${SELL_AMOUNT} EUR via InvestmentService...`);

        // Pour la vente, on doit attendre un peu pour simuler le temps passe
        // Mettre a jour le holding pour simuler une acquisition dans le passe
        await prisma.holding.update({
            where: { id: buyResult.id },
            data: { acquiredAt: fakeStartTime }
        });

        const sellResult = await investmentService.sell({
            walletId: ctx.wallet.id,
            assetId: ctx.selectedAsset.id,
            amount: SELL_AMOUNT,
            gameInstanceId: ctx.gameInstance.id
        });

        console.log(`   OK: Vente effectuee`);
        console.log(`   OK: Montant recu: ${sellResult.amountReceived.toFixed(4)} EUR`);
        console.log(`   OK: Interets proportionnels: ${sellResult.interests.toFixed(4)} EUR`);

        // Verifier que les interets sont positifs (le temps a passe)
        if (sellResult.interests < 0) {
            throw new Error(`Interets negatifs lors de la vente: ${sellResult.interests}`);
        }

        // Verifier que le wallet a ete credite
        const walletAfterSell = await prisma.wallet.findUnique({ where: { id: ctx.wallet.id } });
        const balanceAfterSell = Number(walletAfterSell?.amount || 0);
        const expectedBalanceAfterSell = balanceAfterBuy + sellResult.amountReceived;

        if (Math.abs(balanceAfterSell - expectedBalanceAfterSell) > 0.01) {
            throw new Error(`Wallet mal credite: attendu ${expectedBalanceAfterSell.toFixed(2)}, obtenu ${balanceAfterSell.toFixed(2)}`);
        }
        console.log(`   OK: Wallet credite correctement: ${balanceAfterSell.toFixed(2)} EUR`);

        // Verifier que la transaction de vente a ete creee
        const sellTransactions = await prisma.transaction.findMany({
            where: {
                gameInstanceId: ctx.gameInstance.id,
                type: 'SELL'
            }
        });
        if (sellTransactions.length === 0) {
            throw new Error('Transaction de vente non creee');
        }
        console.log(`   OK: Transaction de vente enregistree`);

        // ============================================================
        // 6. VERIFICATION MATHEMATIQUE DES INTERETS
        // ============================================================
        console.log('\n6. Verification mathematique des interets...');

        const gameInstanceWithLevel = await prisma.gameInstance.findUnique({
            where: { id: ctx.gameInstance.id },
            include: { level: true }
        });

        // Recuperer le holding restant
        const remainingHolding = await prisma.holding.findFirst({
            where: {
                walletId: ctx.wallet.id,
                assetId: ctx.selectedAsset.id
            },
            include: { asset: true }
        });

        if (remainingHolding) {
            const elapsedRealSeconds = SIMULATED_REAL_SECONDS;
            const elapsedGameDays = gameTimeService.convertRealSecondsToGameDays(
                gameInstanceWithLevel!.level!,
                elapsedRealSeconds
            );

            // Calcul attendu (formule)
            const assetRate = ctx.selectedAsset.rate || 0;
            const expectedDailyRate = assetRate / 100 / 365;
            const holdingQuantity = Number(remainingHolding.quantity);
            const expectedInterests = holdingQuantity * expectedDailyRate * elapsedGameDays;

            // Calcul via service
            const calculatedInterests = await investmentService.calculateInterests(
                remainingHolding,
                gameInstanceWithLevel!
            );

            console.log(`   Temps reel simule: ${elapsedRealSeconds} secondes`);
            console.log(`   Jours de jeu: ${elapsedGameDays.toFixed(4)} jours`);
            console.log(`   Taux annuel: ${assetRate}%`);
            console.log(`   Taux journalier: ${(expectedDailyRate * 100).toFixed(6)}%`);
            console.log(`   Montant restant: ${holdingQuantity} EUR`);
            console.log(`   Interets attendus (formule): ${expectedInterests.toFixed(6)} EUR`);
            console.log(`   Interets calcules (service): ${calculatedInterests.toFixed(6)} EUR`);

            // Verification avec tolerance
            const interestDiff = Math.abs(calculatedInterests - expectedInterests);
            if (interestDiff > INTEREST_TOLERANCE) {
                throw new Error(
                    `Calcul des interets incorrect: ` +
                    `attendu ${expectedInterests.toFixed(6)}, ` +
                    `obtenu ${calculatedInterests.toFixed(6)}, ` +
                    `diff ${interestDiff.toFixed(6)}`
                );
            }
            console.log(`   OK: Calcul des interets valide (diff: ${interestDiff.toFixed(6)} < ${INTEREST_TOLERANCE})`);
        } else {
            console.log('   SKIP: Pas de holding restant (tout vendu)');
        }

        // ============================================================
        // 7. RECUPERATION DU PORTFOLIO
        // ============================================================
        console.log('\n7. Recuperation du portfolio...');
        const portfolio = await investmentService.getPortfolio(ctx.wallet.id, ctx.gameInstance.id);

        console.log(`   Total investi: ${portfolio.totalInvested.toFixed(2)} EUR`);
        console.log(`   Total interets: ${portfolio.totalInterests.toFixed(4)} EUR`);
        console.log(`   Valeur portfolio: ${portfolio.totalValue.toFixed(2)} EUR`);
        console.log(`   Solde wallet: ${portfolio.walletBalance.toFixed(2)} EUR`);
        console.log(`   Valeur nette: ${portfolio.netWorth.toFixed(2)} EUR`);

        // ============================================================
        // 8. FIN DE LA PARTIE
        // ============================================================
        console.log('\n8. Fin de la partie...');
        const endResult = await endGameService.endGame(ctx.gameInstance.id);

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

        // ============================================================
        // 9. VERIFICATION DE L'ETAT DE FIN DE PARTIE
        // ============================================================
        console.log('\n9. Verification de l\'etat de fin de partie...');

        const endedGameInstance = await prisma.gameInstance.findUnique({
            where: { id: ctx.gameInstance.id }
        });

        if (!endedGameInstance?.isEnded) {
            throw new Error('GameInstance.isEnded devrait etre true');
        }
        console.log(`   OK: isEnded = true`);

        if (!endedGameInstance?.endedAt) {
            throw new Error('GameInstance.endedAt devrait etre defini');
        }
        console.log(`   OK: endedAt = ${endedGameInstance.endedAt.toISOString()}`);

        // Verifier les transactions
        const allTransactions = await prisma.transaction.findMany({
            where: { gameInstanceId: ctx.gameInstance.id },
            orderBy: { transactionDate: 'asc' }
        });
        console.log(`   OK: ${allTransactions.length} transactions enregistrees`);
        for (const tx of allTransactions) {
            console.log(`     - ${tx.type}: ${Number(tx.totalValue).toFixed(2)} EUR`);
        }

        // ============================================================
        // 10. VERIFICATION FINALE
        // ============================================================
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
        console.log(`  Asset selectionne:   ${ctx.selectedAsset.title} (${ctx.selectedAsset.symbol})`);
        console.log(`  Achat:               ${INVESTMENT_AMOUNT} EUR`);
        console.log(`  Vente:               ${SELL_AMOUNT} EUR (+ ${sellResult.interests.toFixed(4)} EUR interets)`);
        console.log(`  Temps simule:        ${SIMULATED_REAL_SECONDS}s => ${gameTimeService.convertRealSecondsToGameDays(ctx.level, SIMULATED_REAL_SECONDS).toFixed(2)} jours de jeu`);
        console.log(`  Valeur finale:       ${endResult.totalValue.toFixed(2)} EUR`);
        console.log(`  Profit:              ${(endResult.totalValue - startBalance).toFixed(2)} EUR`);
        console.log(`  Resultat:            ${isSuccess ? 'SUCCES' : 'ECHEC'}`);
        console.log('='.repeat(60));

        return isSuccess;

    } catch (error) {
        console.error('\nERREUR:', error);
        return false;

    } finally {
        await cleanupTestData(ctx);
        console.log('OK: Nettoyage termine\n');
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
