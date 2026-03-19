import React, { useState, useEffect } from 'react';
import { LineChart } from './LineChart';

export function GoldPriceChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate sample gold price data for the last 6 months
    const generateData = () => {
      const now = new Date();
      const data: any[] = [];
      let gold24k = 230000; // Starting price per tola

      for (let i = 180; i >= 0; i -= 10) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Simulate realistic gold price fluctuations
        const change = (Math.random() - 0.48) * 5000; // Slight upward bias
        gold24k = Math.round((gold24k + change) / 100) * 100;

        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          gold24k: gold24k,
          gold22k: Math.round((gold24k * 22) / 24 / 100) * 100, // 22k gold
        });
      }
      return data;
    };

    setTimeout(() => {
      setData(generateData());
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

  const latestPrice = data[data.length - 1];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Gold Price History (6 Months)
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Per Tola - 24K & 22K
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            PKR {latestPrice?.gold24k.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            24K Gold
          </p>
        </div>
      </div>
      <LineChart
        data={data}
        lines={[
          { dataKey: 'gold24k', name: '24K Gold', color: '#f59e0b', strokeWidth: 2 },
          { dataKey: 'gold22k', name: '22K Gold', color: '#d97706', strokeWidth: 2 },
        ]}
        xKey="date"
        height={250}
        showGrid={true}
        showTooltip={true}
        showLegend={true}
        className="w-full"
      />
    </div>
  );
}

export default GoldPriceChart;
