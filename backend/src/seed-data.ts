// Fichier de seed pour peupler la base de données avec des données de test
// Utilise Prisma Client pour insérer des données cohérentes dans toutes les tables
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 🎛️ CONFIGURATION : Modifiez cette valeur pour contrôler la quantité de données
const DATA_COUNT = process.env.SEED_COUNT ? parseInt(process.env.SEED_COUNT) : 20;

// Templates de données pour génération automatique
const levelTemplates = [
    { title: "Niveau Débutant", description: "Introduction aux concepts de base de l'investissement" },
    { title: "Niveau Intermédiaire", description: "Stratégies d'investissement et gestion des risques" },
    { title: "Niveau Avancé", description: "Trading avancé et analyse technique" },
    { title: "Niveau Expert", description: "Stratégies complexes et instruments financiers avancés" },
    { title: "Niveau Maître", description: "Gestion de portefeuille institutionnel" },
    { title: "Niveau Légende", description: "Innovation financière et nouveaux marchés" }
];

const userTemplates = [
    { username: "alice_crypto", email: "alice@example.com", badges: "first_investment,quiz_master" },
    { username: "bob_trader", email: "bob@example.com", badges: "level_crusher,daily_streak" },
    { username: "charlie_invest", email: "charlie@example.com", badges: "beginner" },
    { username: "diana_finance", email: "diana@example.com", badges: "expert,quiz_legend,investment_pro" },
    { username: "eve_analyst", email: "eve@example.com", badges: "data_master,strategy_expert" },
    { username: "frank_advisor", email: "frank@example.com", badges: "mentor,teaching_pro" },
    { username: "grace_quant", email: "grace@example.com", badges: "math_genius,algorithm_master" },
    { username: "henry_risk", email: "henry@example.com", badges: "risk_manager,portfolio_expert" },
    { username: "iris_tech", email: "iris@example.com", badges: "fintech_pioneer,blockchain_expert" },
    { username: "jack_global", email: "jack@example.com", badges: "international_trader,forex_pro" }
];

const questionTemplates = [
    "Qu'est-ce que le Bitcoin ?",
    "Quelle est la différence entre une action et une obligation ?",
    "Qu'est-ce que la diversification en investissement ?",
    "Comment calculer le rendement d'un investissement ?",
    "Qu'est-ce qu'un ETF (Exchange Traded Fund) ?",
    "Quels sont les principaux risques en investissement ?",
    "Qu'est-ce que l'analyse technique en trading ?",
    "Comment fonctionne l'effet de levier en trading ?",
    "Qu'est-ce que la capitalisation boursière ?",
    "Comment fonctionne la blockchain ?",
    "Qu'est-ce qu'un dividend yield ?",
    "Comment évaluer la performance d'un portefeuille ?",
    "Qu'est-ce que la volatilité en finance ?",
    "Comment fonctionne un marché à terme ?",
    "Qu'est-ce que l'inflation et son impact sur les investissements ?",
    "Comment analyser les états financiers d'une entreprise ?",
    "Qu'est-ce que le ratio cours/bénéfice (P/E) ?",
    "Comment fonctionne la diversification géographique ?",
    "Qu'est-ce qu'un fonds indiciel ?",
    "Comment gérer le risque de change en investissement ?"
];

const answerTemplates = [
    // Templates pour Bitcoin
    [
        { text: "Une cryptomonnaie décentralisée basée sur la blockchain", correct: true },
        { text: "Une monnaie physique en or", correct: false },
        { text: "Une action d'entreprise technologique", correct: false },
        { text: "Un système bancaire traditionnel", correct: false }
    ],
    // Templates pour Action vs Obligation
    [
        { text: "Une action représente une part de propriété, une obligation est un prêt", correct: true },
        { text: "Il n'y a aucune différence", correct: false },
        { text: "Une obligation rapporte plus qu'une action", correct: false },
        { text: "Les actions sont moins risquées que les obligations", correct: false }
    ],
    // Templates génériques (utilisés pour les autres questions)
    [
        { text: "Réponse correcte A", correct: true },
        { text: "Réponse incorrecte B", correct: false },
        { text: "Réponse incorrecte C", correct: false },
        { text: "Réponse incorrecte D", correct: false }
    ]
];

