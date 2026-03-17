/**
 * Property Stamp Duty Calculator (T080)
 */

import { useState } from 'react';
import { trackToolUse } from '../../lib/utils/analytics';
import {
  PROVINCE_STAMP_DUTY,
  PROVINCE_CODES,
  LAST_VERIFIED_DATE,
} from '../../lib/data/property-stamp-duty';

export default function PropertyStampDuty() {
  const [province, setProvince] = useState('Punjab');
  const [propertyValue, setPropertyValue] = useState('');
  const [isFiler, setIsFiler] = useState(false);
  const [result, setResult] = useState<{
    stampDuty: number;
    cvt: number;
    registrationFee: number;
    total: number;
  } | null>(null);

  function calculate() {
    const value = parseFloat(propertyValue) || 0;
    if (value <= 0) return;

    const rates = PROVINCE_STAMP_DUTY[province];
    const stampDuty = value * rates.stampDuty;
    const cvt = value * (isFiler ? rates.cvtFiler : rates.cvtNonFiler);
    const registrationFee = value * rates.registrationFee;
    const total = stampDuty + cvt + registrationFee;

    setResult({ stampDuty, cvt, registrationFee, total });
    trackToolUse('property-stamp-duty-calculator');
  }

  const fmt = (n: number) =>
    'PKR ' + n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const rates = PROVINCE_STAMP_DUTY[province];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Province / Territory</label>
          <select
            value={province} onChange={e => setProvince(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {PROVINCE_CODES.map(code => (
              <option key={code} value={code}>{PROVINCE_STAMP_DUTY[code].name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Property Value (PKR)</label>
          <input
            type="number" min="0" value={propertyValue}
            onChange={e => setPropertyValue(e.target.value)}
            placeholder="e.g. 10000000"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isFiler}
              onChange={e => setIsFiler(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm text-gray-700">
              I am an Active Tax Filer (FBR ATL) — lower CVT rate ({(rates.cvtFiler * 100).toFixed(0)}% vs {(rates.cvtNonFiler * 100).toFixed(0)}%)
            </span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Filer status is self-declared for estimation purposes. Verify at FBR Active Taxpayer List.
          </p>
        </div>
      </div>

      <button
        onClick={calculate}
        className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors"
      >
        Calculate
      </button>

      {result && (
        <div className="mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {PROVINCE_STAMP_DUTY[province].name} — Transfer Costs
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Stamp Duty ({(rates.stampDuty * 100).toFixed(0)}%)</span>
                <span>{fmt(result.stampDuty)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Capital Value Tax — CVT ({isFiler ? `Filer: ${(rates.cvtFiler * 100).toFixed(0)}%` : `Non-Filer: ${(rates.cvtNonFiler * 100).toFixed(0)}%`})</span>
                <span>{fmt(result.cvt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Registration Fee ({(rates.registrationFee * 100).toFixed(1)}%)</span>
                <span>{fmt(result.registrationFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-green-400 pt-2">
                <span>Total Transfer Costs</span>
                <span className="text-green-700">{fmt(result.total)}</span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Last verified: {LAST_VERIFIED_DATE}. Rates are approximate; actual charges may include DC valuation table rates, legal fees, and NOC charges not included here.
          </p>
        </div>
      )}
    </div>
  );
}
