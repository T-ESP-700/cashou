import React, { useState, useMemo } from 'react';
import { Search, Filter, X, Edit, Ban, Plus, Trophy, Target, Clock } from 'lucide-react';
import { trpc } from '../utils/trpc';
import cashewImage from '../cashew.png';

interface Filters {
  levelId: number | null;
  minPoints: number | null;
  maxPoints: number | null;
  showActiveOnly: boolean;
}

interface UserDetailModalProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ userId, isOpen, onClose }) => {
  const [showAddPointsForm, setShowAddPointsForm] = useState(false);
  const [pointsToAdd, setPointsToAdd] = useState('');

  // Fetch user details
  const { data: user, isLoading: userLoading } = trpc.user.getById.useQuery(
    { id: userId! },
    { enabled: !!userId && isOpen }
  );

  // Fetch user quizzes
  const { data: userQuizzes, isLoading: quizzesLoading } = trpc.userQuiz.getByUser.useQuery(
    { userId: userId! },
    { enabled: !!userId && isOpen }
  );

  // Fetch user answers stats
  const { data: answerStats } = trpc.userAnswer.getByUser.useQuery(
    { userId: userId! },
    { enabled: !!userId && isOpen }
  );

  // Mutations
  const addPointsMutation = trpc.user.addPoints.useMutation({
    onSuccess: () => {
      setShowAddPointsForm(false);
      setPointsToAdd('');
      // Refetch user data
    },
  });

  const utils = trpc.useUtils();

  const handleAddPoints = () => {
    if (userId && pointsToAdd) {
      addPointsMutation.mutate(
        { id: userId, points: parseInt(pointsToAdd) },
        {
          onSuccess: () => {
            utils.user.getById.invalidate({ id: userId });
            setShowAddPointsForm(false);
            setPointsToAdd('');
          },
        }
      );
    }
  };

