// Fichier de seed pour peupler la base de données avec des données de test
// Utilise Prisma Client pour insérer des données cohérentes dans toutes les tables
import { PrismaClient } from "@cashou/db-app";

const prisma = new PrismaClient();

// 🎛️ CONFIGURATION : Modifiez cette valeur pour contrôler la quantité de données
const DATA_COUNT = 20;

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
    { name: "Alice Crypto", email: "alice@example.com" },
    { name: "Bob Trader", email: "bob@example.com" },
    { name: "Charlie Invest", email: "charlie@example.com" },
    { name: "Diana Finance", email: "diana@example.com" },
    { name: "Eve Analyst", email: "eve@example.com" },
    { name: "Frank Advisor", email: "frank@example.com" },
    { name: "Grace Quant", email: "grace@example.com" },
    { name: "Henry Risk", email: "henry@example.com" },
    { name: "Iris Tech", email: "iris@example.com" },
    { name: "Jack Global", email: "jack@example.com" }
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

    // 1. Créer des marchés (Markets)
    console.log('📊 Création des marchés...');
    const markets = await Promise.all([
        prisma.market.upsert({
            where: { id: 1 },
            update: {},
            create: {
                title: 'Bourses',
                description: 'Marchés boursiers internationaux'
            }
        }),
        prisma.market.upsert({
            where: { id: 2 },
            update: {},
            create: {
                title: 'Crypto',
                description: 'Marchés des cryptomonnaies'
            }
        }),
        prisma.market.upsert({
            where: { id: 3 },
            update: {},
            create: {
                title: 'Matières premières',
                description: 'Marchés des commodités et matières premières'
            }
        })
    ]);

    // 2. Créer des secteurs (Fields)
    console.log('🏭 Création des secteurs...');
    const fields = await Promise.all([
        prisma.field.upsert({
            where: { name: 'Technologie' },
            update: {},
            create: {
                name: 'Technologie',
                marketId: markets[0].id
            }
        }),
        prisma.field.upsert({
            where: { name: 'Finance' },
            update: {},
            create: {
                name: 'Finance',
                marketId: markets[0].id
            }
        }),
        prisma.field.upsert({
            where: { name: 'Énergie' },
            update: {},
            create: {
                name: 'Énergie',
                marketId: markets[0].id
            }
        }),
        prisma.field.upsert({
            where: { name: 'Santé' },
            update: {},
            create: {
                name: 'Santé',
                marketId: markets[0].id
            }
        }),
        prisma.field.upsert({
            where: { name: 'Blockchain' },
            update: {},
            create: {
                name: 'Blockchain',
                marketId: markets[1].id
            }
        })
    ]);

    // 3. Créer des sous-marchés (Submarkets)
    console.log('🌐 Création des sous-marchés...');
    const submarkets = await Promise.all([
        prisma.submarket.upsert({
            where: { id: 1 },
            update: {},
            create: {
                title: 'CAC40',
                description: 'Indice boursier français',
                marketId: markets[0].id
            }
        }),
        prisma.submarket.upsert({
            where: { id: 2 },
            update: {},
            create: {
                title: 'S&P500',
                description: 'Indice boursier américain',
                marketId: markets[0].id
            }
        }),
        prisma.submarket.upsert({
            where: { id: 3 },
            update: {},
            create: {
                title: 'DeFi',
                description: 'Finance décentralisée',
                marketId: markets[1].id
            }
        })
    ]);

    // 4. Créer des actifs (Assets) avec fieldId
    console.log('💰 Création des actifs...');
    const assets = await Promise.all([
        prisma.asset.upsert({
            where: { symbol: 'AAPL' },
            update: { fieldId: fields[0].id }, // Technologie
            create: {
                title: 'Apple Inc.',
                symbol: 'AAPL',
                description: 'Entreprise technologique américaine',
                marketId: markets[0].id,
                submarketId: submarkets[1].id,
                fieldId: fields[0].id // Utilise fieldId au lieu de field
            }
        }),
        prisma.asset.upsert({
            where: { symbol: 'BNP' },
            update: { fieldId: fields[1].id }, // Finance
            create: {
                title: 'BNP Paribas',
                symbol: 'BNP',
                description: 'Banque française',
                marketId: markets[0].id,
                submarketId: submarkets[0].id,
                fieldId: fields[1].id
            }
        }),
        prisma.asset.upsert({
            where: { symbol: 'BTC' },
            update: { fieldId: fields[4].id }, // Blockchain
            create: {
                title: 'Bitcoin',
                symbol: 'BTC',
                description: 'Première cryptomonnaie',
                marketId: markets[1].id,
                submarketId: submarkets[2].id,
                fieldId: fields[4].id
            }
        }),
        prisma.asset.upsert({
            where: { symbol: 'ETH' },
            update: { fieldId: fields[4].id }, // Blockchain
            create: {
                title: 'Ethereum',
                symbol: 'ETH',
                description: 'Plateforme blockchain pour smart contracts',
                marketId: markets[1].id,
                submarketId: submarkets[2].id,
                fieldId: fields[4].id
            }
        }),
        prisma.asset.upsert({
            where: { symbol: 'TOTA' },
            update: { fieldId: fields[2].id }, // Énergie
            create: {
                title: 'TotalEnergies',
                symbol: 'TOTA',
                description: 'Compagnie pétrolière et gazière française',
                marketId: markets[0].id,
                submarketId: submarkets[0].id,
                fieldId: fields[2].id
            }
        })
    ]);

    // 5. Créer des niveaux
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

    // 5b. Goal + LevelGoal for level 1 (T-120: mandatory goal so endGame/LevelCompletionService work)
    const level1 = levels[0];
    if (level1) {
        let seedGoal = await prisma.goal.findFirst({
            where: { title: 'Reste en positif' }
        });
        if (!seedGoal) {
            seedGoal = await prisma.goal.create({
                data: {
                    title: 'Reste en positif',
                    description: "Ne pas perdre d'argent par rapport au capital initial.",
                    goalType: 'wallet_gte_start',
                    goalValue: 0
                }
            });
        }
        const existingLevelGoal = await prisma.levelGoal.findFirst({
            where: { levelId: level1.id, goalId: seedGoal.id }
        });
        if (!existingLevelGoal) {
            await prisma.levelGoal.create({
                data: {
                    levelId: level1.id,
                    goalId: seedGoal.id,
                    isMandatory: true
                }
            });
            console.log('🎯 Goal "Reste en positif" lié au niveau 1 (obligatoire)');
        }
    }

    // 6. Créer des utilisateurs
    console.log(`👥 Création de ${DATA_COUNT} utilisateurs...`);
    const selectedUserTemplates = generateRandomData(userTemplates, DATA_COUNT);

    const users = await Promise.all(
        selectedUserTemplates.map((template, index) =>
            prisma.user.create({
                data: {
                    name: `${template.name} ${index + 1}`,
                    email: template.email.replace('@', `${index + 1}@`),
                    emailVerified: Math.random() > 0.5, // 50% des utilisateurs ont vérifié leur email
                    levelId: levels[Math.floor(Math.random() * levels.length)]?.id || levels[0]?.id || 1,
                    points: Math.floor(Math.random() * 1000) // Points aléatoires 0-999
                }
            })
        )
    );

    // 6b. Optional: UserLevelCompletion for demo stars (T-120) on level 1
    const level1ForCompletion = levels[0];
    if (level1ForCompletion && users.length >= 2) {
        const now = new Date();
        await prisma.userLevelCompletion.upsert({
            where: {
                userId_levelId: { userId: users[0]!.id, levelId: level1ForCompletion.id }
            },
            create: {
                userId: users[0]!.id,
                levelId: level1ForCompletion.id,
                stars: 2,
                mandatoryGoalsMet: true,
                bonusGoalsMet: false,
                quizPassed: true,
                completedAt: now
            },
            update: {
                stars: 2,
                mandatoryGoalsMet: true,
                bonusGoalsMet: false,
                quizPassed: true,
                completedAt: now
            }
        });
        await prisma.userLevelCompletion.upsert({
            where: {
                userId_levelId: { userId: users[1]!.id, levelId: level1ForCompletion.id }
            },
            create: {
                userId: users[1]!.id,
                levelId: level1ForCompletion.id,
                stars: 3,
                mandatoryGoalsMet: true,
                bonusGoalsMet: true,
                quizPassed: true,
                completedAt: now
            },
            update: {
                stars: 3,
                mandatoryGoalsMet: true,
                bonusGoalsMet: true,
                quizPassed: true,
                completedAt: now
            }
        });
        console.log('⭐ UserLevelCompletion démo créées (2 et 3 étoiles pour niveau 1)');
    }

    // 7. Créer des questions
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

    // 8. Créer des réponses pour chaque question
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

    // 9. Créer des quiz
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
                    description: isDaily
                        ? `Quiz quotidien numéro ${index + 1}`
                        : `Quiz de niveau pour ${randomLevel?.title?.toLowerCase() || 'niveau inconnu'}`,
                    levelId: isDaily ? null : randomLevel?.id || null
                }
            });
        })
    );

    // 10. Créer des associations quiz-questions
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
                    questionId: selectedQuestion.id
                }
            });
            quizQuestions.push(quizQuestion);
        }
    }

    // 11. Créer des participations aux quiz
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
                        userId: users[0]?.id || '1',
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

    // 12. Créer des réponses d'utilisateurs
    console.log(`📝 Création de ${DATA_COUNT} réponses d'utilisateurs...`);
    const userAnswers = await Promise.all(
        Array.from({ length: DATA_COUNT }, (_, index) => {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
            
            if (!randomUser || !randomQuestion) {
                // Fallback si pas d'utilisateur ou question valide
                return prisma.userAnswer.create({
                    data: {
                        userId: users[0]?.id || '1',
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

    console.log("✅ Seeding terminé avec succès !");
    console.log(`📊 Données créées avec DATA_COUNT = ${DATA_COUNT} :`);
    console.log(`   - ${markets.length} marchés`);
    console.log(`   - ${fields.length} secteurs`);
    console.log(`   - ${submarkets.length} sous-marchés`);
    console.log(`   - ${assets.length} actifs (avec fieldId)`);
    console.log(`   - ${levels.length} niveaux`);
    console.log(`   - ${users.length} utilisateurs`);
    console.log(`   - ${questions.length} questions`);
    console.log(`   - ${answers.length} réponses`);
    console.log(`   - ${quiz.length} quiz`);
    console.log(`   - ${quizQuestions.length} associations quiz-questions`);
    console.log(`   - ${userQuizzes.length} participations quiz`);
    console.log(`   - ${userAnswers.length} réponses utilisateurs`);
    console.log(`\n🎯 Pour modifier la quantité de données :`);
    console.log(`   - Modifiez DATA_COUNT dans le fichier`);
    console.log(`   - Ou utilisez: SEED_COUNT=20 bun run seed`);
}

main()
    .catch((e) => {
        console.error("❌ Erreur lors du seeding :", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
