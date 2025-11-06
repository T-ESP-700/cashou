import React from 'react';
import { 
  Users, 
  Gamepad2, 
  TrendingUp, 
  DollarSign, 
  Trophy, 
  Clock,
  Target,
  BarChart3
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import ChartCard from '../components/ChartCard';

const Dashboard: React.FC = () => {
  // Données simulées - dans une vraie app, ces données viendraient de l'API
  const metrics = {
    totalUsers: 1247,
    activeGameInstances: 89,
    totalTransactions: 3456,
    totalRevenue: 125430,
    averageLevel: 3.2,
    quizCompletionRate: 78,
    averageSessionTime: 24,
    totalLevels: 12
  };

  const recentActivity = [
    { id: 1, user: 'Alice', action: 'Nouveau niveau débloqué', time: '2 min' },
    { id: 2, user: 'Bob', action: 'Transaction réalisée', time: '5 min' },
    { id: 3, user: 'Charlie', action: 'Quiz complété', time: '8 min' },
    { id: 4, user: 'Diana', action: 'Nouvelle instance créée', time: '12 min' },
  ];

  const topPerformers = [
    { rank: 1, username: 'Alice', level: 5, points: 1250 },
    { rank: 2, username: 'Bob', level: 4, points: 980 },
    { rank: 3, username: 'Charlie', level: 4, points: 920 },
    { rank: 4, username: 'Diana', level: 3, points: 850 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Jeu</h1>
          <p className="text-gray-600 mt-2">
            Vue d'ensemble des métriques et performances du jeu Cashou
          </p>
        </div>

        {/* Métriques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Utilisateurs Totaux"
            value={metrics.totalUsers.toLocaleString()}
            icon={Users}
            change={{ value: 12, isPositive: true }}
            description="Joueurs inscrits"
          />
          <MetricCard
            title="Instances Actives"
            value={metrics.activeGameInstances}
            icon={Gamepad2}
            change={{ value: 8, isPositive: true }}
            description="Parties en cours"
          />
          <MetricCard
            title="Transactions Totales"
            value={metrics.totalTransactions.toLocaleString()}
            icon={TrendingUp}
            change={{ value: 15, isPositive: true }}
            description="Opérations financières"
          />
          <MetricCard
            title="Revenus Totaux"
            value={`${metrics.totalRevenue.toLocaleString()} €`}
            icon={DollarSign}
            change={{ value: 23, isPositive: true }}
            description="Chiffre d'affaires"
          />
        </div>

        {/* Métriques secondaires */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Niveau Moyen"
            value={metrics.averageLevel}
            icon={Trophy}
            change={{ value: 5, isPositive: true }}
            description="Progression moyenne"
          />
          <MetricCard
            title="Taux de Réussite Quiz"
            value={`${metrics.quizCompletionRate}%`}
            icon={Target}
            change={{ value: 3, isPositive: true }}
            description="Quiz complétés"
          />
          <MetricCard
            title="Temps de Session Moyen"
            value={`${metrics.averageSessionTime} min`}
            icon={Clock}
            change={{ value: -2, isPositive: false }}
            description="Engagement utilisateur"
          />
          <MetricCard
            title="Niveaux Disponibles"
            value={metrics.totalLevels}
            icon={BarChart3}
            description="Contenu débloqué"
          />
        </div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Activité récente */}
          <ChartCard title="Activité Récente">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{activity.user}</p>
                    <p className="text-sm text-gray-600">{activity.action}</p>
                  </div>
                  <span className="text-sm text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Top Performers */}
          <ChartCard title="Top Performers">
            <div className="space-y-4">
              {topPerformers.map((performer) => (
                <div key={performer.rank} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      performer.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                      performer.rank === 2 ? 'bg-gray-100 text-gray-800' :
                      performer.rank === 3 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {performer.rank}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{performer.username}</p>
                      <p className="text-sm text-gray-600">Niveau {performer.level}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{performer.points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Graphiques de performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <ChartCard title="Évolution des Utilisateurs (7 derniers jours)">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Graphique d'évolution</p>
                <p className="text-sm text-gray-400">Données simulées</p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Répartition par Niveau">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Graphique de répartition</p>
                <p className="text-sm text-gray-400">Données simulées</p>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

