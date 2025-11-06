import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  description,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-primary-50 rounded-lg">
          <Icon className="h-6 w-6 text-primary-600" />
        </div>
        {change && (
          <div className={`flex items-center text-sm font-medium ${
            change.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <span>{change.isPositive ? '↑' : '↓'}</span>
            <span className="ml-1">{Math.abs(change.value)}%</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
        <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
