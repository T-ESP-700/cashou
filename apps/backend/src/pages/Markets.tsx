import { Plus, Edit, Trash2, TrendingUp } from 'lucide-react';

export default function Markets() {
  // Mock data
  const markets = [
    {
      id: 1,
      name: 'Stock Market',
      description: 'Traditional equity markets',
      currentTrends: 'Bullish',
      dataSource: 'Yahoo Finance API',
      submarkets: 5,
      assets: 45,
    },
    {
      id: 2,
      name: 'Crypto Market',
      description: 'Cryptocurrency trading',
      currentTrends: 'Volatile',
      dataSource: 'CoinGecko API',
      submarkets: 3,
      assets: 28,
    },
    {
      id: 3,
      name: 'Commodities',
      description: 'Raw materials and resources',
      currentTrends: 'Stable',
      dataSource: 'Bloomberg API',
      submarkets: 4,
      assets: 23,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Markets</h1>
          <p className="text-gray-600 mt-2">Manage market categories and submarkets</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus size={20} />
          Add Market
        </button>
      </div>

      {/* Markets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {markets.map((market) => (
          <div key={market.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-xl mb-2">{market.name}</h3>
                <p className="text-sm text-gray-600">{market.description}</p>
              </div>
              <TrendingUp className="text-primary-600" size={24} />
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Current Trends</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    market.currentTrends === 'Bullish'
                      ? 'bg-green-100 text-green-700'
                      : market.currentTrends === 'Volatile'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {market.currentTrends}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Data Source</span>
                <span className="font-medium">{market.dataSource}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Submarkets</span>
                <span className="font-semibold text-primary-600">{market.submarkets}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Assets</span>
                <span className="font-semibold text-primary-600">{market.assets}</span>
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