// Templates pour les marchés financiers
const marketTemplates = [
    { name: "Actions", description: "Marché des actions et titres de propriété", dataSource: "NYSE, NASDAQ" },
    { name: "Obligations", description: "Marché des obligations et titres de créance", dataSource: "Bloomberg, Reuters" },
    { name: "Cryptomonnaies", description: "Marché des cryptomonnaies et actifs numériques", dataSource: "CoinGecko, CoinMarketCap" },
    { name: "Matières premières", description: "Marché des matières premières et commodités", dataSource: "CME, ICE" },
    { name: "Forex", description: "Marché des changes et devises", dataSource: "FXCM, OANDA" },
    { name: "Indices", description: "Marché des indices boursiers", dataSource: "S&P, Dow Jones" }
];

// Templates pour les sous-marchés
const submarketTemplates = [
    { name: "Tech", description: "Secteur technologique", currentTrends: "IA, Cloud computing" },
    { name: "Finance", description: "Secteur financier", currentTrends: "Fintech, Blockchain" },
    { name: "Énergie", description: "Secteur énergétique", currentTrends: "Renouvelable, Transition" },
    { name: "Santé", description: "Secteur de la santé", currentTrends: "Biotech, Médical" },
    { name: "Consommation", description: "Secteur de la consommation", currentTrends: "E-commerce, Durable" },
    { name: "Industrie", description: "Secteur industriel", currentTrends: "Automatisation, Innovation" }
];

// Templates pour les domaines/champs
const fieldTemplates = [
    "Analyse technique",
    "Analyse fondamentale",
    "Gestion des risques",
    "Diversification",
    "Stratégie d'investissement",
    "Trading algorithmique",
    "Macroéconomie",
    "Microéconomie"
];

// Templates pour les actifs
const assetTemplates = [
    { title: "Apple Inc.", symbol: "AAPL", field: "Tech", description: "Entreprise technologique américaine" },
    { title: "Microsoft Corporation", symbol: "MSFT", field: "Tech", description: "Entreprise de logiciels et cloud" },
    { title: "Bitcoin", symbol: "BTC", field: "Crypto", description: "Première cryptomonnaie décentralisée" },
    { title: "Ethereum", symbol: "ETH", field: "Crypto", description: "Plateforme blockchain et cryptomonnaie" },
    { title: "Gold", symbol: "XAU", field: "Commodity", description: "Or physique" },
    { title: "Oil", symbol: "CL", field: "Commodity", description: "Pétrole brut" },
    { title: "EUR/USD", symbol: "EURUSD", field: "Forex", description: "Paire de devises Euro/Dollar" },
    { title: "S&P 500", symbol: "SPX", field: "Index", description: "Indice boursier américain" }
];

// Templates pour les événements
const eventTemplates = [
    { title: "Publication des résultats trimestriels", description: "Résultats financiers Q1", hasImpact: true },
    { title: "Annonce de partenariat stratégique", description: "Nouveau partenariat commercial", hasImpact: true },
    { title: "Changement de direction", description: "Nouveau CEO nommé", hasImpact: true },
    { title: "Lancement de produit", description: "Nouveau produit lancé", hasImpact: true },
    { title: "Régulation gouvernementale", description: "Nouvelle réglementation", hasImpact: true },
    { title: "Crise économique", description: "Récession économique", hasImpact: true },
    { title: "Innovation technologique", description: "Brise-through technologique", hasImpact: true },
    { title: "Fusion acquisition", description: "Fusion entre entreprises", hasImpact: true }
];

// Templates pour les objectifs
const goalTemplates = [
    { title: "Atteindre 10% de rendement", description: "Objectif de rendement annuel" },
    { title: "Diversifier le portefeuille", description: "Répartir les investissements" },
    { title: "Réduire les risques", description: "Minimiser la volatilité" },
    { title: "Maximiser les gains", description: "Optimiser les profits" },
    { title: "Apprendre les bases", description: "Comprendre les fondamentaux" },
    { title: "Maîtriser l'analyse technique", description: "Apprendre les graphiques" }
];

