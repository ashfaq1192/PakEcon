/**
 * Inflation / Purchasing Power Calculator (T075)
 * Uses hardcoded PBS CPI base index (2015-16=100) annual averages.
 * D1 may have live SPI data; shows PBS SPI as CPI proxy.
 */

import { useState } from 'react';
import { trackToolUse } from '../../lib/utils/analytics';

// PBS CPI (base 2015-16 = 100), annual average for fiscal years
// Source: Pakistan Bureau of Statistics — publicly available
const CPI_DATA: Record<number, number> = {
  2015: 100.0,
  2016: 102.9,
  2017: 106.1,
  2018: 110.5,
  2019: 120.8,
  2020: 131.5,
  2021: 142.3,
  2022: 165.2,
  2023: 226.1,
  2024: 270.4,
  2025: 285.3,
  2026: 294.0, // estimated from latest monthly CPI
};

const YEARS = Object.keys(CPI_DATA).map(Number);
const CURRENT_YEAR = 2026;

export default function InflationCalculator() {
  const [amount, setAmount] = useState('100000');
  const [baseYear, setBaseYear] = useState(2015);
  const [targetYear, setTargetYear] = useState(CURRENT_YEAR);
  const [result, setResult] = useState<{
    adjusted: number;
    inflationRate: number;
    totalInflation: number;
  } | null>(null);

  function calculate() {
    const base = parseFloat(amount) || 0;
    if (base <= 0) return;

    const baseCPI = CPI_DATA[baseYear];
    const targetCPI = CPI_DATA[targetYear];
    const adjusted = base * (targetCPI / baseCPI);
    const totalInflation = ((targetCPI - baseCPI) / baseCPI) * 100;
    const years = targetYear - baseYear || 1;
    const inflationRate = (Math.pow(targetCPI / baseCPI, 1 / years) - 1) * 100;

    setResult({ adjusted, inflationRate, totalInflation });
    trackToolUse('inflation-calculator');
  }

  const fmt = (n: number) =>
    'PKR ' + n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Year-on-year % change for chart
  const chartData = YEARS.slice(1).map(y => ({
    year: y,
    pct: ((CPI_DATA[y] - CPI_DATA[y - 1]) / CPI_DATA[y - 1]) * 100,
  }));
  const maxPct = Math.max(...chartData.map(d => d.pct));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
        <div className="sm:col-span-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">Amount (PKR)</label>
          <input
            type="number" min="0" value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Base Year</label>
          <select
            value={baseYear} onChange={e => setBaseYear(Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {YEARS.filter(y => y < targetYear).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Target Year</label>
          <select
            value={targetYear} onChange={e => setTargetYear(Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {YEARS.filter(y => y > baseYear).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={calculate}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Calculate
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Original amount ({baseYear})</span>
              <span>{fmt(parseFloat(amount))}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-green-300 pt-1">
              <span>Equivalent in {targetYear}</span>
              <span className="text-green-700">{fmt(result.adjusted)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Total inflation {baseYear}–{targetYear}</span>
              <span>{result.totalInflation.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Avg annual inflation rate</span>
              <span>{result.inflationRate.toFixed(1)}% per year (CAGR)</span>
            </div>
          </div>
        </div>
      )}

      {/* Year-on-year CPI bar chart */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Year-on-Year Inflation (PBS CPI)</h3>
        <div className="flex items-end gap-1 h-32">
          {chartData.map(d => (
            <div key={d.year} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-green-500 rounded-t"
                style={{ height: `${Math.max(4, (d.pct / maxPct) * 100)}%` }}
                title={`${d.year}: ${d.pct.toFixed(1)}%`}
              />
              <span className="text-[9px] text-gray-500 rotate-45 origin-left mt-1">{d.year}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-gray-500">
          Source: Pakistan Bureau of Statistics (PBS) Consumer Price Index, base 2015-16=100.
          2026 is an estimate based on latest available monthly data.
        </p>
      </div>
    </div>
  );
}
