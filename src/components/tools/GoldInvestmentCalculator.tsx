/**
 * Gold Investment Calculator (T073)
 * Fetches live gold/silver prices and shows scenario analysis.
 */

import { useState, useEffect } from 'react';
import { trackToolUse } from '../../lib/utils/analytics';

interface GoldPriceResponse {
  goldPerGram: number;
  goldPerTola: number;
  silverPerGram: number;
  updatedAt: string;
  stale?: boolean;
}

// Fallback prices used when API is unavailable
const FALLBACK_PRICES: GoldPriceResponse = {
  goldPerGram: 27500,
  goldPerTola: 320900,
  silverPerGram: 310,
  updatedAt: new Date().toISOString(),
  stale: true,
};

const SCENARIOS = [
  { label: '−20%', multiplier: 0.80 },
  { label: '−10%', multiplier: 0.90 },
  { label: 'Current', multiplier: 1.00 },
  { label: '+10%', multiplier: 1.10 },
  { label: '+20%', multiplier: 1.20 },
  { label: '+50%', multiplier: 1.50 },
];

export default function GoldInvestmentCalculator() {
  const [prices, setPrices] = useState<GoldPriceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [quantity, setQuantity] = useState('10');
  const [unit, setUnit] = useState<'tolas' | 'grams'>('tolas');
  const [result, setResult] = useState<{ currentValue: number; pricePerUnit: number } | null>(null);

  useEffect(() => {
    fetch('/api/gold-price')
      .then(r => r.json() as Promise<GoldPriceResponse>)
      .then(data => { setPrices(data); setLoading(false); })
      .catch(() => { setPrices(FALLBACK_PRICES); setError(true); setLoading(false); });
  }, []);

  function calculate() {
    if (!prices) return;
    const qty = parseFloat(quantity) || 0;
    const pricePerUnit = unit === 'tolas' ? prices.goldPerTola : prices.goldPerGram;
    const currentValue = qty * pricePerUnit;
    setResult({ currentValue, pricePerUnit });
    trackToolUse('gold-investment-calculator');
  }

  const fmt = (n: number) =>
    'PKR ' + n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="max-w-2xl mx-auto">
      {loading && <p className="text-sm text-gray-500 mb-4">Loading live gold prices…</p>}
      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700 mb-4">
          Live prices unavailable — showing approximate reference rates. Values may differ from current market.
        </div>
      )}
      {prices && !loading && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          Live: 24K Gold — {fmt(prices.goldPerTola)}/tola · {fmt(prices.goldPerGram)}/gram
          {prices.stale && ' (cached)'}
          <span className="ml-2 text-xs text-gray-500">Source: PMEX/Business Recorder via HisaabKar.pk</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
          <input
            type="number" min="0" step="0.1" value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
          <div className="flex gap-2 mt-1">
            {(['tolas', 'grams'] as const).map(u => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${unit === u ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {u === 'tolas' ? 'Tolas' : 'Grams'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={calculate}
        disabled={!prices || loading}
        className="w-full bg-yellow-500 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50"
      >
        Calculate
      </button>

      {result && (
        <div className="mt-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex justify-between">
            <span className="font-bold">Current Value ({quantity} {unit})</span>
            <span className="font-bold text-yellow-700">{fmt(result.currentValue)}</span>
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mb-2">Price Scenario Analysis</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-1 text-left">Scenario</th>
                <th className="border border-gray-200 px-3 py-1 text-right">Gold Price/{unit === 'tolas' ? 'tola' : 'gram'}</th>
                <th className="border border-gray-200 px-3 py-1 text-right">Portfolio Value</th>
                <th className="border border-gray-200 px-3 py-1 text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {SCENARIOS.map(s => {
                const newPrice = result.pricePerUnit * s.multiplier;
                const newValue = parseFloat(quantity) * newPrice;
                const change = newValue - result.currentValue;
                const isCurrentRow = s.multiplier === 1;
                return (
                  <tr key={s.label} className={isCurrentRow ? 'bg-yellow-50 font-semibold' : 'hover:bg-gray-50'}>
                    <td className="border border-gray-200 px-3 py-1">{s.label}</td>
                    <td className="border border-gray-200 px-3 py-1 text-right">{fmt(newPrice)}</td>
                    <td className="border border-gray-200 px-3 py-1 text-right">{fmt(newValue)}</td>
                    <td className={`border border-gray-200 px-3 py-1 text-right ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : ''}`}>
                      {change === 0 ? '—' : `${change > 0 ? '+' : ''}${fmt(change)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-500">
            Source: PMEX/Business Recorder via HisaabKar.pk. Prices as of {prices ? new Date(prices.updatedAt).toLocaleDateString('en-PK') : '—'}.
          </p>
        </div>
      )}
    </div>
  );
}
