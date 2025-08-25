/**
 * Exemple d'utilisation de l'API Markets
 * 
 * Ce fichier contient des exemples de requêtes pour tester l'API Markets
 * Utilisez ces exemples avec curl, Postman, Bruno ou tout autre client HTTP
 */

// Base URL pour les tests locaux
const BASE_URL = 'http://localhost:3000/api/markets';

/**
 * Exemples de requêtes curl pour tester l'API Markets
 */

export const MARKET_API_EXAMPLES = {
  // 1. Créer un nouveau market
  createMarket: `
curl -X POST ${BASE_URL} \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Marché Technologique",
    "description": "Marché des technologies innovantes",
    "currentTrends": "IA, Blockchain, IoT",
    "dataSource": "API TechData"
  }'`,

  // 2. Récupérer tous les markets avec pagination
  getAllMarkets: `
curl -X GET "${BASE_URL}?page=1&limit=5&includeSubmarkets=true"`,

  // 3. Récupérer un market par ID avec relations
  getMarketById: `
curl -X GET "${BASE_URL}/1?includeRelations=true"`,

  // 4. Mettre à jour un market
  updateMarket: `
curl -X PUT ${BASE_URL}/1 \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Marché Tech Mis à Jour",
    "currentTrends": "IA Générative, Web3"
  }'`,

  // 5. Rechercher des markets
  searchMarkets: `
curl -X GET "${BASE_URL}/search?q=tech&limit=3"`,

  // 6. Récupérer les statistiques d'un market
  getMarketStats: `
curl -X GET "${BASE_URL}/1/stats"`,

  // 7. Supprimer un market
  deleteMarket: `
curl -X DELETE ${BASE_URL}/1`,

  // 8. Health check
  healthCheck: `
curl -X GET "http://localhost:3000/health"`,

  // 9. Info API
  apiInfo: `
curl -X GET "http://localhost:3000/"`,
};

/**
 * Exemples de données pour créer des markets
 */
export const SAMPLE_MARKETS = [
  {
    name: "Marché des Cryptomonnaies",
    description: "Trading de cryptomonnaies et actifs numériques",
    currentTrends: "Bitcoin, Ethereum, DeFi",
    dataSource: "CoinGecko API"
  },
  {
    name: "Marché Boursier Traditionnel",
    description: "Actions, obligations et fonds d'investissement",
    currentTrends: "ESG, Valeurs technologiques",
    dataSource: "Yahoo Finance API"
  },
  {
    name: "Marché des Matières Premières",
    description: "Or, pétrole, métaux précieux et agricoles",
    currentTrends: "Transition énergétique, Agriculture durable",
    dataSource: "Bloomberg API"
  },
  {
    name: "Marché Immobilier",
    description: "Investissement immobilier et REITs",
    currentTrends: "Télétravail, Immobilier vert",
    dataSource: "Real Estate API"
  },
  {
    name: "Marché des Startups",
    description: "Investissement en capital-risque et startups",
    currentTrends: "FinTech, HealthTech, CleanTech",
    dataSource: "Crunchbase API"
  }
];

/**
 * Fonction pour tester l'API Markets (à utiliser avec Bun)
 */
export async function testMarketAPI() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🧪 Test de l\'API Markets...\n');

    // 1. Health check
    console.log('1. Health Check...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    console.log(`Status: ${healthResponse.status}`);
    console.log(`Response: ${await healthResponse.text()}\n`);

    // 2. Créer un market de test
    console.log('2. Création d\'un market...');
    const createResponse = await fetch(`${baseUrl}/api/markets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLE_MARKETS[0])
    });
    console.log(`Status: ${createResponse.status}`);
    const createdMarket = await createResponse.json();
    console.log(`Market créé:`, createdMarket);
    console.log('');

    // 3. Récupérer tous les markets
    console.log('3. Récupération de tous les markets...');
    const getAllResponse = await fetch(`${baseUrl}/api/markets?limit=3`);
    console.log(`Status: ${getAllResponse.status}`);
    const allMarkets = await getAllResponse.json();
    console.log(`Markets trouvés:`, allMarkets);
    console.log('');

    // 4. Test de recherche
    console.log('4. Test de recherche...');
    const searchResponse = await fetch(`${baseUrl}/api/markets/search?q=crypto&limit=2`);
    console.log(`Status: ${searchResponse.status}`);
    const searchResults = await searchResponse.json();
    console.log(`Résultats de recherche:`, searchResults);
    console.log('');

    console.log('✅ Tests terminés avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

/**
 * Instructions pour utiliser ce fichier:
 * 
 * 1. Démarrer le serveur:
 *    cd backend && bun run dev
 * 
 * 2. Dans un autre terminal, exécuter les tests:
 *    cd backend && bun run src/examples/market-example.ts
 * 
 * 3. Ou utiliser les commandes curl directement depuis le terminal
 */
