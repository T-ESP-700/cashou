import prisma from '../database.ts'

// === GESTION DES UTILISATEURS ===

// Créer un utilisateur avec un niveau
export async function createUser(
  username: string, 
  email: string, 
  levelId: number,
  passwordHash?: string
) {
  try {
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        levelId,
        points: 0,
      },
      include: {
        level: true,
      },
    })
    console.log('Utilisateur créé:', user)
    return user
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error)
    throw error
  }
}

// Récupérer tous les utilisateurs avec leurs niveaux
export async function getAllUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        level: true,
        gameInstances: true,
        notifications: {
          where: { isOpened: false },
          take: 5,
        },
      },
    })
    console.log('Utilisateurs trouvés:', users)
    return users
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error)
    throw error
  }
}

// === GESTION DES NIVEAUX ===

// Créer un niveau
export async function createLevel(
  title: string,
  number: number,
  duration: number,
  startBalance: number,
  pointsRequired: number,
  description?: string
) {
  try {
    const level = await prisma.level.create({
      data: {
        title,
        number,
        duration,
        startBalance,
        pointsRequired,
        description,
      },
    })
    console.log('Niveau créé:', level)
    return level
  } catch (error) {
    console.error('Erreur lors de la création du niveau:', error)
    throw error
  }
}

// === GESTION DES QUIZ ===

// Créer un quiz quotidien
export async function createDailyQuiz(
  title: string,
  levelId: number,
  context?: string
) {
  try {
    const quiz = await prisma.quiz.create({
      data: {
        type: 'daily',
        title,
        levelId,
        context,
        date: new Date(),
      },
      include: {
        level: true,
      },
    })
    console.log('Quiz quotidien créé:', quiz)
    return quiz
  } catch (error) {
    console.error('Erreur lors de la création du quiz:', error)
    throw error
  }
}

// === GESTION DES MARCHÉS ET ACTIFS ===

// Créer un marché avec des sous-marchés
export async function createMarketWithSubmarkets(
  marketName: string,
  marketDescription: string,
  submarkets: Array<{name: string, description: string}>
) {
  try {
    const market = await prisma.market.create({
      data: {
        name: marketName,
        description: marketDescription,
        submarkets: {
          create: submarkets,
        },
      },
      include: {
        submarkets: true,
      },
    })
    console.log('Marché créé avec sous-marchés:', market)
    return market
  } catch (error) {
    console.error('Erreur lors de la création du marché:', error)
    throw error
  }
}

// Créer un actif
export async function createAsset(
  title: string,
  symbol: string,
  marketId: number,
  submarketId?: number,
  description?: string
) {
  try {
    const asset = await prisma.asset.create({
      data: {
        title,
        symbol,
        marketId,
        submarketId,
        description,
      },
      include: {
        market: true,
        submarket: true,
      },
    })
    console.log('Actif créé:', asset)
    return asset
  } catch (error) {
    console.error('Erreur lors de la création de l\'actif:', error)
    throw error
  }
}

// === GESTION DES INSTANCES DE JEU ===

// Créer une instance de jeu
export async function createGameInstance(
  userId: number,
  levelId: number,
  type: string,
  startBalance: number
) {
  try {
    const gameInstance = await prisma.gameInstance.create({
      data: {
        userId,
        levelId,
        type,
        startBalance,
        isPaused: false,
        actionRequired: false,
      },
      include: {
        user: true,
        level: true,
      },
    })

    // Créer automatiquement un wallet pour cette instance
    await prisma.wallet.create({
      data: {
        gameInstanceId: gameInstance.id,
        amount: startBalance,
      },
    })

    console.log('Instance de jeu créée:', gameInstance)
    return gameInstance
  } catch (error) {
    console.error('Erreur lors de la création de l\'instance de jeu:', error)
    throw error
  }
}

// === GESTION DES TRANSACTIONS ===

// Créer une transaction
export async function createTransaction(
  walletId: number,
  assetId: number,
  gameInstanceId: number,
  type: 'BUY' | 'SELL',
  quantity: number,
  unitPrice: number
) {
  try {
    const totalValue = quantity * unitPrice

    const transaction = await prisma.transaction.create({
      data: {
        walletId,
        assetId,
        gameInstanceId,
        type,
        quantity,
        unitPrice,
        totalValue,
        transactionDate: new Date(),
        source: 'user_action',
      },
      include: {
        asset: true,
        wallet: true,
      },
    })

    console.log('Transaction créée:', transaction)
    return transaction
  } catch (error) {
    console.error('Erreur lors de la création de la transaction:', error)
    throw error
  }
}

// === GESTION DES NOTIFICATIONS ===

// Créer une notification
export async function createNotification(
  userId: number,
  title: string,
  message: string,
  type: 'quiz' | 'news' | 'reminder' | 'Profile',
  typeId?: number
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        typeId,
        isOpened: false,
        sentAt: new Date(),
      },
      include: {
        user: true,
      },
    })

    console.log('Notification créée:', notification)
    return notification
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error)
    throw error
  }
}

// === STATISTIQUES ===

// Obtenir les statistiques d'un utilisateur
export async function getUserStats(userId: number) {
  try {
    const stats = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        level: true,
        gameInstances: {
          include: {
            transactions: true,
            wallets: true,
          },
        },
        userQuiz: {
          where: { isCorrect: true },
        },
        notifications: {
          where: { isOpened: false },
        },
      },
    })

    if (!stats) {
      throw new Error('Utilisateur non trouvé')
    }

    const totalTransactions = stats.gameInstances.reduce(
      (acc: number, game: any) => acc + game.transactions.length, 0
    )
    
    const totalWalletValue = stats.gameInstances.reduce(
      (acc: number, game: any) => acc + game.wallets.reduce(
        (walletAcc: number, wallet: any) => walletAcc + Number(wallet.amount || 0), 0
      ), 0
    )

    console.log('Statistiques utilisateur:', {
      user: stats.username,
      level: stats.level.title,
      points: stats.points,
      correctQuizzes: stats.userQuiz.length,
      totalTransactions,
      totalWalletValue,
      unreadNotifications: stats.notifications.length,
    })

    return stats
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error)
    throw error
  }
} 