function generateRandomData(templates: any[], count: number, startIndex: number = 0) {
    const result = [];
    for (let i = 0; i < count; i++) {
        const templateIndex = (startIndex + i) % templates.length;
        result.push(templates[templateIndex]);
    }
    return result;
}

async function main() {
    console.log(`🌱 Début du seeding de la base de données avec ${DATA_COUNT} entrées...`);

    // 1. Créer des niveaux
    console.log(`📚 Création de ${Math.min(DATA_COUNT, levelTemplates.length)} niveaux...`);
    const levelCount = Math.min(DATA_COUNT, levelTemplates.length);
    const selectedLevelTemplates = generateRandomData(levelTemplates, levelCount);

    const levels = await Promise.all(
        selectedLevelTemplates.map((template, index) =>
            prisma.level.create({
                data: {
                    title: `${template.title} ${index + 1}`,
                    number: index + 1,
                    duration: 300 + (index * 150), // Durée progressive : 5min, 7.5min, 10min...
                    speed: 10 + (index * 2), // Vitesse progressive : 10, 12, 14...
                    startBalance: 10000 + (index * 5000), // Balance progressive : 10k, 15k, 20k...
                    pointsRequired: index * 50, // Points requis : 0, 50, 100, 150...
                    description: template.description
                }
            })
        )
    );

    // 2. Créer des utilisateurs
    console.log(`👥 Création de ${DATA_COUNT} utilisateurs...`);
    const selectedUserTemplates = generateRandomData(userTemplates, DATA_COUNT);

    const users = await Promise.all(
        selectedUserTemplates.map((template, index) =>
            prisma.user.create({
                data: {
                    username: `${template.username}_${index + 1}`,
                    discriminator: String(index + 1).padStart(4, '0'),
                    email: template.email.replace('@', `${index + 1}@`),
                    levelId: levels[Math.floor(Math.random() * levels.length)]?.id || levels[0]?.id || 1,
                    points: Math.floor(Math.random() * 1000), // Points aléatoires 0-999
                    badges: template.badges,
                    lastActivity: new Date(Date.now() - (Math.floor(Math.random() * 7) * 86400000)) // Activité dans les 7 derniers jours
                }
            })
        )
    );

    // 3. Créer des questions
    console.log(`❓ Création de ${DATA_COUNT} questions...`);
    const selectedQuestionTemplates = generateRandomData(questionTemplates, DATA_COUNT);

    const questions = await Promise.all(
        selectedQuestionTemplates.map((questionText, index) =>
            prisma.question.create({
                data: {
                    text: `${questionText} (Q${index + 1})`
                }
            })
        )
    );

    // 4. Créer des réponses pour chaque question
    console.log(`💡 Création de ${DATA_COUNT * 4} réponses (4 par question)...`);
    const answers: any[] = [];

    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        if (!question) continue;

        const templateIndex = Math.min(i, answerTemplates.length - 1);
        const answerTemplate = answerTemplates[templateIndex] || answerTemplates[answerTemplates.length - 1];

        if (answerTemplate) {
            const questionAnswers = await Promise.all(
                answerTemplate.map((answerData, answerIndex) =>
                    prisma.answer.create({
                        data: {
                            questionId: question.id,
                            text: `${answerData.text} (Q${i + 1}A${answerIndex + 1})`,
                            isCorrect: answerData.correct
                        }
                    })
                )
            );
            answers.push(...questionAnswers);
        }
    }

    // 5. Créer des quiz
    console.log(`🧠 Création de ${DATA_COUNT} quiz...`);
    const quiz = await Promise.all(
        Array.from({ length: DATA_COUNT }, (_, index) => {
            const isDaily = index % 3 === 0; // 1 quiz sur 3 est un Daily Quiz
            const randomLevel = levels[Math.floor(Math.random() * levels.length)];

            return prisma.quiz.create({
                data: {
                    type: isDaily ? "DAILY" : "MCQ",
                    title: isDaily
                        ? `Daily Quiz ${index + 1}`
                        : `Quiz ${randomLevel?.title?.split(' ')[1] || 'Niveau'} ${index + 1}`,
                    date: new Date(Date.now() - (Math.floor(Math.random() * 30) * 86400000)), // Quiz sur les 30 derniers jours
                    levelId: isDaily ? null : randomLevel?.id || null,
                    context: isDaily
                        ? `Quiz quotidien numéro ${index + 1}`
                        : `Quiz de niveau pour ${randomLevel?.title?.toLowerCase() || 'niveau inconnu'}`
                }
            });
        })
    );

    // 6. Créer des associations quiz-questions
    console.log(`🔗 Création des associations quiz-questions...`);
    const quizQuestions = [];

    for (let i = 0; i < quiz.length; i++) {
        const currentQuiz = quiz[i];
        if (!currentQuiz) continue;

        // NOUVEAU : Différencier selon le type de quiz
        let questionsPerQuiz: number;

        if (currentQuiz.type === 'DAILY') {
            // Daily Quiz : 3 questions exactement (comme avant)
            questionsPerQuiz = Math.min(3, questions.length);
        } else if (currentQuiz.type === 'MCQ') {
            // Quiz MCQ : 5-8 questions pour permettre la sélection aléatoire
            const minQuestions = 5;
            const maxQuestions = Math.min(8, questions.length);
            questionsPerQuiz = Math.floor(Math.random() * (maxQuestions - minQuestions + 1)) + minQuestions;
        } else {
            // Fallback
            questionsPerQuiz = Math.min(3, questions.length);
        }

        // Sélectionner des questions aléatoirement pour ce quiz
        const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);
        const selectedQuestions = shuffledQuestions.slice(0, questionsPerQuiz);

        for (let j = 0; j < selectedQuestions.length; j++) {
            const selectedQuestion = selectedQuestions[j];
            if (!selectedQuestion) continue;

            const quizQuestion = await prisma.quizQuestion.create({
                data: {
                    quizId: currentQuiz.id,
                    questionId: selectedQuestion.id,
                    position: j + 1
                }
            });
            quizQuestions.push(quizQuestion);
        }
    }

    // 7. Créer des participations aux quiz
    console.log(`🎯 Création de ${DATA_COUNT} participations aux quiz...`);
    const userQuizzes = await Promise.all(
        Array.from({ length: DATA_COUNT }, (_, index) => {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomQuiz = quiz[Math.floor(Math.random() * quiz.length)];

            if (!randomUser || !randomQuiz) {
                // Fallback si pas d'utilisateur ou quiz valide
                return prisma.userQuiz.create({
                    data: {
                        quizId: quiz[0]?.id || 1,
                        userId: users[0]?.id || 1,
                        completedAt: null,
                        isCorrect: null
                    }
                });
            }

            const isCompleted = Math.random() > 0.3; // 70% de chance d'être terminé
            const isCorrect = isCompleted ? Math.random() > 0.4 : null; // 60% de réussite si terminé

            return prisma.userQuiz.create({
                data: {
                    quizId: randomQuiz.id,
                    userId: randomUser.id,
                    completedAt: isCompleted ? new Date(Date.now() - (Math.floor(Math.random() * 14) * 86400000)) : null, // Dans les 14 derniers jours
                    isCorrect: isCorrect
                }
            });
        })
    );

    // 8. Créer des réponses d'utilisateurs
    console.log(`📝 Création de ${DATA_COUNT} réponses d'utilisateurs...`);
    const userAnswers = await Promise.all(
        Array.from({ length: DATA_COUNT }, (_, index) => {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

            if (!randomUser || !randomQuestion) {
                // Fallback si pas d'utilisateur ou question valide
                return prisma.userAnswer.create({
                    data: {
                        userId: users[0]?.id || 1,
                        questionId: questions[0]?.id || 1,
                        answerId: answers[0]?.id || 1,
                        accurate: false
                    }
                });
            }

            // Trouver les réponses pour cette question
            const questionAnswers = answers.filter(answer => answer.questionId === randomQuestion.id);
            const randomAnswer = questionAnswers[Math.floor(Math.random() * questionAnswers.length)];

            if (!randomAnswer) {
                // Fallback si pas de réponse trouvée
                return prisma.userAnswer.create({
                    data: {
                        userId: randomUser.id,
                        questionId: randomQuestion.id,
                        answerId: answers[0]?.id || 1,
                        accurate: false
                    }
                });
            }

            return prisma.userAnswer.create({
                data: {
                    userId: randomUser.id,
                    questionId: randomQuestion.id,
                    answerId: randomAnswer.id,
                    accurate: randomAnswer.isCorrect
                }
            });
        })
    );

    // 9. Créer des marchés financiers
    console.log(`🏛️ Création de ${Math.min(DATA_COUNT, marketTemplates.length)} marchés...`);
    const selectedMarketTemplates = generateRandomData(marketTemplates, Math.min(DATA_COUNT, marketTemplates.length));

    const markets = await Promise.all(
        selectedMarketTemplates.map((template, index) =>
            prisma.market.create({
                data: {
                    name: template.name,
                    description: template.description,
                    currentTrends: `Tendances actuelles du marché ${template.name}`,
                    dataSource: template.dataSource
                }
            })
        )
    );

    // 10. Créer des sous-marchés
    console.log(`📊 Création de ${Math.min(DATA_COUNT, submarketTemplates.length)} sous-marchés...`);
    const selectedSubmarketTemplates = generateRandomData(submarketTemplates, Math.min(DATA_COUNT, submarketTemplates.length));

    const submarkets = await Promise.all(
        selectedSubmarketTemplates.map((template, index) =>
            prisma.submarket.create({
                data: {
                    name: template.name,
                    description: template.description,
                    currentTrends: template.currentTrends,
                    dataSource: `Source ${template.name}`,
                    marketId: markets[Math.floor(Math.random() * markets.length)]?.id || markets[0]?.id || null
                }
            })
        )
    );

    // 11. Créer des domaines/champs
    console.log(`🎯 Création de ${Math.min(DATA_COUNT, fieldTemplates.length)} domaines...`);
    const selectedFieldTemplates = generateRandomData(fieldTemplates, Math.min(DATA_COUNT, fieldTemplates.length));

    const fields = await Promise.all(
        selectedFieldTemplates.map((fieldTitle, index) =>
            prisma.field.create({
                data: {
                    title: fieldTitle,
                    marketId: markets[Math.floor(Math.random() * markets.length)]?.id || markets[0]?.id || null
                }
            })
        )
    );

    // 12. Créer des actifs financiers
    console.log(`💼 Création de ${Math.min(DATA_COUNT, assetTemplates.length)} actifs...`);
    const selectedAssetTemplates = generateRandomData(assetTemplates, Math.min(DATA_COUNT, assetTemplates.length));

    const assets = await Promise.all(
        selectedAssetTemplates.map((template, index) =>
            prisma.asset.create({
                data: {
                    title: template.title,
                    symbol: template.symbol,
                    field: template.field,
                    description: template.description,
                    marketId: markets[Math.floor(Math.random() * markets.length)]?.id || markets[0]?.id || null,
                    submarketId: submarkets[Math.floor(Math.random() * submarkets.length)]?.id || submarkets[0]?.id || null
                }
            })
        )
    );

    // 13. Créer l'historique des prix des actifs
    console.log(`📈 Création de ${DATA_COUNT * 5} historiques de prix...`);
    const assetHistories = [];
    for (let i = 0; i < DATA_COUNT * 5; i++) {
        const randomAsset = assets[Math.floor(Math.random() * assets.length)];
        if (!randomAsset) continue;

        const baseValue = 100 + Math.floor(Math.random() * 900); // Valeur entre 100 et 1000
        const timestamp = new Date(Date.now() - (Math.floor(Math.random() * 90) * 86400000)); // Derniers 90 jours

        const history = await prisma.assetHistory.create({
            data: {
                assetId: randomAsset.id,
                timestamp: timestamp,
                value: baseValue,
                volume: Math.floor(Math.random() * 1000000) // Volume aléatoire
            }
        });
        assetHistories.push(history);
    }

    // 14. Créer des événements
    console.log(`📰 Création de ${Math.min(DATA_COUNT, eventTemplates.length)} événements...`);
    const selectedEventTemplates = generateRandomData(eventTemplates, Math.min(DATA_COUNT, eventTemplates.length));

    const events = await Promise.all(
        selectedEventTemplates.map((template, index) =>
            prisma.event.create({
                data: {
                    title: `${template.title} ${index + 1}`,
                    description: template.description,
                    hasImpact: template.hasImpact
                }
            })
        )
    );

    // 15. Créer des associations événements-actifs
    console.log(`🔗 Création de ${DATA_COUNT} associations événements-actifs...`);
    const eventAssets = await Promise.all(
        Array.from({ length: DATA_COUNT }, (_, index) => {
            const randomEvent = events[Math.floor(Math.random() * events.length)];
            const randomAsset = assets[Math.floor(Math.random() * assets.length)];

            if (!randomEvent || !randomAsset) {
                return prisma.eventAsset.create({
                    data: {
                        eventId: events[0]?.id || 1,
                        assetId: assets[0]?.id || 1,
                        date: new Date(),
                        value: 100,
                        volume: 1000
                    }
                });
            }

            return prisma.eventAsset.create({
                data: {
                    eventId: randomEvent.id,
                    assetId: randomAsset.id,
                    date: new Date(Date.now() - (Math.floor(Math.random() * 30) * 86400000)),
                    value: 100 + Math.floor(Math.random() * 900),
                    volume: Math.floor(Math.random() * 100000)
                }
            });
        })
    );

    // 16. Créer des objectifs
    console.log(`🎯 Création de ${Math.min(DATA_COUNT, goalTemplates.length)} objectifs...`);
    const selectedGoalTemplates = generateRandomData(goalTemplates, Math.min(DATA_COUNT, goalTemplates.length));

    const goals = await Promise.all(
        selectedGoalTemplates.map((template, index) =>
            prisma.goal.create({
                data: {
                    title: template.title,
                    description: template.description
                }
            })
        )
    );

    // 17. Créer des associations niveau-objectif
    console.log(`🔗 Création de ${DATA_COUNT} associations niveau-objectif...`);
    const levelGoals = await Promise.all(
        Array.from({ length: DATA_COUNT }, (_, index) => {
            const randomLevel = levels[Math.floor(Math.random() * levels.length)];
            const randomGoal = goals[Math.floor(Math.random() * goals.length)];

            if (!randomLevel || !randomGoal) {
                return prisma.levelGoal.create({
                    data: {
                        levelId: levels[0]?.id || 1,
                        goalId: goals[0]?.id || 1
                    }
                });
            }

            return prisma.levelGoal.create({
                data: {
                    levelId: randomLevel.id,
                    goalId: randomGoal.id
                }
            });
        })
    );

    // 18. Créer des associations niveau-événement
    console.log(`🔗 Création de ${DATA_COUNT} associations niveau-événement...`);
    const levelEvents = await Promise.all(
        Array.from({ length: DATA_COUNT }, (_, index) => {
            const randomLevel = levels[Math.floor(Math.random() * levels.length)];
            const randomEvent = events[Math.floor(Math.random() * events.length)];

            if (!randomLevel || !randomEvent) {
                return prisma.levelEvent.create({
                    data: {
                        levelId: levels[0]?.id || 1,
                        eventId: events[0]?.id || 1
                    }
                });
            }

            return prisma.levelEvent.create({
                data: {
                    levelId: randomLevel.id,
                    eventId: randomEvent.id
                }
            });
        })
    );

    // 19. Créer des impacts
    console.log(`⚡ Création de ${DATA_COUNT} impacts...`);
    const impacts = await Promise.all(
        Array.from({ length: DATA_COUNT }, (_, index) => {
            const randomEvent = events[Math.floor(Math.random() * events.length)];
            const randomField = fields[Math.floor(Math.random() * fields.length)];
            const randomSubmarket = submarkets[Math.floor(Math.random() * submarkets.length)];

            return prisma.impact.create({
                data: {
                    eventId: randomEvent?.id || null,
                    fieldId: randomField?.id || null,
                    submarketId: randomSubmarket?.id || null,
                    coef: Math.floor(Math.random() * 200) - 100 // Coefficient entre -100 et 100
                }
            });
        })
    );

    // 20. Créer des instances de jeu
    console.log(`🎮 Création de ${DATA_COUNT} instances de jeu...`);
    const gameInstances = await Promise.all(
        Array.from({ length: DATA_COUNT }, (_, index) => {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomLevel = levels[Math.floor(Math.random() * levels.length)];

            if (!randomUser || !randomLevel) {
                return prisma.gameInstance.create({
                    data: {
                        type: index % 2 === 0 ? "solo" : "multiplayer",
                        userId: users[0]?.id || null,
                        levelId: levels[0]?.id || null,
                        startBalance: 10000,
                        isPaused: Math.random() > 0.7,
                        actionRequired: Math.random() > 0.8
                    }
                });
            }

            return prisma.gameInstance.create({
                data: {
                    type: index % 2 === 0 ? "solo" : "multiplayer",
                    userId: randomUser.id,
                    levelId: randomLevel.id,
                    startBalance: randomLevel.startBalance || 10000,
                    isPaused: Math.random() > 0.7,
                    actionRequired: Math.random() > 0.8,
                    pausedAt: Math.random() > 0.7 ? new Date(Date.now() - (Math.floor(Math.random() * 7) * 86400000)) : null
                }
            });
        })
    );

    // 21. Créer des utilisateurs de jeu (pour les parties multijoueurs)
    console.log(`👥 Création de ${DATA_COUNT} utilisateurs de jeu...`);
    const gameUsers = await Promise.all(
        Array.from({ length: DATA_COUNT }, (_, index) => {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomGameInstance = gameInstances[Math.floor(Math.random() * gameInstances.length)];

            if (!randomUser || !randomGameInstance) {
                return prisma.gameUser.create({
                    data: {
                        userId: users[0]?.id || null,
                        gameInstanceId: gameInstances[0]?.id || null,
                        isCreator: index === 0,
                        joinAt: new Date(),
                        status: "active"
                    }
                });
            }

            return prisma.gameUser.create({
                data: {
                    userId: randomUser.id,
                    gameInstanceId: randomGameInstance.id,
                    isCreator: index === 0,
                    joinAt: new Date(Date.now() - (Math.floor(Math.random() * 7) * 86400000)),
                    status: ["active", "paused", "completed"][Math.floor(Math.random() * 3)]
                }
            });
        })
    );

    // 22. Créer des portefeuilles
    console.log(`💰 Création de ${DATA_COUNT} portefeuilles...`);
    const wallets = await Promise.all(
        Array.from({ length: DATA_COUNT }, (_, index) => {
            const randomGameInstance = gameInstances[Math.floor(Math.random() * gameInstances.length)];

            if (!randomGameInstance) {
                return prisma.wallet.create({
                    data: {
                        userId: users[0]?.id || null,
                        gameInstanceId: gameInstances[0]?.id || null,
                        amount: 10000
                    }
                });
            }

            return prisma.wallet.create({
                data: {
                    userId: randomGameInstance.userId,
                    gameInstanceId: randomGameInstance.id,
                    amount: randomGameInstance.startBalance || 10000
                }
            });
        })
    );

    // 23. Créer des transactions
    console.log(`💸 Création de ${DATA_COUNT * 3} transactions...`);
    const transactions = [];
    for (let i = 0; i < DATA_COUNT * 3; i++) {
        const randomWallet = wallets[Math.floor(Math.random() * wallets.length)];
        const randomAsset = assets[Math.floor(Math.random() * assets.length)];
        const randomGameInstance = gameInstances[Math.floor(Math.random() * gameInstances.length)];

        if (!randomWallet || !randomAsset || !randomGameInstance) continue;

        const quantity = Math.floor(Math.random() * 100) + 1;
        const unitPrice = 50 + Math.floor(Math.random() * 950);
        const totalValue = quantity * unitPrice;

        const transaction = await prisma.transaction.create({
            data: {
                walletId: randomWallet.id,
                assetId: randomAsset.id,
                gameInstanceId: randomGameInstance.id,
                type: ["buy", "sell"][Math.floor(Math.random() * 2)],
                quantity: quantity,
                unitPrice: unitPrice,
                totalValue: totalValue,
                transactionDate: new Date(Date.now() - (Math.floor(Math.random() * 30) * 86400000)),
                source: ["manual", "auto", "event"][Math.floor(Math.random() * 3)]
            }
        });
        transactions.push(transaction);
    }

    // 24. Créer des notifications
    console.log(`🔔 Création de ${DATA_COUNT} notifications...`);
    const notifications = await Promise.all(
        Array.from({ length: DATA_COUNT }, (_, index) => {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const notificationTypes: Array<"QUIZ" | "NEWS" | "REMINDER" | "PROFILE"> = ["QUIZ", "NEWS", "REMINDER", "PROFILE"];
            const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];

            if (!randomUser) {
                return prisma.notification.create({
                    data: {
                        userId: users[0]?.id || null,
                        title: `Notification ${index + 1}`,
                        message: `Message de notification ${index + 1}`,
                        type: randomType,
                        typeId: index + 1,
                        isOpened: Math.random() > 0.5,
                        sentAt: new Date(Date.now() - (Math.floor(Math.random() * 7) * 86400000))
                    }
                });
            }

            return prisma.notification.create({
                data: {
                    userId: randomUser.id,
                    title: `Notification ${randomType.toLowerCase()} ${index + 1}`,
                    message: `Vous avez une nouvelle notification de type ${randomType}`,
                    type: randomType,
                    typeId: index + 1,
                    isOpened: Math.random() > 0.5,
                    sentAt: new Date(Date.now() - (Math.floor(Math.random() * 7) * 86400000))
                }
            });
        })
    );

    console.log("✅ Seeding terminé avec succès !");
    console.log(`📊 Données créées avec DATA_COUNT = ${DATA_COUNT} :`);
    console.log(`   - ${levels.length} niveaux`);
    console.log(`   - ${users.length} utilisateurs`);
    console.log(`   - ${questions.length} questions`);
    console.log(`   - ${answers.length} réponses`);
    console.log(`   - ${quiz.length} quiz`);
    console.log(`   - ${quizQuestions.length} associations quiz-questions`);
    console.log(`   - ${userQuizzes.length} participations quiz`);
    console.log(`   - ${userAnswers.length} réponses utilisateurs`);
    console.log(`   - ${markets.length} marchés`);
    console.log(`   - ${submarkets.length} sous-marchés`);
    console.log(`   - ${fields.length} domaines`);
    console.log(`   - ${assets.length} actifs`);
    console.log(`   - ${assetHistories.length} historiques de prix`);
    console.log(`   - ${events.length} événements`);
    console.log(`   - ${eventAssets.length} associations événements-actifs`);
    console.log(`   - ${goals.length} objectifs`);
    console.log(`   - ${levelGoals.length} associations niveau-objectif`);
    console.log(`   - ${levelEvents.length} associations niveau-événement`);
    console.log(`   - ${impacts.length} impacts`);
    console.log(`   - ${gameInstances.length} instances de jeu`);
    console.log(`   - ${gameUsers.length} utilisateurs de jeu`);
    console.log(`   - ${wallets.length} portefeuilles`);
    console.log(`   - ${transactions.length} transactions`);
    console.log(`   - ${notifications.length} notifications`);
    console.log(`\n🎯 Pour modifier la quantité de données :`);
    console.log(`   - Modifiez DATA_COUNT dans le fichier`);
    console.log(`   - Ou utilisez: SEED_COUNT=20 bun run db:seed`);
}

main()
    .catch((e) => {
        console.error("❌ Erreur lors du seeding :", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
