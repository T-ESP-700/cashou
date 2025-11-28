import { Play, Pause, Eye, Trash2 } from 'lucide-react';

export default function GameInstances() {
  // Mock data
  const instances = [
    {
      id: 1,
      type: 'Solo',
      user: 'john_doe',
      level: 'Level 3',
      startBalance: 20000,
      currentBalance: 25430,
      isPaused: false,
      actionRequired: false,
      createdAt: '2024-10-31 10:30',
    },
    {
      id: 2,
      type: 'Multiplayer',
      user: 'jane_smith',
      level: 'Level 5',
      startBalance: 30000,
      currentBalance: 28650,
      isPaused: true,
      actionRequired: true,
      createdAt: '2024-10-30 15:45',
    },
    {
      id: 3,
      type: 'Solo',
      user: 'mike_wilson',
      level: 'Level 2',
      startBalance: 15000,
      currentBalance: 17200,
      isPaused: false,
      actionRequired: false,
      createdAt: '2024-10-31 09:15',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Game Instances</h1>
        <p className="text-gray-600 mt-2">Monitor active and paused game sessions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-gray-600">Total Instances</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">3</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-2">2</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Paused</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">1</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Needs Action</p>
          <p className="text-3xl font-bold text-red-600 mt-2">1</p>
        </div>
      </div>

      {/* Instances Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Level</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Start Balance</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Current Balance</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {instances.map((instance) => {
                const profit = instance.currentBalance - instance.startBalance;
                const profitPercent = ((profit / instance.startBalance) * 100).toFixed(2);

                return (
                  <tr key={instance.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm">#{instance.id}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          instance.type === 'Solo'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {instance.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{instance.user}</td>
                    <td className="py-3 px-4">{instance.level}</td>
                    <td className="py-3 px-4">${instance.startBalance.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-semibold">${instance.currentBalance.toLocaleString()}</div>
                        <div
                          className={`text-xs ${
                            profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {profit >= 0 ? '+' : ''}{profitPercent}%
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {instance.isPaused ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                            Paused
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            Active
                          </span>
                        )}
                        {instance.actionRequired && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                            Action Required
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{instance.createdAt}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View">
                          <Eye size={16} className="text-gray-600" />
                        </button>
                        <button
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title={instance.isPaused ? 'Resume' : 'Pause'}
                        >
                          {instance.isPaused ? (
                            <Play size={16} className="text-blue-600" />
                          ) : (
                            <Pause size={16} className="text-blue-600" />
                          )}
                        </button>
                        <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