  const correctAnswers = answerStats?.filter(a => a.accurate).length || 0;
  const totalAnswers = answerStats?.length || 0;
  const successRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  if (!isOpen || !userId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Détails de l'utilisateur
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {userLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Chargement...</p>
            </div>
          ) : user ? (
            <div className="space-y-6">
              {/* User Info */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                      <img src={cashewImage} alt="User" className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{user.username || 'N/A'}</h3>
                      <p className="text-gray-600">{user.email || 'N/A'}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Inscrit le {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{user.points || 0} pts</div>
                    <div className="text-sm text-gray-600">Niveau {user.levelId || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-sm text-gray-600">Quiz complétés</p>
                      <p className="text-2xl font-bold">{userQuizzes?.length || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Target className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-600">Taux de réussite</p>
                      <p className="text-2xl font-bold">{successRate}%</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Dernière activité</p>
                      <p className="text-sm font-medium">
                        {user.lastActivity
                          ? new Date(user.lastActivity).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Jamais'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Quizzes */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Quiz récents</h4>
                {quizzesLoading ? (
                  <p className="text-gray-600">Chargement...</p>
                ) : userQuizzes && userQuizzes.length > 0 ? (
                  <div className="space-y-2">
                    {userQuizzes.slice(0, 5).map((uq) => (
                      <div
                        key={uq.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            Quiz #{uq.quizId || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {uq.completedAt
                              ? new Date(uq.completedAt).toLocaleDateString('fr-FR')
                              : 'En cours'}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          uq.isCorrect === true
                            ? 'bg-green-100 text-green-800'
                            : uq.isCorrect === false
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {uq.isCorrect === true
                            ? 'Réussi'
                            : uq.isCorrect === false
                            ? 'Échoué'
                            : 'En cours'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">Aucun quiz complété</p>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Actions</h4>
                <div className="flex flex-wrap gap-3">
                  {!showAddPointsForm ? (
                    <>
                      <button
                        onClick={() => setShowAddPointsForm(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Ajouter des points</span>
                      </button>
                      <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        <Edit className="h-4 w-4" />
                        <span>Modifier</span>
                      </button>
                      <button className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                        <Ban className="h-4 w-4" />
                        <span>Suspendre</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center space-x-2 w-full">
                      <input
                        type="number"
                        placeholder="Points à ajouter"
                        value={pointsToAdd}
                        onChange={(e) => setPointsToAdd(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleAddPoints}
                        disabled={addPointsMutation.isPending || !pointsToAdd}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {addPointsMutation.isPending ? 'Ajout...' : 'Confirmer'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddPointsForm(false);
                          setPointsToAdd('');
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Utilisateur non trouvé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Users: React.FC = () => {
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({
    levelId: null,
    minPoints: null,
    maxPoints: null,
    showActiveOnly: false,
  });

  // Fetch data from API
  const { data: users, isLoading, error } = trpc.user.getAll.useQuery();
  const { data: levels } = trpc.level.getAll.useQuery();

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    let filtered = [...users];

    // Search filter (username or email)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.username?.toLowerCase().includes(search) ||
          user.email?.toLowerCase().includes(search)
      );
    }

    // Level filter
    if (filters.levelId !== null) {
      filtered = filtered.filter((user) => user.levelId === filters.levelId);
    }

    // Points filter
    if (filters.minPoints !== null) {
      filtered = filtered.filter(
        (user) => (user.points || 0) >= filters.minPoints!
      );
    }
    if (filters.maxPoints !== null) {
      filtered = filtered.filter(
        (user) => (user.points || 0) <= filters.maxPoints!
      );
    }

    // Active users filter (last 7 days)
    if (filters.showActiveOnly) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(
        (user) =>
          user.lastActivity && new Date(user.lastActivity) >= sevenDaysAgo
      );
    }

    return filtered;
  }, [users, searchTerm, filters]);

  // Reset filters
  const resetFilters = () => {
    setFilters({
      levelId: null,
      minPoints: null,
      maxPoints: null,
      showActiveOnly: false,
    });
    setSearchTerm('');
  };

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.levelId !== null ||
      filters.minPoints !== null ||
      filters.maxPoints !== null ||
      filters.showActiveOnly ||
      searchTerm.trim() !== ''
    );
  }, [filters, searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600 mt-2">
            Consultez et gérez tous les utilisateurs du jeu
          </p>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom d'utilisateur ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
              <Filter className="h-5 w-5" />
              <span>Filtres</span>
                {hasActiveFilters && (
                  <span className="ml-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {Object.values(filters).filter((v) => v !== null && v !== false).length + (searchTerm ? 1 : 0)}
                  </span>
                )}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                  <span>Réinitialiser</span>
            </button>
              )}
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Level filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Niveau
                  </label>
                  <select
                    value={filters.levelId || ''}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        levelId: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tous les niveaux</option>
                    {levels?.map((level) => (
                      <option key={level.id} value={level.id}>
                        Niveau {level.id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Min points filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points minimum
                  </label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPoints || ''}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        minPoints: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Max points filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points maximum
                  </label>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPoints || ''}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        maxPoints: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Active users filter */}
                <div className="flex items-end">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showActiveOnly}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          showActiveOnly: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Actifs (7 derniers jours)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results count */}
        {!isLoading && users && (
          <div className="mb-4 text-sm text-gray-600">
            {filteredUsers.length === users.length ? (
              <span>{users.length} utilisateur{users.length > 1 ? 's' : ''} au total</span>
            ) : (
              <span>
                {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''} sur {users.length}
              </span>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">Chargement des utilisateurs...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-md p-6 mb-6">
            <p className="text-red-800">Erreur lors du chargement des utilisateurs: {error.message}</p>
          </div>
        )}

        {/* Tableau des utilisateurs */}
        {!isLoading && filteredUsers && filteredUsers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Niveau
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière Activité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                              <img src={cashewImage} alt="User" className="h-full w-full object-cover" />
                            </div>
                        </div>
                        <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.username || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{user.email || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Niveau {user.levelId || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.points?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastActivity
                          ? new Date(user.lastActivity).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Jamais'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedUserId(user.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                        Voir
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        Suspendre
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredUsers && filteredUsers.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">
              {hasActiveFilters
                ? "Aucun utilisateur ne correspond aux critères de recherche."
                : "Aucun utilisateur trouvé."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-4 text-blue-600 hover:text-blue-800 underline"
              >
                Réinitialiser les filtres
              </button>
            )}
        </div>
        )}
      </div>

      {/* User Detail Modal */}
      <UserDetailModal
        userId={selectedUserId}
        isOpen={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
};

export default Users;
