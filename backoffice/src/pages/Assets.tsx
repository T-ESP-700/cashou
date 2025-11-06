import { Plus, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { trpc } from '../utils/trpc';
import { useMemo } from 'react';

export default function Assets() {
  // Fetch assets from API
  const { data: assets, isLoading, error, refetch } = trpc.asset.getAll.useQuery();

  // Delete mutation
  const deleteAsset = trpc.asset.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      deleteAsset.mutate({ id });
    }
  };

  // Calculate current value and change from asset histories
  const assetsWithStats = useMemo(() => {
    if (!assets) return [];

    return assets.map((asset: any) => {
      // Get the most recent history entry
      const histories = asset.assetHistories || [];
      const sortedHistories = [...histories].sort((a: any, b: any) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateB - dateA;
      });

      const currentHistory = sortedHistories[0];
      const previousHistory = sortedHistories[1];

      const currentValue = currentHistory?.value ? currentHistory.value / 100 : 0; // Assuming value is stored in cents
      const previousValue = previousHistory?.value ? previousHistory.value / 100 : currentValue;
      const change = currentValue !== 0 && previousValue !== 0
        ? ((currentValue - previousValue) / previousValue) * 100
        : 0;
      const volume = currentHistory?.volume || 0;

      return {
        ...asset,
        currentValue,
        change,
        volume,
        market: asset.market?.title || 'N/A',
        submarket: asset.submarket?.title || 'N/A',
      };
    });
  }, [assets]);

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

      {/* Loading state */}
      {isLoading && (
        <div className="card p-8 text-center">
          <p className="text-gray-600">Loading assets...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg shadow-md p-6 mb-6">
          <p className="text-red-800">Error loading assets: {error.message}</p>
        </div>
      )}

      {/* Assets Table */}
      {!isLoading && assetsWithStats && assetsWithStats.length > 0 && (
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
                {assetsWithStats.map((asset) => (
                  <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-bold text-primary-600">{asset.symbol || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-4 font-medium">{asset.title || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {asset.field || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{asset.market}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{asset.submarket}</td>
                    <td className="py-3 px-4 font-semibold">
                      ${asset.currentValue.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <div className={`flex items-center gap-1 ${asset.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {asset.change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span className="font-semibold">{Math.abs(asset.change).toFixed(2)}%</span>
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
                        <button
                          onClick={() => handleDelete(asset.id)}
                          disabled={deleteAsset.isPending}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
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
      )}

      {/* Empty state */}
      {!isLoading && assetsWithStats && assetsWithStats.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-gray-600">No assets found.</p>
        </div>
      )}
    </div>
  );
}
