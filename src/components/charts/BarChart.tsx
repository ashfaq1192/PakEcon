import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

interface BarChartProps {
  data: Array<{ [key: string]: any }>;
  bars: Array<{
    dataKey: string;
    name?: string;
    color?: string;
    colorFn?: (value: any, index: number) => string;
  }>;
  xKey: string;
  width?: number | string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  horizontal?: boolean;
  className?: string;
}

const defaultColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function BarChart({
  data,
  bars,
  xKey,
  width = '100%',
  height = 300,
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  horizontal = false,
  className = '',
}: BarChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {entry.name}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
            />
          )}
          <XAxis
            dataKey={xKey}
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
            className="dark:text-gray-400"
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
            className="dark:text-gray-400"
          />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && <Legend />}
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name || bar.dataKey}
              fill={bar.color || defaultColors[index % defaultColors.length]}
              radius={[4, 4, 0, 0]}
            >
              {bar.colorFn &&
                data.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={bar.colorFn!(entry[bar.dataKey], i)}
                  />
                ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BarChart;
