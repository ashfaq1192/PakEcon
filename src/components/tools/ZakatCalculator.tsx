/**
 * Zakat Calculator (T032, T033)
 * Calculates Zakat based on live gold/silver prices from /api/gold-price.
 */

import { useState, useEffect } from 'react';
import { trackToolUse } from '../../lib/utils/analytics';

interface GoldPriceResponse {
  goldPerGram: number;
  goldPerTola: number;
  silverPerGram: number;
  nisabSilverPKR: number;
  nisabGoldPKR: number;
  updatedAt: string;
  stale?: boolean;
}

type NisabBasis = 'silver' | 'gold';

const SILVER_GRAMS_NISAB = 612.36;
const GOLD_GRAMS_NISAB = 87.48;
const ZAKAT_RATE = 0.025;

export default function ZakatCalculator() {
  const [prices, setPrices] = useState<GoldPriceResponse | null>(null);
  const [pricesError, setPricesError] = useState(false);
  const [manualSilverRate, setManualSilverRate] = useState('');
  const [manualGoldRate, setManualGoldRate] = useState('');
  const [useManual, setUseManual] = useState(false);

  const [nisabBasis, setNisabBasis] = useState<NisabBasis>('silver');
  const [cashSavings, setCashSavings] = useState('');
  const [goldGrams, setGoldGrams] = useState('');
  const [silverGrams, setSilverGrams] = useState('');
  const [inventory, setInventory] = useState('');
  const [receivables, setReceivables] = useState('');
  const [liabilities, setLiabilities] = useState('');

  const [result, setResult] = useState<{
    totalAssets: number;
    totalLiabilities: number;
    netWealth: number;
    nisabPKR: number;
    nisabMet: boolean;
    zakatDue: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/gold-price')
      .then(r => r.json() as Promise<GoldPriceResponse>)
      .then((data) => setPrices(data))
      .catch(() => {
        setPricesError(true);
        setUseManual(true);
      });
  }, []);

  function getEffectivePrices(): { goldPerGram: number; silverPerGram: number } | null {
    if (useManual) {
      const g = parseFloat(manualGoldRate);
      const s = parseFloat(manualSilverRate);
      if (!g || !s || g <= 0 || s <= 0) return null;
      return { goldPerGram: g, silverPerGram: s };
    }
    if (!prices) return null;
    return { goldPerGram: prices.goldPerGram, silverPerGram: prices.silverPerGram };
  }

  function handleCalculate() {
    const effective = getEffectivePrices();
    if (!effective) return;

    const nisabPKR =
      nisabBasis === 'silver'
        ? effective.silverPerGram * SILVER_GRAMS_NISAB
        : effective.goldPerGram * GOLD_GRAMS_NISAB;

    const goldValue = (parseFloat(goldGrams) || 0) * effective.goldPerGram;
    const silverValue = (parseFloat(silverGrams) || 0) * effective.silverPerGram;
    const totalAssets =
      (parseFloat(cashSavings) || 0) +
      goldValue +
      silverValue +
      (parseFloat(inventory) || 0) +
      (parseFloat(receivables) || 0);
    const totalLiabilities = parseFloat(liabilities) || 0;
    const netWealth = totalAssets - totalLiabilities;
    const nisabMet = netWealth >= nisabPKR;
    const zakatDue = nisabMet ? netWealth * ZAKAT_RATE : 0;

    setResult({ totalAssets, totalLiabilities, netWealth, nisabPKR, nisabMet, zakatDue });
    trackToolUse('zakat-calculator');
  }

  const fmt = (n: number) =>
    'PKR ' + n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const effective = getEffectivePrices();
  const nisabPKR = effective
    ? nisabBasis === 'silver'
      ? effective.silverPerGram * SILVER_GRAMS_NISAB
      : effective.goldPerGram * GOLD_GRAMS_NISAB
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Price status */}
      {pricesError && !useManual && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
          Unable to fetch current gold/silver prices. Please enter rates manually.
        </div>
      )}
      {prices && !useManual && prices.stale && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
          Rate as of {new Date(prices.updatedAt).toLocaleDateString('en-PK')} — may not reflect current market.
        </div>
      )}
      {prices && !useManual && !prices.stale && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          Live prices: Gold {fmt(prices.goldPerGram)}/gram · Silver {fmt(prices.silverPerGram)}/gram
          · As of {new Date(prices.updatedAt).toLocaleDateString('en-PK')}
        </div>
      )}

      {/* Manual price input */}
      {useManual && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-3">Enter current market rates (PKR/gram):</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Gold rate (PKR/gram)</label>
              <input
                type="number"
                value={manualGoldRate}
                onChange={e => setManualGoldRate(e.target.value)}
                placeholder="e.g. 27500"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Silver rate (PKR/gram)</label>
              <input
                type="number"
                value={manualSilverRate}
                onChange={e => setManualSilverRate(e.target.value)}
                placeholder="e.g. 290"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}
      {!pricesError && (
        <button
          onClick={() => setUseManual(m => !m)}
          className="mb-4 text-xs text-green-700 underline"
        >
          {useManual ? 'Use live prices' : 'Enter prices manually'}
        </button>
      )}

      {/* Nisab basis */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Nisab Basis</label>
        <div className="flex gap-4">
          {(['silver', 'gold'] as NisabBasis[]).map(basis => (
            <label key={basis} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                value={basis}
                checked={nisabBasis === basis}
                onChange={() => setNisabBasis(basis)}
                className="text-green-600"
              />
              {basis === 'silver'
                ? `Silver (${SILVER_GRAMS_NISAB}g)`
                : `Gold (${GOLD_GRAMS_NISAB}g)`}
              {nisabPKR && basis === nisabBasis && (
                <span className="text-gray-500">≈ {fmt(nisabPKR)}</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Assets */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
        {[
          { label: 'Cash & Bank Savings (PKR)', value: cashSavings, setter: setCashSavings },
          { label: 'Gold (grams)', value: goldGrams, setter: setGoldGrams },
          { label: 'Silver (grams)', value: silverGrams, setter: setSilverGrams },
          { label: 'Business Inventory Value (PKR)', value: inventory, setter: setInventory },
          { label: 'Receivables (PKR)', value: receivables, setter: setReceivables },
        ].map(({ label, value, setter }) => (
          <div key={label}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
              type="number"
              min="0"
              value={value}
              onChange={e => setter(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Immediate Liabilities (PKR)
          </label>
          <input
            type="number"
            min="0"
            value={liabilities}
            onChange={e => setLiabilities(e.target.value)}
            placeholder="0"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={!effective}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        Calculate Zakat
      </button>

      {result && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Zakatable Assets</span>
              <span>{fmt(result.totalAssets)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Less: Liabilities</span>
              <span>- {fmt(result.totalLiabilities)}</span>
            </div>
            <div className="flex justify-between border-t border-green-300 pt-1 font-medium">
              <span>Net Zakatable Wealth</span>
              <span>{fmt(result.netWealth)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Nisab Threshold ({nisabBasis === 'silver' ? 'Silver' : 'Gold'} basis)</span>
              <span>{fmt(result.nisabPKR)}</span>
            </div>
            <div className="flex justify-between font-medium border-t border-green-300 pt-1">
              <span>Nisab Met?</span>
              <span className={result.nisabMet ? 'text-green-700' : 'text-red-600'}>
                {result.nisabMet ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-green-400">
            {result.netWealth < 0 ? (
              <p className="text-sm text-gray-600">
                No Zakat is due — your liabilities exceed your assets.
              </p>
            ) : result.nisabMet ? (
              <div className="flex justify-between items-center">
                <span className="font-bold text-base">Zakat Due (2.5%)</span>
                <span className="font-bold text-lg text-green-700">{fmt(result.zakatDue)}</span>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                No Zakat is due — net wealth is below the Nisab threshold.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
