import { Plus, Edit, Trash2, Clock, Target } from 'lucide-react';

export default function Levels() {
  // Mock data
  const levels = [
    {
      id: 1,
      number: 1,
      title: 'Introduction to Finance',
      duration: 30,
      speed: 1,
      startBalance: 10000,
      pointsRequired: 100,
      description: 'Learn the basics of financial markets',
    },
    {
      id: 2,
      number: 2,
      title: 'Basic Trading',
      duration: 45,
      speed: 2,
      startBalance: 15000,
      pointsRequired: 250,
      description: 'Start making your first trades',
    },
    {
      id: 3,
      number: 3,
      title: 'Market Analysis',
      duration: 60,
      speed: 3,
      startBalance: 20000,
      pointsRequired: 500,
      description: 'Analyze market trends and patterns',
    },
  ];

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

      {/* Levels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {levels.map((level) => (
          <div key={level.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-lg flex items-center justify-center text-xl font-bold">
                  {level.number}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{level.title}</h3>
                  <p className="text-sm text-gray-600">{level.description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Clock size={16} />
                  Duration
                </span>
                <span className="font-medium">{level.duration} min</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Target size={16} />
                  Points Required
                </span>
                <span className="font-medium">{level.pointsRequired}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Start Balance</span>
                <span className="font-medium">${level.startBalance.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Speed</span>
                <span className="font-medium">x{level.speed}</span>
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

