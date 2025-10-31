import { Plus, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

export default function Events() {
  // Mock data
  const events = [
    {
      id: 1,
      title: 'Market Crash',
      description: 'Sudden drop in market values',
      hasImpact: true,
      affectedAssets: 12,
      createdAt: '2024-10-15',
    },
    {
      id: 2,
      title: 'Tech Boom',
      description: 'Major tech companies announce innovations',
      hasImpact: true,
      affectedAssets: 8,
      createdAt: '2024-10-20',
    },
    {
      id: 3,
      title: 'Economic Report',
      description: 'Quarterly economic report release',
      hasImpact: false,
      affectedAssets: 0,
      createdAt: '2024-10-25',
    },
  ];

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

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div key={event.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                <p className="text-sm text-gray-600">{event.description}</p>
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
                  <span className="font-medium">{event.affectedAssets}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Created</span>
                <span className="font-medium">{event.createdAt}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button className="flex-1 btn btn-secondary flex items-center justify-center gap-2">
                <Edit size={16} />
                Edit
              </button>
              <button className="flex-1 btn bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center gap-2">
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

