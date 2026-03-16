/**
 * Electricity Bill Calculator (T029)
 * Calculates NEPRA electricity bills for all 9 DISCOs.
 */

import { useState } from 'react';
import { trackToolUse } from '../../lib/utils/analytics';
import {
  DISCO_TARIFFS,
  DISCO_CODES,
  GST_RATE,
  LAST_VERIFIED_DATE,
  type ConsumerType,
  type TariffSlab,
} from '../../lib/data/electricity-tariffs';

interface BillBreakdown {
  energyCharge: number;
  fixedCharge: number;
  fcaCharge: number;
  gst: number;
  total: number;
  slabDetail: { label: string; units: number; rate: number; amount: number }[];
}

function calculateEnergyCharge(units: number, slabs: TariffSlab[]): {
  total: number;
  detail: { label: string; units: number; rate: number; amount: number }[];
} {
  let remaining = units;
  let total = 0;
  const detail: { label: string; units: number; rate: number; amount: number }[] = [];

  for (const slab of slabs) {
    if (remaining <= 0) break;

    const slabMax = slab.max ?? Infinity;
    const slabMin = slab.min;
    const slabCapacity = slabMax === Infinity ? remaining : slabMax - slabMin + 1;
    const unitsInSlab = Math.min(remaining, slabCapacity);

    if (unitsInSlab <= 0) continue;

    const amount = unitsInSlab * slab.rate;
    total += amount;

    const label =
      slab.max === null
        ? `>${slabMin - 1} units`
        : `${slabMin}–${slab.max} units`;

    detail.push({ label, units: unitsInSlab, rate: slab.rate, amount });
    remaining -= unitsInSlab;
  }

  return { total, detail };
}

function computeBill(disco: string, type: ConsumerType, units: number): BillBreakdown {
  const tariff = DISCO_TARIFFS[disco][type];
  const { total: energyCharge, detail: slabDetail } = calculateEnergyCharge(units, tariff.slabs);
  const fixedCharge = tariff.fixedCharge;
  const fcaCharge = units * tariff.fcaRate;
  const preTax = energyCharge + fixedCharge + fcaCharge;
  const gst = preTax * GST_RATE;
  const total = preTax + gst;

  return { energyCharge, fixedCharge, fcaCharge, gst, total, slabDetail };
}

export default function ElectricityBillCalculator() {
  const [disco, setDisco] = useState('LESCO');
  const [consumerType, setConsumerType] = useState<ConsumerType>('residential');
  const [units, setUnits] = useState('');
  const [result, setResult] = useState<BillBreakdown | null>(null);

  function handleCalculate() {
    const u = parseInt(units, 10);
    if (!u || u <= 0) return;
    setResult(computeBill(disco, consumerType, u));
    trackToolUse('electricity-bill-calculator');
  }

  const fmt = (n: number) =>
    'PKR ' +
    n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* DISCO selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            DISCO (Distribution Company)
          </label>
          <select
            value={disco}
            onChange={e => setDisco(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {DISCO_CODES.map(code => (
              <option key={code} value={code}>
                {code} — {DISCO_TARIFFS[code].name}
              </option>
            ))}
          </select>
        </div>

        {/* Consumer type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Consumer Type
          </label>
          <select
            value={consumerType}
            onChange={e => setConsumerType(e.target.value as ConsumerType)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="agricultural">Agricultural</option>
          </select>
        </div>

        {/* Units */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Units Consumed (kWh)
          </label>
          <input
            type="number"
            min="1"
            value={units}
            onChange={e => setUnits(e.target.value)}
            placeholder="e.g. 350"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            onKeyDown={e => e.key === 'Enter' && handleCalculate()}
          />
        </div>
      </div>

      <button
        onClick={handleCalculate}
        className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors"
      >
        Calculate Bill
      </button>

      {result && (
        <div className="mt-6">
          {/* Slab breakdown */}
          {result.slabDetail.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Energy Charge Breakdown</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="border border-gray-200 px-3 py-1">Slab</th>
                    <th className="border border-gray-200 px-3 py-1 text-right">Units</th>
                    <th className="border border-gray-200 px-3 py-1 text-right">Rate (PKR/kWh)</th>
                    <th className="border border-gray-200 px-3 py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {result.slabDetail.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-3 py-1">{row.label}</td>
                      <td className="border border-gray-200 px-3 py-1 text-right">{row.units}</td>
                      <td className="border border-gray-200 px-3 py-1 text-right">{row.rate.toFixed(2)}</td>
                      <td className="border border-gray-200 px-3 py-1 text-right">{fmt(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Bill Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Energy Charge</span>
                <span>{fmt(result.energyCharge)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fixed Monthly Charge</span>
                <span>{fmt(result.fixedCharge)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fuel Charge Adjustment (FCA)</span>
                <span>{fmt(result.fcaCharge)}</span>
              </div>
              <div className="flex justify-between border-t border-green-300 pt-1 mt-1">
                <span className="text-gray-600">GST (17%)</span>
                <span>{fmt(result.gst)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-green-400 pt-2 mt-1">
                <span>Total Estimated Bill</span>
                <span className="text-green-700">{fmt(result.total)}</span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            * Estimate based on NEPRA notified tariffs. Actual bill may include TV licence, income tax on bill amount, and other regulatory charges.
            Tariff data last verified: {LAST_VERIFIED_DATE}.
          </p>
        </div>
      )}
    </div>
  );
}
