import React, { useMemo } from 'react';
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
import MetricCard from '../components/MetricCard.tsx';
import ChartCard from '../components/ChartCard.tsx';
import { trpc } from '../utils/trpc';

const Dashboard: React.FC = () => {
  // Fetch all data from API
  const { data: users, isLoading: usersLoading } = trpc.user.getAll.useQuery();
  const { data: levels, isLoading: levelsLoading } = trpc.level.getAll.useQuery();
  const { data: quizzes, isLoading: quizzesLoading } = trpc.quiz.getAll.useQuery();
  const { data: userQuizzes, isLoading: userQuizzesLoading } = trpc.userQuiz.getAll.useQuery();
  const { data: topUsers, isLoading: topUsersLoading } = trpc.user.getTopUsers.useQuery({ limit: 4 });

  // Calculate metrics from data
  const metrics = useMemo(() => {
    const totalUsers = users?.length || 0;
    const totalLevels = levels?.length || 0;
    const totalQuizzes = quizzes?.length || 0;
    const totalUserQuizzes = userQuizzes?.length || 0;

    // Calculate average level
    const usersWithLevels = users?.filter(u => u.levelId) || [];
    const averageLevel = usersWithLevels.length > 0
      ? usersWithLevels.reduce((sum, u) => sum + (u.levelId || 0), 0) / usersWithLevels.length
      : 0;

    // Calculate quiz completion rate
    const completedQuizzes = userQuizzes?.filter(uq => uq.isCorrect !== null) || [];
    const quizCompletionRate = totalQuizzes > 0
      ? Math.round((completedQuizzes.length / totalQuizzes) * 100)
      : 0;

    // Calculate average points
    const usersWithPoints = users?.filter(u => u.points) || [];
    const averagePoints = usersWithPoints.length > 0
      ? usersWithPoints.reduce((sum, u) => sum + (u.points || 0), 0) / usersWithPoints.length
      : 0;

    // Count active users (users with recent activity in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = users?.filter(u =>
      u.lastActivity && new Date(u.lastActivity) >= sevenDaysAgo
    ).length || 0;

    return {
      totalUsers,
      activeGameInstances: activeUsers, // Using active users as proxy
      totalTransactions: totalUserQuizzes, // Using quiz completions as proxy
      totalRevenue: Math.round(averagePoints * totalUsers * 0.1), // Estimated revenue
      averageLevel: Math.round(averageLevel * 10) / 10,
      quizCompletionRate,
      averageSessionTime: 24, // This would need a specific endpoint
      totalLevels
    };
  }, [users, levels, quizzes, userQuizzes]);

  // Format recent activity from user quizzes
  const recentActivity = useMemo(() => {
    if (!userQuizzes || userQuizzes.length === 0) return [];

    const recent = userQuizzes
      .filter(uq => uq.completedAt)
      .sort((a, b) => {
        const dateA = new Date(a.completedAt!).getTime();
        const dateB = new Date(b.completedAt!).getTime();
        return dateB - dateA;
      })
      .slice(0, 4)
      .map((uq, index) => {
        const user = users?.find(u => u.id === uq.userId);
        const completedAt = uq.completedAt ? new Date(uq.completedAt) : new Date();
        const minutesAgo = Math.floor((Date.now() - completedAt.getTime()) / 60000);

        return {
          id: uq.id || index,
          user: user?.username || 'Utilisateur',
          action: uq.isCorrect ? 'Quiz complété avec succès' : 'Quiz complété',
          time: minutesAgo < 60
            ? `${minutesAgo} min`
            : `${Math.floor(minutesAgo / 60)}h`
        };
      });

    return recent;
  }, [userQuizzes, users]);

  // Format top performers from top users
  const topPerformers = useMemo(() => {
    if (!topUsers || topUsers.length === 0) return [];

    return topUsers.slice(0, 4).map((user, index) => ({
      rank: index + 1,
      username: user.username || 'N/A',
      level: user.levelId || 0,
      points: user.points || 0
    }));
  }, [topUsers]);

  const isLoading = usersLoading || levelsLoading || quizzesLoading || userQuizzesLoading || topUsersLoading;

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

        {/* Loading state */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center mb-8">
            <p className="text-gray-600">Chargement des données...</p>
          </div>
        )}

        {/* Métriques principales */}
        {!isLoading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Utilisateurs Totaux"
                value={metrics.totalUsers.toLocaleString()}
                icon={Users}
                change={{ value: 12, isPositive: true }}
                description="Joueurs inscrits"
              />
              <MetricCard
                title="Utilisateurs Actifs"
                value={metrics.activeGameInstances}
                icon={Gamepad2}
                change={{ value: 8, isPositive: true }}
                description="Actifs cette semaine"
              />
              <MetricCard
                title="Quiz Complétés"
                value={metrics.totalTransactions.toLocaleString()}
                icon={TrendingUp}
                change={{ value: 15, isPositive: true }}
                description="Total des quiz"
              />
              <MetricCard
                title="Points Totaux"
                value={`${metrics.totalRevenue.toLocaleString()}`}
                icon={DollarSign}
                change={{ value: 23, isPositive: true }}
                description="Points accumulés"
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
                {recentActivity.length > 0 ? (
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
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Aucune activité récente</p>
                  </div>
                )}
              </ChartCard>

              {/* Top Performers */}
              <ChartCard title="Top Performers">
                {topPerformers.length > 0 ? (
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
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Aucun performer disponible</p>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Graphiques de performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <ChartCard title="Répartition par Niveau">
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Graphique de répartition</p>
                    <p className="text-sm text-gray-400">
                      {users && users.length > 0
                        ? `${users.length} utilisateurs répartis sur ${metrics.totalLevels} niveaux`
                        : 'Aucune donnée disponible'}
                    </p>
                  </div>
                </div>
              </ChartCard>

              <ChartCard title="Statistiques Quiz">
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Statistiques des quiz</p>
                    <div className="mt-4 space-y-2 text-sm">
                      <p className="text-gray-600">Total quiz: {metrics.totalTransactions}</p>
                      <p className="text-gray-600">Taux de réussite: {metrics.quizCompletionRate}%</p>
                      <p className="text-gray-600">Quiz disponibles: {quizzes?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
