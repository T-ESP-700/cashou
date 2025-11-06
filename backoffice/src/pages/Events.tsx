import { Plus, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { trpc } from '../utils/trpc';

export default function Events() {
  // Fetch events from API
  const { data: events, isLoading, error, refetch } = trpc.event.getAll.useQuery();

  // Delete mutation
  const deleteEvent = trpc.event.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteEvent.mutate({ id });
    }
  };

  // Count affected assets for each event
  const getAffectedAssetsCount = (event: typeof events extends (infer T)[] ? T : never) => {
    return event?.eventAssets?.length || 0;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-2">Manage market events and their impacts</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus size={20} />
          Create Event
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="card p-8 text-center">
          <p className="text-gray-600">Loading events...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg shadow-md p-6 mb-6">
          <p className="text-red-800">Error loading events: {error.message}</p>
        </div>
      )}

      {/* Events Grid */}
      {events && events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{event.title || 'Untitled Event'}</h3>
                  <p className="text-sm text-gray-600">{event.description || 'No description'}</p>
                </div>
                <div>
                  {event.hasImpact ? (
                    <AlertCircle className="text-orange-600" size={24} />
                  ) : (
                    <CheckCircle className="text-green-600" size={24} />
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Has Impact</span>
                  <span className={`font-medium ${event.hasImpact ? 'text-orange-600' : 'text-green-600'}`}>
                    {event.hasImpact ? 'Yes' : 'No'}
                  </span>
                </div>
                {event.hasImpact && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Affected Assets</span>
                    <span className="font-medium">{getAffectedAssetsCount(event)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Created</span>
                  <span className="font-medium">
                    {event.createdAt
                      ? new Date(event.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button className="flex-1 btn btn-secondary flex items-center justify-center gap-2">
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  disabled={deleteEvent.isPending}
                  className="flex-1 btn bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  {deleteEvent.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {events && events.length === 0 && !isLoading && (
        <div className="card p-8 text-center">
          <p className="text-gray-600">No events found.</p>
        </div>
      )}
    </div>
  );
}
