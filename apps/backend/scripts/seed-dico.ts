// Fichier de seed pour peupler la table dico_entries avec des termes financiers
// Vérifie si les entrées existent déjà avant de les insérer
import { PrismaClient } from "@cashou/db-app";

const prisma = new PrismaClient();

// 100 termes essentiels pour comprendre l'investissement, l'épargne, la bourse et les crypto
const DICO_ENTRIES = [
  // === BASES DE L'INVESTISSEMENT (1-20) ===
  {
    term: "Action",
    definition: "Titre de propriété d'une part du capital d'une entreprise.\nUn morceau de gâteau que tu possèdes dans une grande entreprise. Plus l'entreprise va bien, plus ton morceau de gâteau prend de la valeur !"
  },
  {
    term: "Obligation",
    definition: "Titre de créance émis par une entreprise ou un État contre des intérêts réguliers.\nTu prêtes de l'argent à une entreprise ou à l'État. En échange, ils te versent des intérêts jusqu'au remboursement !"
  },
  {
    term: "Actif",
    definition: "Bien ou ressource ayant une valeur économique détenu par un investisseur.\nTout ce que tu possèdes qui a de la valeur : ton argent, tes actions, ton appartement... C'est ton trésor personnel !"
  },
  {
    term: "Passif",
    definition: "Ensemble des dettes et obligations financières d'une personne ou entreprise.\nTout ce que tu dois : crédits, emprunts, factures à payer. C'est le poids sur tes finances !"
  },
  {
    term: "Portefeuille",
    definition: "Ensemble des actifs financiers détenus par un investisseur.\nTa collection d'investissements. Actions, obligations, ETF... tout ce que tu as rassemblé pour faire fructifier ton argent !"
  },
  {
    term: "Rendement",
    definition: "Performance d'un investissement, généralement exprimée en pourcentage du capital investi.\nCe que ton investissement te rapporte. C'est ta note de performance annuelle !"
  },
  {
    term: "Risque",
    definition: "Probabilité de perte ou de variation négative de la valeur d'un investissement.\nLa chance que tu perdes de l'argent. Plus de risque = potentiellement plus de gain... ou plus de perte !"
  },
  {
    term: "Diversification",
    definition: "Stratégie consistant à répartir ses investissements sur différents actifs pour réduire le risque global.\nNe pas mettre tous ses œufs dans le même panier. Si un panier tombe, les autres sont saufs !"
  },
  {
    term: "Liquidité",
    definition: "Facilité avec laquelle un actif peut être acheté ou vendu sans affecter significativement son prix.\nÀ quelle vitesse tu peux transformer ton investissement en cash. L'argent liquide, c'est la liquidité ultime !"
  },
  {
    term: "Plus-value",
    definition: "Gain réalisé lors de la vente d'un actif à un prix supérieur à son prix d'achat.\nL'argent gagné quand tu vends plus cher que tu as acheté. Le bénéfice de ton investissement !"
  },
  {
    term: "Moins-value",
    definition: "Perte réalisée lors de la vente d'un actif à un prix inférieur à son prix d'achat.\nL'argent perdu quand tu vends moins cher que tu as acheté. Ça fait mal, mais ça arrive !"
  },
  {
    term: "Dividende",
    definition: "Part des bénéfices d'une entreprise distribuée aux actionnaires.\nTa part du gâteau ! Quand l'entreprise gagne de l'argent, elle peut t'en donner une partie régulièrement."
  },
  {
    term: "Intérêts composés",
    definition: "Mécanisme où les intérêts générés produisent eux-mêmes des intérêts.\nLa magie de l'argent qui fait des bébés, et les bébés font des bébés ! Effet boule de neige garanti sur le long terme."
  },
  {
    term: "Capital",
    definition: "Somme d'argent investie ou disponible pour l'investissement.\nTon trésor de guerre ! L'argent que tu mets au travail pour qu'il te rapporte plus."
  },
  {
    term: "Allocation d'actifs",
    definition: "Stratégie de répartition des investissements entre différentes catégories d'actifs.\nComment tu répartis ton argent entre actions, obligations et liquidités. C'est comme composer ton menu équilibré !"
  },
  {
    term: "Horizon d'investissement",
    definition: "Durée pendant laquelle un investisseur prévoit de conserver ses placements.\nCombien de temps tu comptes garder ton investissement. Court terme (< 2 ans) ou long terme (> 5 ans) ?"
  },
  {
    term: "Profil de risque",
    definition: "Niveau de risque qu'un investisseur est prêt à accepter en fonction de ses objectifs et sa tolérance.\nEs-tu plutôt prudent, équilibré ou aventurier ? Ton profil détermine ta stratégie !"
  },
  {
    term: "Effet de levier",
    definition: "Technique permettant d'amplifier les gains (ou les pertes) en utilisant l'endettement.\nEmprunter pour investir plus. Ça peut multiplier tes gains... mais aussi tes pertes ! À utiliser avec précaution."
  },
  {
    term: "Valeur nominale",
    definition: "Valeur faciale d'un titre, inscrite sur le document.\nLe prix affiché sur l'étiquette d'origine. Pas forcément ce que ça vaut vraiment sur le marché !"
  },
  {
    term: "Valeur de marché",
    definition: "Prix auquel un actif peut être acheté ou vendu sur le marché à un instant donné.\nCe que les gens sont vraiment prêts à payer maintenant. Le vrai prix du moment !"
  },

  // === BOURSE ET MARCHÉS (21-40) ===
  {
    term: "Bourse",
    definition: "Marché organisé où s'échangent des titres financiers comme les actions et obligations.\nLe grand marché où tout le monde achète et vend des parts d'entreprises. Comme un supermarché géant pour investisseurs !"
  },
  {
    term: "Indice boursier",
    definition: "Indicateur mesurant la performance d'un groupe d'actions représentatif d'un marché.\nUn thermomètre qui mesure la santé d'un marché. Si l'indice monte, le marché va bien !"
  },
  {
    term: "CAC 40",
    definition: "Indice boursier français regroupant les 40 plus grandes entreprises de la Bourse de Paris.\nLe top 40 des entreprises françaises cotées. C'est le hit-parade de la bourse française !"
  },
  {
    term: "S&P 500",
    definition: "Indice boursier américain regroupant les 500 plus grandes entreprises cotées aux États-Unis.\nLe top 500 des entreprises US. Apple, Google, Amazon... les géants sont tous là !"
  },
  {
    term: "Nasdaq",
    definition: "Bourse américaine spécialisée dans les entreprises technologiques.\nLe paradis des tech ! C'est là que sont cotées les stars de la Silicon Valley."
  },
  {
    term: "Dow Jones",
    definition: "Indice boursier américain composé de 30 grandes entreprises industrielles.\nLe doyen des indices US ! 30 mastodontes de l'économie américaine depuis 1896."
  },
  {
    term: "Bull Market",
    definition: "Marché haussier caractérisé par une hausse prolongée des prix des actifs.\nQuand tout le monde est optimiste et que les prix montent. Le taureau fonce vers le haut avec ses cornes !"
  },
  {
    term: "Bear Market",
    definition: "Marché baissier caractérisé par une baisse prolongée des prix (généralement -20% ou plus).\nQuand les investisseurs ont peur et que les prix chutent. L'ours frappe vers le bas avec ses pattes !"
  },
  {
    term: "Volatilité",
    definition: "Mesure de l'amplitude des variations de prix d'un actif.\nÀ quel point les prix font les montagnes russes. Forte volatilité = émotions fortes et opportunités risquées !"
  },
  {
    term: "Capitalisation boursière",
    definition: "Valeur totale d'une entreprise cotée, calculée en multipliant le nombre d'actions par leur cours.\nLe prix total de l'entreprise si on additionnait toutes ses actions. Sa vraie valeur sur le marché !"
  },
  {
    term: "Volume",
    definition: "Nombre de titres échangés sur une période donnée.\nCombien d'actions ont changé de mains. Un gros volume = beaucoup d'intérêt pour ce titre !"
  },
  {
    term: "Cotation",
    definition: "Prix officiel d'un titre à un moment donné sur un marché.\nLe prix affiché en temps réel. Ça bouge tout le temps pendant les heures d'ouverture !"
  },
  {
    term: "Introduction en bourse (IPO)",
    definition: "Première mise en vente d'actions d'une entreprise au public sur un marché boursier.\nQuand une entreprise privée devient publique. Tu peux enfin en acheter des parts !"
  },
  {
    term: "Ordre de bourse",
    definition: "Instruction donnée à un intermédiaire pour acheter ou vendre des titres.\nTa commande ! Tu dis ce que tu veux acheter/vendre, à quel prix et quelle quantité."
  },
  {
    term: "Ordre limite",
    definition: "Type d'ordre boursier qui s'exécute uniquement si le prix atteint un niveau fixé.\nTu fixes ton prix maximum (ou minimum). Ton ordre ne passe que si le marché atteint ce prix !"
  },
  {
    term: "Ordre au marché",
    definition: "Ordre d'achat ou de vente exécuté immédiatement au meilleur prix disponible.\nTu achètes ou vends tout de suite, peu importe le prix exact. Rapide mais parfois surprenant !"
  },
  {
    term: "Spread",
    definition: "Écart entre le prix d'achat (ask) et le prix de vente (bid) d'un actif.\nLa différence entre le prix pour acheter et pour vendre. C'est la marge du marché !"
  },
  {
    term: "Broker",
    definition: "Intermédiaire financier qui exécute des ordres d'achat et de vente pour ses clients.\nTon assistant shopping pour la bourse. Il passe tes commandes d'actions à ta place !"
  },
  {
    term: "Market Maker",
    definition: "Acteur qui assure la liquidité du marché en proposant en permanence des prix d'achat et de vente.\nLe DJ du marché ! Il s'assure qu'il y a toujours quelqu'un pour acheter ou vendre."
  },
  {
    term: "Blue Chip",
    definition: "Action d'une grande entreprise réputée, stable et bien établie.\nLes stars de la bourse ! Des entreprises solides comme le roc avec un historique prouvé."
  },

  // === ANALYSE ET STRATÉGIES (41-55) ===
  {
    term: "Analyse fondamentale",
    definition: "Méthode d'évaluation basée sur les données financières et économiques d'une entreprise.\nÉtudier les comptes d'une entreprise pour savoir si elle vaut vraiment le coup. C'est faire ses devoirs !"
  },
  {
    term: "Analyse technique",
    definition: "Méthode d'évaluation basée sur l'étude des graphiques et des tendances de prix.\nLire les courbes pour prédire le futur. C'est un peu comme lire dans les étoiles... mais avec des maths !"
  },
  {
    term: "PER (Price Earning Ratio)",
    definition: "Ratio cours/bénéfice qui mesure combien les investisseurs paient pour chaque euro de bénéfice.\nSi le PER est 20, tu paies 20€ pour 1€ de bénéfice. Cher ou pas ? Ça dépend du secteur !"
  },
  {
    term: "ROE (Return on Equity)",
    definition: "Rentabilité des capitaux propres, mesure l'efficacité d'une entreprise à générer des profits.\nCombien l'entreprise gagne avec l'argent des actionnaires. Plus c'est haut, plus c'est efficace !"
  },
  {
    term: "ROI (Return on Investment)",
    definition: "Retour sur investissement, ratio entre le gain et le montant investi.\nCombien tu as gagné par rapport à ce que tu as mis. Un ROI de 10% = 10€ gagnés pour 100€ investis !"
  },
  {
    term: "Support",
    definition: "Niveau de prix où un actif a tendance à rebondir à la hausse.\nLe plancher ! Quand le prix touche ce niveau, il rebondit souvent vers le haut."
  },
  {
    term: "Résistance",
    definition: "Niveau de prix où un actif a tendance à buter et redescendre.\nLe plafond ! Quand le prix atteint ce niveau, il a du mal à aller plus haut."
  },
  {
    term: "Tendance",
    definition: "Direction générale du mouvement des prix sur une période donnée.\nVers où va le marché ? En hausse, en baisse ou stable ? La tendance est ton amie !"
  },
  {
    term: "Correction",
    definition: "Baisse temporaire des prix (généralement 10-20%) après une hausse importante.\nLe marché reprend son souffle. Pas de panique, c'est normal et souvent une opportunité !"
  },
  {
    term: "Krach boursier",
    definition: "Chute brutale et importante des cours de bourse en très peu de temps.\nLa catastrophe ! Les prix s'effondrent en quelques jours. Rare mais dévastateur."
  },
  {
    term: "Stop-loss",
    definition: "Ordre automatique de vente déclenché quand le prix descend sous un seuil défini.\nTon parachute de secours ! Ça limite tes pertes automatiquement si ça tourne mal."
  },
  {
    term: "Take profit",
    definition: "Ordre automatique de vente déclenché quand le prix atteint un objectif de gain.\nTon objectif de victoire ! Ça sécurise tes gains automatiquement quand tu as assez gagné."
  },
  {
    term: "DCA (Dollar Cost Averaging)",
    definition: "Stratégie d'investissement régulier d'un montant fixe, quelle que soit l'évolution des prix.\nInvestir la même somme tous les mois. Tu achètes parfois cher, parfois pas cher, mais tu lisses le risque !"
  },
  {
    term: "Momentum",
    definition: "Force et vitesse du mouvement d'un prix dans une direction donnée.\nL'élan du marché ! Un fort momentum haussier = les prix montent vite et fort."
  },
  {
    term: "Arbitrage",
    definition: "Technique consistant à profiter des différences de prix d'un même actif sur différents marchés.\nAcheter pas cher ici, revendre plus cher là-bas. Du profit quasi sans risque... si tu es rapide !"
  },

  // === FONDS ET ETF (56-65) ===
  {
    term: "ETF (Exchange Traded Fund)",
    definition: "Fonds négocié en bourse qui réplique la performance d'un indice, secteur ou classe d'actifs.\nUn panier d'actions tout fait qu'on achète d'un coup. Comme un menu complet plutôt que commander plat par plat !"
  },
  {
    term: "Fonds indiciel",
    definition: "Fonds d'investissement qui vise à répliquer la performance d'un indice de référence.\nUn fonds qui copie un indice comme le CAC 40. Tu suis le marché sans te prendre la tête !"
  },
  {
    term: "OPCVM",
    definition: "Organisme de Placement Collectif en Valeurs Mobilières, fonds d'investissement français.\nUn pot commun géré par des pros où tu mets ton argent avec d'autres investisseurs."
  },
  {
    term: "Frais de gestion",
    definition: "Coûts annuels prélevés par un fonds pour sa gestion, exprimés en pourcentage.\nCe que tu paies pour que des pros gèrent ton argent. Attention, ça grignote ton rendement !"
  },
  {
    term: "TER (Total Expense Ratio)",
    definition: "Ratio des frais totaux d'un fonds incluant tous les coûts de gestion.\nLe coût total annuel d'un ETF ou fonds. Plus c'est bas, mieux c'est pour toi !"
  },
  {
    term: "Tracking error",
    definition: "Écart entre la performance d'un fonds et celle de l'indice qu'il réplique.\nÀ quel point le fonds colle (ou pas) à son indice. Plus c'est proche de 0, mieux c'est !"
  },
  {
    term: "Fonds actif",
    definition: "Fonds dont le gérant sélectionne activement les investissements pour battre le marché.\nUn pro qui essaie de faire mieux que le marché. Souvent plus cher et pas toujours gagnant !"
  },
  {
    term: "Fonds passif",
    definition: "Fonds qui se contente de répliquer un indice sans chercher à le battre.\nOn copie le marché, point final. Moins cher et souvent aussi efficace que les fonds actifs !"
  },
  {
    term: "NAV (Net Asset Value)",
    definition: "Valeur liquidative d'un fonds, calculée en divisant la valeur totale des actifs par le nombre de parts.\nLe prix réel d'une part de fonds. C'est ce que tu récupères si tu vends."
  },
  {
    term: "Benchmark",
    definition: "Indice de référence utilisé pour comparer la performance d'un investissement.\nLe mètre étalon ! Si tu fais mieux que le benchmark, tu es bon. Sinon... à revoir !"
  },

  // === ÉPARGNE ET FISCALITÉ (66-75) ===
  {
    term: "PEA (Plan d'Épargne en Actions)",
    definition: "Enveloppe fiscale française permettant d'investir en actions européennes avec avantages fiscaux.\nUn compte spécial pour investir en actions avec moins d'impôts après 5 ans. Le bon plan français !"
  },
  {
    term: "Assurance-vie",
    definition: "Contrat d'épargne et de placement offrant des avantages fiscaux et successoraux.\nLe couteau suisse de l'épargne française ! Flexible, avantageux fiscalement et transmissible."
  },
  {
    term: "Livret A",
    definition: "Compte d'épargne réglementé français, défiscalisé et garanti par l'État.\nL'épargne de sécurité préférée des Français. Pas très rentable mais 100% sûr et disponible !"
  },
  {
    term: "LDDS",
    definition: "Livret de Développement Durable et Solidaire, épargne défiscalisée comme le Livret A.\nLe petit frère du Livret A. Même taux, mêmes avantages, plafond plus bas."
  },
  {
    term: "Flat tax",
    definition: "Prélèvement forfaitaire unique de 30% sur les revenus du capital en France.\n30% d'impôts sur tes gains financiers, point final. Simple mais pas toujours optimal !"
  },
  {
    term: "Abattement",
    definition: "Réduction de la base imposable accordée sous certaines conditions.\nMoins d'impôts grâce à des règles spéciales. Garde tes actions longtemps et profites-en !"
  },
  {
    term: "Impôt sur la fortune",
    definition: "Taxe sur le patrimoine des personnes fortunées (IFI en France pour l'immobilier).\nQuand tu es riche, tu paies un impôt supplémentaire. En France, ça ne touche plus que l'immobilier."
  },
  {
    term: "Donation",
    definition: "Transmission de patrimoine de son vivant à un bénéficiaire.\nDonner de l'argent ou des biens à tes proches. Des abattements existent, profites-en !"
  },
  {
    term: "Succession",
    definition: "Transmission du patrimoine d'une personne décédée à ses héritiers.\nCe qui se passe avec ton argent quand tu n'es plus là. Mieux vaut y penser avant !"
  },
  {
    term: "Inflation",
    definition: "Hausse généralisée et durable des prix, qui réduit le pouvoir d'achat de la monnaie.\nQuand tout devient plus cher avec le temps. Ton euro d'aujourd'hui achète moins que celui d'hier !"
  },

  // === CRYPTO ET BLOCKCHAIN (76-90) ===
  {
    term: "Cryptomonnaie",
    definition: "Monnaie numérique décentralisée utilisant la cryptographie pour sécuriser les transactions.\nDe l'argent digital qui n'appartient à aucun gouvernement. Bitcoin est la plus connue !"
  },
  {
    term: "Bitcoin",
    definition: "Première et plus célèbre cryptomonnaie, créée en 2009 par Satoshi Nakamoto.\nL'or numérique ! Limité à 21 millions d'unités, décentralisé et révolutionnaire."
  },
  {
    term: "Ethereum",
    definition: "Blockchain permettant de créer des smart contracts et des applications décentralisées.\nL'ordinateur mondial ! Pas juste une monnaie, c'est une plateforme pour construire le Web3."
  },
  {
    term: "Blockchain",
    definition: "Technologie de registre distribué où les transactions sont enregistrées de façon immuable.\nUn grand livre de comptes que tout le monde peut voir mais que personne ne peut truquer !"
  },
  {
    term: "Wallet (portefeuille crypto)",
    definition: "Application ou appareil permettant de stocker et gérer ses cryptomonnaies.\nTon coffre-fort numérique pour tes cryptos. Sans lui, impossible d'accéder à tes coins !"
  },
  {
    term: "Clé privée",
    definition: "Code secret permettant d'accéder et de dépenser ses cryptomonnaies.\nLe mot de passe ultime de tes cryptos. Perds-le et tu perds tout. À protéger absolument !"
  },
  {
    term: "Mining (minage)",
    definition: "Processus de validation des transactions et création de nouvelles cryptos via la puissance de calcul.\nDes ordinateurs qui résolvent des énigmes pour sécuriser le réseau et gagner des cryptos."
  },
  {
    term: "Staking",
    definition: "Blocage de ses cryptos pour participer à la validation du réseau et recevoir des récompenses.\nMettre ses cryptos au travail ! Tu les bloques et le réseau te récompense avec des intérêts."
  },
  {
    term: "DeFi (Finance Décentralisée)",
    definition: "Écosystème de services financiers fonctionnant sur blockchain sans intermédiaires.\nLa banque du futur ! Prêter, emprunter, échanger sans banque traditionnelle."
  },
  {
    term: "NFT (Non-Fungible Token)",
    definition: "Jeton numérique unique représentant la propriété d'un actif digital ou physique.\nUn certificat de propriété numérique. Chaque NFT est unique, comme une œuvre d'art."
  },
  {
    term: "Smart Contract",
    definition: "Programme autonome sur blockchain qui s'exécute automatiquement selon des conditions prédéfinies.\nUn contrat qui se gère tout seul ! Si la condition est remplie, l'action s'exécute automatiquement."
  },
  {
    term: "Altcoin",
    definition: "Toute cryptomonnaie autre que le Bitcoin.\nLes alternatives au Bitcoin. Il en existe des milliers : Ethereum, Solana, Cardano..."
  },
  {
    term: "Stablecoin",
    definition: "Cryptomonnaie dont la valeur est indexée sur un actif stable comme le dollar.\nUne crypto qui ne bouge pas ! 1 USDT = 1 dollar. Pratique pour éviter la volatilité."
  },
  {
    term: "HODL",
    definition: "Stratégie de conservation à long terme de ses cryptos malgré les fluctuations.\nGarder ses cryptos quoi qu'il arrive ! Un meme devenu philosophie d'investissement."
  },
  {
    term: "Gas fees",
    definition: "Frais de transaction sur une blockchain, notamment Ethereum.\nLe péage pour utiliser le réseau. Plus il y a de monde, plus c'est cher !"
  },

  // === ÉCONOMIE ET CONTEXTE (91-100) ===
  {
    term: "Taux d'intérêt",
    definition: "Pourcentage appliqué à un capital prêté ou emprunté.\nLe prix de l'argent ! Ce que te coûte un emprunt ou ce que te rapporte ton épargne."
  },
  {
    term: "Taux directeur",
    definition: "Taux fixé par la banque centrale qui influence tous les autres taux de l'économie.\nLe thermostat de l'économie ! La BCE monte ou baisse ce taux pour contrôler l'inflation."
  },
  {
    term: "BCE (Banque Centrale Européenne)",
    definition: "Institution qui gère la politique monétaire de la zone euro.\nLe gardien de l'euro ! Elle décide des taux et imprime la monnaie pour la zone euro."
  },
  {
    term: "Fed (Federal Reserve)",
    definition: "Banque centrale américaine qui gère la politique monétaire des États-Unis.\nLe boss du dollar ! Ses décisions influencent tous les marchés mondiaux."
  },
  {
    term: "PIB (Produit Intérieur Brut)",
    definition: "Valeur totale des biens et services produits dans un pays sur une période.\nLa taille de l'économie d'un pays. Plus le PIB croît, mieux l'économie se porte !"
  },
  {
    term: "Récession",
    definition: "Période de recul de l'activité économique, généralement deux trimestres consécutifs de baisse du PIB.\nQuand l'économie tousse. Moins de croissance, plus de chômage, ambiance morose."
  },
  {
    term: "Quantitative Easing (QE)",
    definition: "Politique monétaire où la banque centrale achète des actifs pour injecter de l'argent dans l'économie.\nLa planche à billets ! La banque centrale crée de l'argent pour stimuler l'économie."
  },
  {
    term: "Hedge fund",
    definition: "Fonds d'investissement utilisant des stratégies sophistiquées pour obtenir des rendements absolus.\nLes fonds des riches et des pros. Stratégies complexes, risques élevés, gains potentiels importants."
  },
  {
    term: "Private equity",
    definition: "Investissement dans des entreprises non cotées en bourse.\nAcheter des parts d'entreprises pas encore en bourse. Risqué mais potentiellement très rentable !"
  },
  {
    term: "Yield",
    definition: "Rendement d'un investissement, souvent exprimé en pourcentage annuel.\nCe que ton investissement te rapporte chaque année. Le mot anglais pour rendement !"
  }
];

