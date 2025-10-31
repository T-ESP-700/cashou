import { Search, Plus, Edit, Trash2, Mail } from 'lucide-react';
import { useState } from 'react';

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - will be replaced with API calls
  const users = [
    {
      id: 1,
      username: 'john_doe',
      email: 'john@example.com',
      level: 'Level 3',
      points: 1250,
      badges: 'Beginner, Trader',
      lastActivity: '2024-10-30',
    },
    {
      id: 2,
      username: 'jane_smith',
      email: 'jane@example.com',
      level: 'Level 5',
      points: 3420,
      badges: 'Expert, Analyst',
      lastActivity: '2024-10-31',
    },
    {
      id: 3,
      username: 'mike_wilson',
      email: 'mike@example.com',
      level: 'Level 2',
      points: 850,
      badges: 'Beginner',
      lastActivity: '2024-10-29',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-2">Manage user accounts and permissions</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus size={20} />
          Add User
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="input w-48">
            <option>All Levels</option>
            <option>Level 1</option>
            <option>Level 2</option>
            <option>Level 3</option>
            <option>Level 4</option>
            <option>Level 5</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Username</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Level</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Points</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Badges</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Activity</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{user.username}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" />
                      {user.email}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                      {user.level}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold">{user.points.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.badges}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.lastActivity}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">Showing 1 to 3 of 3 users</p>
          <div className="flex gap-2">
            <button className="btn btn-secondary">Previous</button>
            <button className="btn btn-primary">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

