import { Plus, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

export default function Assets() {
  // Mock data
  const assets = [
    {
      id: 1,
      symbol: 'AAPL',
      title: 'Apple Inc.',
      field: 'Technology',
      market: 'Stock Market',
      submarket: 'Tech Stocks',
      currentValue: 175.43,
      change: 2.5,
      volume: 54320000,
    },
    {
      id: 2,
      symbol: 'GOOGL',
      title: 'Alphabet Inc.',
      field: 'Technology',
      market: 'Stock Market',
      submarket: 'Tech Stocks',
      currentValue: 138.21,
      change: 1.8,
      volume: 32450000,
    },
    {
      id: 3,
      symbol: 'BTC',
      title: 'Bitcoin',
      field: 'Cryptocurrency',
      market: 'Crypto Market',
      submarket: 'Major Coins',
      currentValue: 43500.00,
      change: -1.2,
      volume: 28900000000,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-600 mt-2">Manage tradable assets and their data</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus size={20} />
          Add Asset
        </button>
      </div>

      {/* Assets Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Symbol</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Field</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Market</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Submarket</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Value</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Change</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Volume</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="font-bold text-primary-600">{asset.symbol}</span>
                  </td>
                  <td className="py-3 px-4 font-medium">{asset.title}</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {asset.field}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{asset.market}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{asset.submarket}</td>
                  <td className="py-3 px-4 font-semibold">${asset.currentValue.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <div className={`flex items-center gap-1 ${asset.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {asset.change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      <span className="font-semibold">{Math.abs(asset.change)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {asset.volume.toLocaleString()}
                  </td>
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
      </div>
    </div>
  );
}

