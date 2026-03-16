/**
 * Currency Converter (T040, T041)
 * Uses live SBP interbank rates from /api/exchange-rates.
 * Includes 30-day SVG sparkline trend.
 */

import { useState, useEffect, useCallback } from 'react';

interface ExchangeRate {
  currency: string;
  rate: number;
  date: string;
  source: string;
}

interface RatesResponse {
  rates: ExchangeRate[];
  updatedAt: string;
  stale?: boolean;
}

interface HistoryResponse {
  currency: string;
  history: { date: string; rate: number }[];
}

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'CAD', 'AUD', 'CNY', 'JPY', 'RON'];

function SparklineChart({ data }: { data: { date: string; rate: number }[] }) {
  if (data.length < 7) {
    return <p className="text-xs text-gray-500 italic">Insufficient history data</p>;
  }

  const rates = data.map(d => d.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const range = max - min || 1;

  const W = 300;
  const H = 60;
  const PAD = 4;

  const points = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + ((max - d.rate) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polyline = points.join(' ');
  const lastRate = rates[rates.length - 1];
  const firstRate = rates[0];
  const change = ((lastRate - firstRate) / firstRate) * 100;
  const color = change >= 0 ? '#dc2626' : '#16a34a'; // red = PKR weakened, green = strengthened

  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">30-day PKR trend (SBP interbank)</span>
        <span className={`text-xs font-semibold ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '60px' }}>
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>{data[0].date}</span>
        <span>{data[data.length - 1].date}</span>
      </div>
    </div>
  );
}

export default function CurrencyConverter() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [updatedAt, setUpdatedAt] = useState('');
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [fromCurrency, setFromCurrency] = useState('PKR');
  const [toCurrency, setToCurrency] = useState('USD');
  const [amount, setAmount] = useState('1000');
  const [history, setHistory] = useState<{ date: string; rate: number }[]>([]);

  useEffect(() => {
    fetch('/api/exchange-rates')
      .then(r => r.json() as Promise<RatesResponse>)
      .then((data) => {
        const rateMap: Record<string, number> = { PKR: 1 };
        for (const r of data.rates) {
          rateMap[r.currency] = r.rate; // rate = PKR per 1 foreign unit
        }
        setRates(rateMap);
        setUpdatedAt(data.updatedAt || '');
        setStale(!!data.stale);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // Fetch history when non-PKR currency changes
  const foreignCurrency = fromCurrency === 'PKR' ? toCurrency : fromCurrency;
  useEffect(() => {
    if (!foreignCurrency || foreignCurrency === 'PKR') {
      setHistory([]);
      return;
    }
    fetch(`/api/exchange-rates/history?currency=${foreignCurrency}`)
      .then(r => r.json() as Promise<HistoryResponse>)
      .then((data) => setHistory(data.history || []))
      .catch(() => setHistory([]));
  }, [foreignCurrency]);

  function convert(): string {
    if (!amount || loading || error) return '—';
    const a = parseFloat(amount);
    if (isNaN(a)) return '—';

    // All rates are stored as PKR per 1 foreign unit
    if (fromCurrency === 'PKR' && toCurrency === 'PKR') return a.toLocaleString('en-PK');
    if (fromCurrency === 'PKR') {
      const rate = rates[toCurrency];
      if (!rate) return '—';
      return (a / rate).toLocaleString('en-PK', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }
    if (toCurrency === 'PKR') {
      const rate = rates[fromCurrency];
      if (!rate) return '—';
      return (a * rate).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    // Both non-PKR: convert via PKR
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    if (!fromRate || !toRate) return '—';
    return ((a * fromRate) / toRate).toLocaleString('en-PK', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }

  function swap() {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }

  const allCurrencies = ['PKR', ...SUPPORTED_CURRENCIES];

  const displayRate =
    fromCurrency !== 'PKR' && toCurrency === 'PKR' && rates[fromCurrency]
      ? `1 ${fromCurrency} = PKR ${rates[fromCurrency].toLocaleString('en-PK', { minimumFractionDigits: 2 })}`
      : fromCurrency === 'PKR' && rates[toCurrency]
      ? `1 ${toCurrency} = PKR ${rates[toCurrency].toLocaleString('en-PK', { minimumFractionDigits: 2 })}`
      : '';

  return (
    <div className="max-w-lg mx-auto">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <svg className="animate-spin h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading live rates…
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-4">
          Unable to load exchange rates. Please try again later.
        </div>
      )}
      {stale && !error && !loading && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800 mb-4">
          Showing cached rates (as of {updatedAt ? new Date(updatedAt).toLocaleDateString('en-PK') : 'unknown date'}).
          Live rates unavailable.
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
          <select
            value={fromCurrency}
            onChange={e => setFromCurrency(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {allCurrencies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          onClick={swap}
          className="mb-0.5 p-2 text-gray-500 hover:text-green-600 transition-colors"
          title="Swap currencies"
        >
          ⇄
        </button>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
          <select
            value={toCurrency}
            onChange={e => setToCurrency(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {allCurrencies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
        <input
          type="number"
          min="0"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-green-700">
          {convert()} {toCurrency}
        </div>
        {displayRate && <p className="text-xs text-gray-500 mt-1">{displayRate} (SBP interbank)</p>}
        {updatedAt && !loading && (
          <p className="text-xs text-gray-400 mt-0.5">
            Rates as of {new Date(updatedAt).toLocaleDateString('en-PK')}
          </p>
        )}
      </div>

      {history.length > 0 && <SparklineChart data={history} />}
    </div>
  );
}
