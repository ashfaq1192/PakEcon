import React, { useState, useEffect } from 'react';
import { LineChart } from './LineChart';

export function PkrUsdTrendChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate sample 30-day PKR/USD trend data
    // In production, this would fetch from an API
    const generateData = () => {
      const now = new Date();
      const data: any[] = [];
      let rate = 278.5; // Starting rate

      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Simulate realistic fluctuations
        const change = (Math.random() - 0.5) * 2; // -1 to +1 PKR change
        rate = Math.round((rate + change) * 100) / 100;

        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          rate: rate,
        });
      }
      return data;
    };

    // Simulate API call
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            PKR/USD 30-Day Trend
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            SBP Interbank Rate
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            PKR {data[data.length - 1]?.rate.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            vs USD
          </p>
        </div>
      </div>
      <LineChart
        data={data}
        lines={[{ dataKey: 'rate', name: 'PKR/USD', color: '#22c55e' }]}
        xKey="date"
        height={250}
        showGrid={true}
        showTooltip={true}
        className="w-full"
      />
    </div>
  );
}

export default PkrUsdTrendChart;
