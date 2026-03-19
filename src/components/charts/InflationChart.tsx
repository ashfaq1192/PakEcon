import React, { useState, useEffect } from 'react';
import { BarChart } from './BarChart';

// Pakistan CPI (Consumer Price Index) data 2015-2026
// Source: Pakistan Bureau of Statistics (approximate historical data)
const inflationData = [
  { year: '2015', cpi: 2.85, category: 'Low' },
  { year: '2016', cpi: 3.78, category: 'Low' },
  { year: '2017', cpi: 4.16, category: 'Low' },
  { year: '2018', cpi: 3.93, category: 'Low' },
  { year: '2019', cpi: 10.58, category: 'Moderate' },
  { year: '2020', cpi: 10.74, category: 'Moderate' },
  { year: '2021', cpi: 9.97, category: 'Moderate' },
  { year: '2022', cpi: 12.13, category: 'High' },
  { year: '2023', cpi: 29.18, category: 'Very High' },
  { year: '2024', cpi: 23.40, category: 'Very High' },
  { year: '2025', cpi: 18.70, category: 'High' },
  { year: '2026', cpi: 8.50, category: 'Moderate' }, // Projected
];

function getBarColor(cpi: number, index: number) {
  if (cpi >= 20) return '#ef4444'; // red - very high
  if (cpi >= 12) return '#f97316'; // orange - high
  if (cpi >= 8) return '#f59e0b'; // amber - moderate
  return '#22c55e'; // green - low
}

export function InflationChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setData(inflationData);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  const latestInflation = data[data.length - 1];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Pakistan Inflation Trend (2015-2026)
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Annual CPI Change % - Source: PBS
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: getBarColor(latestInflation?.cpi || 0, 0) }}>
            {latestInflation?.cpi.toFixed(2)}%
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {latestInflation?.year}
          </p>
        </div>
      </div>
      <BarChart
        data={data}
        bars={[
          {
            dataKey: 'cpi',
            name: 'CPI %',
            colorFn: getBarColor,
          },
        ]}
        xKey="year"
        height={250}
        showGrid={true}
        showTooltip={true}
        className="w-full"
      />
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} />
          <span>Low (&lt;8%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }} />
          <span>Moderate (8-12%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }} />
          <span>High (12-20%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
          <span>Very High (&gt;20%)</span>
        </div>
      </div>
    </div>
  );
}

export default InflationChart;
