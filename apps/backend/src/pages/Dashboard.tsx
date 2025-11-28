import { Users, Trophy, Brain, TrendingUp } from 'lucide-react';

const stats = [
  {
    name: 'Total Users',
    value: '1,234',
    icon: Users,
    change: '+12.5%',
    changeType: 'positive' as const,
  },
  {
    name: 'Active Levels',
    value: '24',
    icon: Trophy,
    change: '+3',
    changeType: 'positive' as const,
  },
  {
    name: 'Quiz Completed',
    value: '5,678',
    icon: Brain,
    change: '+18.2%',
    changeType: 'positive' as const,
  },
  {
    name: 'Total Assets',
    value: '156',
    icon: TrendingUp,
    change: '+8',
    changeType: 'positive' as const,
  },
];

export default function Dashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to Cashou Backoffice</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p
                    className={`text-sm mt-2 ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {stat.change}
                  </p>
                </div>
                <div className="p-4 bg-primary-50 rounded-lg">
                  <Icon className="text-primary-600" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="font-medium">User registered</p>
                  <p className="text-sm text-gray-600">john.doe@example.com</p>
                </div>
                <span className="text-sm text-gray-500">2 min ago</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Popular Levels</h2>
          <div className="space-y-4">
            {[
              { name: 'Level 1: Introduction', plays: 234 },
              { name: 'Level 2: Basic Trading', plays: 189 },
              { name: 'Level 3: Market Analysis', plays: 156 },
              { name: 'Level 4: Portfolio Management', plays: 123 },
              { name: 'Level 5: Advanced Strategies', plays: 98 },
            ].map((level, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="font-medium">{level.name}</p>
                  <p className="text-sm text-gray-600">{level.plays} plays</p>
                </div>
                <Trophy className="text-primary-600" size={20} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

