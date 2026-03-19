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

// Fallback PKR rates used when API is unavailable (approximate reference values)
const FALLBACK_RATES: Record<string, number> = {
  GBP: 352, EUR: 305, USD: 278, AED: 75.7,
  SAR: 74.1, CAD: 204, AUD: 178, RON: 62,
};

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
      .catch(() => {
        setRates(FALLBACK_RATES);
        setStale(true);
        setError(true);
        setLoading(false);
      });
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
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700 mb-4">
          Live SBP rates unavailable — showing approximate reference rates. Actual rates may differ.
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
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${selectedCurrency?.flag ?? ''} ${sendAmount} ${sendCurrency} = ${fmt(pkrAmount!)} PKR\n\nApna remittance yahan check karein: https://hisaabkar.pk/tools/remittance-calculator`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Share on WhatsApp
          </a>
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