async function main() {
  console.log("🔤 Début du seeding du dictionnaire financier...");

  // Vérifier combien d'entrées existent déjà
  const existingCount = await prisma.dicoEntry.count();
  console.log(`📊 Entrées existantes dans la base : ${existingCount}`);

  if (existingCount >= DICO_ENTRIES.length) {
    console.log("✅ Le dictionnaire est déjà complet. Aucune insertion nécessaire.");
    return;
  }

  // Récupérer les termes existants
  const existingTerms = await prisma.dicoEntry.findMany({
    select: { term: true }
  });
  const existingTermsSet = new Set(existingTerms.map(e => e.term.toLowerCase()));

  // Filtrer les entrées qui n'existent pas encore
  const newEntries = DICO_ENTRIES.filter(
    entry => !existingTermsSet.has(entry.term.toLowerCase())
  );

  if (newEntries.length === 0) {
    console.log("✅ Toutes les entrées existent déjà. Aucune insertion nécessaire.");
    return;
  }

  console.log(`📝 Insertion de ${newEntries.length} nouvelles entrées...`);

  // Insérer les nouvelles entrées
  const result = await prisma.dicoEntry.createMany({
    data: newEntries,
    skipDuplicates: true, // Sécurité supplémentaire pour éviter les doublons
  });

  console.log(`✅ ${result.count} entrées insérées avec succès !`);

  // Afficher le total final
  const finalCount = await prisma.dicoEntry.count();
  console.log(`📚 Total des entrées dans le dictionnaire : ${finalCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seeding du dictionnaire :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
