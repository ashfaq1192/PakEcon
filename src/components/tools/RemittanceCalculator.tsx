/**
 * Remittance Calculator (T082)
 * Uses live SBP interbank rates from /api/exchange-rates.
 */

import { useState, useEffect } from 'react';
import { trackToolUse } from '../../lib/utils/analytics';

interface ExchangeRate {
  currency: string;
  rate: number;
  date: string;
}

interface RatesResponse {
  rates: ExchangeRate[];
  updatedAt: string;
  stale?: boolean;
}

const SEND_CURRENCIES = [
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧', description: 'UK' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', description: 'Europe' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸', description: 'USA' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪', description: 'UAE' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦', description: 'Saudi Arabia' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦', description: 'Canada' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺', description: 'Australia' },
  { code: 'RON', name: 'Romanian Leu', flag: '🇷🇴', description: 'Romania (diaspora)' },
];

export default function RemittanceCalculator() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [updatedAt, setUpdatedAt] = useState('');
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sendCurrency, setSendCurrency] = useState('GBP');
  const [sendAmount, setSendAmount] = useState('500');

  useEffect(() => {
    fetch('/api/exchange-rates')
      .then(r => r.json() as Promise<RatesResponse>)
      .then(data => {
        const map: Record<string, number> = {};
        for (const r of data.rates) map[r.currency] = r.rate;
        setRates(map);
        setUpdatedAt(data.updatedAt || '');
        setStale(!!data.stale);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const pkrAmount =
    !loading && !error && rates[sendCurrency] && parseFloat(sendAmount) > 0
      ? parseFloat(sendAmount) * rates[sendCurrency]
      : null;

  const fmt = (n: number) =>
    'PKR ' + n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const selectedCurrency = SEND_CURRENCIES.find(c => c.code === sendCurrency);

  return (
    <div className="max-w-lg mx-auto">
      {loading && <p className="text-sm text-gray-500 mb-4">Loading live exchange rates…</p>}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-4">
          Unable to load rates. Please try again.
        </div>
      )}
      {stale && !error && !loading && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800 mb-4">
          Showing cached rates — live rates unavailable.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Select Currency to Send From
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SEND_CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => setSendCurrency(c.code)}
                className={`flex items-center gap-2 p-2 rounded border text-sm transition-colors ${
                  sendCurrency === c.code
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{c.flag}</span>
                <div className="text-left">
                  <div className="font-medium">{c.code}</div>
                  <div className="text-xs text-gray-500">{c.description}</div>
                </div>
                {rates[c.code] && (
                  <span className="ml-auto text-xs text-gray-400">
                    {rates[c.code].toFixed(0)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Amount in {sendCurrency}
          </label>
          <input
            type="number" min="0" value={sendAmount}
            onChange={e => setSendAmount(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {pkrAmount !== null && (
            <button
              onClick={() => trackToolUse('remittance-calculator')}
              className="sr-only"
            />
          )}
        </div>
      </div>

      {pkrAmount !== null && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-sm text-gray-600 mb-1">
            Your recipient receives:
          </p>
          <p className="text-3xl font-bold text-green-700">{fmt(pkrAmount)}</p>
          {selectedCurrency && (
            <p className="text-sm text-gray-500 mt-1">
              {selectedCurrency.flag} {sendAmount} {sendCurrency} → {fmt(pkrAmount)}
            </p>
          )}
          {rates[sendCurrency] && (
            <p className="text-xs text-gray-400 mt-2">
              Rate: 1 {sendCurrency} = PKR {rates[sendCurrency].toLocaleString('en-PK', { minimumFractionDigits: 2 })}
              {updatedAt && ` · As of ${new Date(updatedAt).toLocaleDateString('en-PK')}`}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
        Rates shown are SBP interbank rates. Actual remittance and exchange counter rates vary by
        provider and may differ significantly. RON (Romanian Leu) is included for the Pakistani
        community in Romania and Europe.
      </div>
    </div>
  );
}
