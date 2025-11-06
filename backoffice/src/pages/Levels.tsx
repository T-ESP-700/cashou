import { Plus, Edit, Trash2, Clock, Target, X } from 'lucide-react';
import { trpc } from '../utils/trpc';
import { useState, useEffect } from 'react';

interface LevelEditModalProps {
  levelId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'info' | 'goals' | 'events';

const LevelEditModal: React.FC<LevelEditModalProps> = ({ levelId, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [formData, setFormData] = useState({
    title: '',
    number: '',
    duration: '',
    speed: '',
    startBalance: '',
    pointsRequired: '',
    description: '',
  });

  // Goal form state
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  const [goalFormData, setGoalFormData] = useState({ title: '', description: '' });

  // Event form state
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<number | null>(null);
  const [eventFormData, setEventFormData] = useState({ title: '', description: '', hasImpact: false });

  // Fetch level details
  const { data: level, isLoading: levelLoading } = trpc.level.getById.useQuery(
    { id: levelId! },
    { enabled: !!levelId && isOpen }
  );

  // Fetch level goals associations
  const { data: levelGoals, refetch: refetchLevelGoals } = trpc.levelGoal.getByLevelId.useQuery(
    { levelId: levelId! },
    { enabled: !!levelId && isOpen }
  );

  // Fetch level events associations
  const { data: levelEvents, refetch: refetchLevelEvents } = trpc.levelEvent.getByLevelId.useQuery(
    { levelId: levelId! },
    { enabled: !!levelId && isOpen }
  );

  // Fetch all goals and events for selection
  const { data: allGoals } = trpc.goal.getAll.useQuery(undefined, { enabled: activeTab === 'goals' });
  const { data: allEvents } = trpc.event.getAll.useQuery(undefined, { enabled: activeTab === 'events' });

  const utils = trpc.useUtils();

  // Update form data when level is loaded
  useEffect(() => {
    if (level) {
      setFormData({
        title: level.title || '',
        number: level.number?.toString() || '',
        duration: level.duration?.toString() || '',
        speed: level.speed?.toString() || '',
        startBalance: level.startBalance?.toString() || '',
        pointsRequired: level.pointsRequired?.toString() || '',
        description: level.description || '',
      });
    }
  }, [level]);

  // Mutations
  const updateLevel = trpc.level.update.useMutation({
    onSuccess: () => {
      utils.level.getAll.invalidate();
      utils.level.getById.invalidate({ id: levelId! });
    },
  });

  const deleteLevel = trpc.level.delete.useMutation({
    onSuccess: () => {
      utils.level.getAll.invalidate();
      onClose();
    },
  });

  // Goal mutations
  const createGoal = trpc.goal.create.useMutation({
    onSuccess: async (newGoal) => {
      if (levelId && newGoal.id) {
        await createLevelGoal.mutateAsync({ levelId, goalId: newGoal.id });
      }
      utils.goal.getAll.invalidate();
      refetchLevelGoals();
      setShowGoalForm(false);
      setGoalFormData({ title: '', description: '' });
    },
  });

  const updateGoal = trpc.goal.update.useMutation({
    onSuccess: () => {
      utils.goal.getAll.invalidate();
      refetchLevelGoals();
      setEditingGoal(null);
      setGoalFormData({ title: '', description: '' });
    },
  });


  const createLevelGoal = trpc.levelGoal.create.useMutation({
    onSuccess: () => {
      refetchLevelGoals();
    },
  });

  const deleteLevelGoal = trpc.levelGoal.delete.useMutation({
    onSuccess: () => {
      refetchLevelGoals();
    },
  });

  // Event mutations
  const createEvent = trpc.event.create.useMutation({
    onSuccess: async (newEvent) => {
      if (levelId && newEvent.id) {
        await createLevelEvent.mutateAsync({ levelId, eventId: newEvent.id });
      }
      utils.event.getAll.invalidate();
      refetchLevelEvents();
      setShowEventForm(false);
      setEventFormData({ title: '', description: '', hasImpact: false });
    },
  });

  const updateEvent = trpc.event.update.useMutation({
    onSuccess: () => {
      utils.event.getAll.invalidate();
      refetchLevelEvents();
      setEditingEvent(null);
      setEventFormData({ title: '', description: '', hasImpact: false });
    },
  });

  const createLevelEvent = trpc.levelEvent.create.useMutation({
    onSuccess: () => {
      refetchLevelEvents();
    },
  });

  const deleteLevelEvent = trpc.levelEvent.delete.useMutation({
    onSuccess: () => {
      refetchLevelEvents();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelId || !level) return;

    const updateData: any = {
      title: formData.title.trim() || null,
      number: formData.number ? parseInt(formData.number) : null,
      duration: formData.duration ? parseInt(formData.duration) : null,
      speed: formData.speed ? parseInt(formData.speed) : null,
      startBalance: formData.startBalance ? parseInt(formData.startBalance) : null,
      pointsRequired: formData.pointsRequired ? parseInt(formData.pointsRequired) : null,
      description: formData.description.trim() || null,
    };

    updateLevel.mutate({
      id: levelId,
      data: updateData,
    });
  };

  const handleDelete = () => {
    if (!levelId) return;
    if (confirm('Are you sure you want to delete this level? This action cannot be undone.')) {
      deleteLevel.mutate({ id: levelId });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Goal handlers
  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGoal) {
      updateGoal.mutate({
        id: editingGoal,
        data: {
          title: goalFormData.title || null,
          description: goalFormData.description || null,
        },
      });
    } else {
      createGoal.mutate({
        title: goalFormData.title || null,
        description: goalFormData.description || null,
      });
    }
  };

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal.id);
    setGoalFormData({
      title: goal.title || '',
      description: goal.description || '',
    });
    setShowGoalForm(true);
  };

  const handleDeleteGoal = (_goalId: number, levelGoalId: number | undefined) => {
    if (!levelGoalId) return;
    if (confirm('Remove this goal from the level?')) {
      deleteLevelGoal.mutate({ id: levelGoalId });
    }
  };

  const handleAssociateExistingGoal = (goalId: number) => {
    if (levelId) {
      createLevelGoal.mutate({ levelId, goalId });
    }
  };

  // Event handlers
  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      updateEvent.mutate({
        id: editingEvent,
        data: {
          title: eventFormData.title || null,
          description: eventFormData.description || null,
          hasImpact: eventFormData.hasImpact || null,
        },
      });
    } else {
      createEvent.mutate({
        title: eventFormData.title || null,
        description: eventFormData.description || null,
        hasImpact: eventFormData.hasImpact || null,
      });
    }
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event.id);
    setEventFormData({
      title: event.title || '',
      description: event.description || '',
      hasImpact: event.hasImpact || false,
    });
    setShowEventForm(true);
  };

  const handleDeleteEvent = (_eventId: number, levelEventId: number | undefined) => {
    if (!levelEventId) return;
    if (confirm('Remove this event from the level?')) {
      deleteLevelEvent.mutate({ id: levelEventId });
    }
  };

  const handleAssociateExistingEvent = (eventId: number) => {
    if (levelId) {
      createLevelEvent.mutate({ levelId, eventId });
    }
  };

  if (!isOpen || !levelId) return null;

  // Get goals and events from associations
  const associatedGoals = levelGoals?.map((lg: any) => lg.goal).filter(Boolean) || [];
  const associatedEvents = levelEvents?.map((le: any) => le.event).filter(Boolean) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Éditer le niveau
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'info'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Informations
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'goals'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Goals ({associatedGoals.length})
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'events'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Events ({associatedEvents.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {levelLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Chargement...</p>
            </div>
          ) : (
            <>
              {/* Info Tab */}
              {activeTab === 'info' && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Titre *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-2">
                        Numéro
                      </label>
                      <input
                        type="number"
                        id="number"
                        name="number"
                        value={formData.number}
                        onChange={handleChange}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                        Durée (minutes)
                      </label>
                      <input
                        type="number"
                        id="duration"
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="speed" className="block text-sm font-medium text-gray-700 mb-2">
                        Vitesse
                      </label>
                      <input
                        type="number"
                        id="speed"
                        name="speed"
                        value={formData.speed}
                        onChange={handleChange}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="pointsRequired" className="block text-sm font-medium text-gray-700 mb-2">
                        Points requis
                      </label>
                      <input
                        type="number"
                        id="pointsRequired"
                        name="pointsRequired"
                        value={formData.pointsRequired}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="startBalance" className="block text-sm font-medium text-gray-700 mb-2">
                      Balance de départ
                    </label>
                    <input
                      type="number"
                      id="startBalance"
                      name="startBalance"
                      value={formData.startBalance}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </form>
              )}

              {/* Goals Tab */}
              {activeTab === 'goals' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Goals associés</h3>
                    <button
                      onClick={() => {
                        setShowGoalForm(!showGoalForm);
                        setEditingGoal(null);
                        setGoalFormData({ title: '', description: '' });
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={16} />
                      {showGoalForm ? 'Annuler' : 'Nouveau Goal'}
                    </button>
                  </div>

                  {/* Goal Form */}
                  {showGoalForm && (
                    <form onSubmit={handleGoalSubmit} className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Titre</label>
                        <input
                          type="text"
                          value={goalFormData.title}
                          onChange={(e) => setGoalFormData({ ...goalFormData, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={goalFormData.description}
                          onChange={(e) => setGoalFormData({ ...goalFormData, description: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {editingGoal ? 'Modifier' : 'Créer'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowGoalForm(false);
                            setEditingGoal(null);
                            setGoalFormData({ title: '', description: '' });
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Associate existing goal */}
                  {!showGoalForm && allGoals && allGoals.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Associer un goal existant
                      </label>
                      <div className="flex gap-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssociateExistingGoal(parseInt(e.target.value));
                              e.target.value = '';
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Sélectionner un goal...</option>
                          {allGoals
                            .filter((g: any) => !associatedGoals.some((ag: any) => ag.id === g.id))
                            .map((goal: any) => (
                              <option key={goal.id} value={goal.id}>
                                {goal.title || `Goal #${goal.id}`}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Goals List */}
                  <div className="space-y-3">
                    {associatedGoals.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Aucun goal associé</p>
                    ) : (
                      associatedGoals.map((goal: any) => {
                        const levelGoal = levelGoals?.find((lg: any) => lg.goalId === goal.id);
                        return (
                          <div key={goal.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">{goal.title || 'Sans titre'}</h4>
                                <p className="text-sm text-gray-600">{goal.description || 'Pas de description'}</p>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => handleEditGoal(goal)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteGoal(goal.id, levelGoal?.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Events Tab */}
              {activeTab === 'events' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Events associés</h3>
                    <button
                      onClick={() => {
                        setShowEventForm(!showEventForm);
                        setEditingEvent(null);
                        setEventFormData({ title: '', description: '', hasImpact: false });
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={16} />
                      {showEventForm ? 'Annuler' : 'Nouvel Event'}
                    </button>
                  </div>

                  {/* Event Form */}
                  {showEventForm && (
                    <form onSubmit={handleEventSubmit} className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Titre</label>
                        <input
                          type="text"
                          value={eventFormData.title}
                          onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={eventFormData.description}
                          onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="hasImpact"
                          checked={eventFormData.hasImpact}
                          onChange={(e) => setEventFormData({ ...eventFormData, hasImpact: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="hasImpact" className="ml-2 text-sm font-medium text-gray-700">
                          A un impact
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {editingEvent ? 'Modifier' : 'Créer'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowEventForm(false);
                            setEditingEvent(null);
                            setEventFormData({ title: '', description: '', hasImpact: false });
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Associate existing event */}
                  {!showEventForm && allEvents && allEvents.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Associer un event existant
                      </label>
                      <div className="flex gap-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssociateExistingEvent(parseInt(e.target.value));
                              e.target.value = '';
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Sélectionner un event...</option>
                          {allEvents
                            .filter((e: any) => !associatedEvents.some((ae: any) => ae.id === e.id))
                            .map((event: any) => (
                              <option key={event.id} value={event.id}>
                                {event.title || `Event #${event.id}`}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Events List */}
                  <div className="space-y-3">
                    {associatedEvents.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Aucun event associé</p>
                    ) : (
                      associatedEvents.map((event: any) => {
                        const levelEvent = levelEvents?.find((le: any) => le.eventId === event.id);
                        return (
                          <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">{event.title || 'Sans titre'}</h4>
                                  {event.hasImpact && (
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                      Impact
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{event.description || 'Pas de description'}</p>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => handleEditEvent(event)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvent(event.id, levelEvent?.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
          <button
            onClick={handleDelete}
            disabled={deleteLevel.isPending}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
          >
            {deleteLevel.isPending ? 'Suppression...' : 'Supprimer le niveau'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Fermer
            </button>
            {activeTab === 'info' && (
              <button
                onClick={handleSubmit}
                disabled={updateLevel.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {updateLevel.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Levels() {
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch levels from API
  const { data: levels, isLoading, error, refetch } = trpc.level.getAll.useQuery();

  const utils = trpc.useUtils();

  // Delete mutation
  const deleteLevel = trpc.level.delete.useMutation({
    onSuccess: () => {
      utils.level.getAll.invalidate();
      refetch();
      setDeleteError(null);
    },
    onError: (error) => {
      let errorMessage = 'Failed to delete level';

      if (error.message.includes('Foreign key constraint')) {
        if (error.message.includes('level_goals')) {
          errorMessage = 'This level cannot be deleted because it has associated goals. Please remove the goals first.';
        } else if (error.message.includes('level_events')) {
          errorMessage = 'This level cannot be deleted because it has associated events. Please remove the events first.';
        } else if (error.message.includes('users')) {
          errorMessage = 'This level cannot be deleted because it has associated users. Please reassign users to another level first.';
        } else if (error.message.includes('quiz')) {
          errorMessage = 'This level cannot be deleted because it has associated quizzes. Please remove the quizzes first.';
        } else {
          errorMessage = 'This level cannot be deleted because it has associated data. Please remove all associations first.';
        }
      } else {
        errorMessage = error.message || 'Failed to delete level';
      }

      setDeleteError(errorMessage);
      console.error('Delete error:', error);
    },
  });

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this level?')) {
      setDeleteError(null);
      deleteLevel.mutate({ id });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Levels</h1>
          <p className="text-gray-600 mt-2">Manage game levels and progression</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus size={20} />
          Add Level
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="card p-8 text-center">
          <p className="text-gray-600">Loading levels...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg shadow-md p-6 mb-6">
          <p className="text-red-800">Error loading levels: {error.message}</p>
        </div>
      )}

      {/* Delete error state */}
      {deleteError && (
        <div className="bg-red-50 border border-red-200 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold mb-2">Cannot Delete Level</h3>
              <p className="text-red-700">{deleteError}</p>
            </div>
            <button
              onClick={() => setDeleteError(null)}
              className="ml-4 text-red-600 hover:text-red-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Levels Grid */}
      {!isLoading && levels && levels.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {levels.map((level) => (
          <div key={level.id} className="card hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="flex-1 flex flex-col">
              <div className="mb-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2" style={{ minHeight: '3.5rem' }}>{level.title || 'Untitled Level'}</h3>
                <p className="text-sm text-gray-600 line-clamp-2" style={{ minHeight: '2.5rem' }}>{level.description || 'No description'}</p>
            </div>

              <div className="space-y-3 mb-4 flex-1">
                {level.duration && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Clock size={16} />
                  Duration
                </span>
                <span className="font-medium">{level.duration} min</span>
              </div>
                )}
                {level.pointsRequired !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Target size={16} />
                  Points Required
                </span>
                <span className="font-medium">{level.pointsRequired}</span>
              </div>
                )}
                {level.startBalance !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Start Balance</span>
                <span className="font-medium">${level.startBalance.toLocaleString()}</span>
              </div>
                )}
                {level.speed && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Speed</span>
                <span className="font-medium">x{level.speed}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 mt-auto">
              <button
                onClick={() => setSelectedLevelId(level.id)}
                className="flex-1 btn btn-secondary flex items-center justify-center gap-2"
              >
                <Edit size={16} />
                Edit
              </button>
              <button
                onClick={() => handleDelete(level.id)}
                disabled={deleteLevel.isPending}
                className="flex-1 btn bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Empty state */}
      {!isLoading && levels && levels.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-gray-600">No levels found.</p>
        </div>
      )}

      {/* Edit Modal */}
      <LevelEditModal
        levelId={selectedLevelId}
        isOpen={!!selectedLevelId}
        onClose={() => setSelectedLevelId(null)}
      />
    </div>
  );
}
