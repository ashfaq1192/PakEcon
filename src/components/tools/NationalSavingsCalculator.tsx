/**
 * National Savings Pakistan Calculator
 * Calculates monthly/annual profit for NS certificates with withholding tax.
 * Rates source: National Savings of Pakistan (CDNS) — verify at savings.gov.pk
 */

import { useState } from 'react';
import { formatLakhCrore, formatIndianComma } from '../../lib/utils/formatPKR';

interface Certificate {
  id: string;
  name: string;
  urduName: string;
  ratePA: number; // annual profit rate
  profitMode: 'monthly' | 'maturity' | 'halfYearly';
  tenure: number; // years
  minInvestment: number;
  maxInvestment: number | null;
  description: string;
  eligible: string;
}

// Rates as of March 2026 — source: CDNS savings.gov.pk
// These change periodically; always verify at savings.gov.pk
const CERTIFICATES: Certificate[] = [
  {
    id: 'bsc',
    name: 'Behbood Savings Certificates',
    urduName: 'بہبود سیونگز سرٹیفکیٹ',
    ratePA: 0.096,
    profitMode: 'monthly',
    tenure: 3,
    minInvestment: 500,
    maxInvestment: 5_000_000,
    description: 'Monthly profit, 3-year tenure. Widows, senior citizens (60+), disabled persons only.',
    eligible: 'Widows · Senior Citizens (60+) · Disabled',
  },
  {
    id: 'ric',
    name: 'Regular Income Certificates',
    urduName: 'ریگولر انکم سرٹیفکیٹ',
    ratePA: 0.102,
    profitMode: 'monthly',
    tenure: 5,
    minInvestment: 500,
    maxInvestment: null,
    description: 'Monthly profit payments for 5 years. Open to all Pakistani citizens.',
    eligible: 'All Pakistani Citizens',
  },
  {
    id: 'dsc',
    name: 'Defense Savings Certificates',
    urduName: 'ڈیفنس سیونگز سرٹیفکیٹ',
    ratePA: 0.1056,
    profitMode: 'maturity',
    tenure: 10,
    minInvestment: 500,
    maxInvestment: null,
    description: 'Profit paid at maturity (lump-sum). 10-year term, best for long-term saving.',
    eligible: 'All Pakistani Citizens',
  },
  {
    id: 'ssc',
    name: 'Special Savings Certificates',
    urduName: 'اسپیشل سیونگز سرٹیفکیٹ',
    ratePA: 0.105,
    profitMode: 'halfYearly',
    tenure: 3,
    minInvestment: 500,
    maxInvestment: null,
    description: 'Half-yearly profit for 3 years. Profit reinvested each 6 months.',
    eligible: 'All Pakistani Citizens',
  },
  {
    id: 'sfwa',
    name: 'Shuhada Family Welfare Account',
    urduName: 'شہداء فیملی ویلفیئر اکاؤنٹ',
    ratePA: 0.096,
    profitMode: 'monthly',
    tenure: 5,
    minInvestment: 100,
    maxInvestment: 5_000_000,
    description: 'Monthly profit. For families of Shuhada (martyrs) of armed forces & police.',
    eligible: 'Shuhada Families',
  },
];

// Withholding tax on savings profit (FBR 2025-26)
const WHT_FILER = 0.15;
const WHT_NON_FILER = 0.30;

export default function NationalSavingsCalculator() {
  const [certId, setCertId] = useState('ric');
  const [amount, setAmount] = useState<number>(500_000);
  const [isFiler, setIsFiler] = useState(true);

  const cert = CERTIFICATES.find(c => c.id === certId)!;
  const wht = isFiler ? WHT_FILER : WHT_NON_FILER;

  const annualGrossProfit = amount * cert.ratePA;
  const annualWHT = annualGrossProfit * wht;
  const annualNetProfit = annualGrossProfit - annualWHT;
  const monthlyGross = annualGrossProfit / 12;
  const monthlyNet = annualNetProfit / 12;
  const halfYearlyNet = annualNetProfit / 2;

  // Maturity value (for DSC — compounding not applied here, CDNS uses simple compounding)
  const maturityValue = amount + annualGrossProfit * cert.tenure;

  const whatsappText = `National Savings (${cert.name}):\nInvestment: PKR ${formatIndianComma(amount)}\nMonthly Net Profit: PKR ${formatIndianComma(monthlyNet)}\nAnnual Net Profit: PKR ${formatIndianComma(annualNetProfit)}\n\nCalculate yours: https://hisaabkar.pk/tools/national-savings-calculator`;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-2xl mx-auto">
      {/* Certificate selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Select Certificate Type
        </label>
        <div className="space-y-2">
          {CERTIFICATES.map(c => (
            <button
              key={c.id}
              onClick={() => setCertId(c.id)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                certId === c.id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm text-gray-800">{c.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5" dir="rtl" lang="ur">{c.urduName}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-green-700 font-bold text-sm">{(c.ratePA * 100).toFixed(2)}% p.a.</div>
                  <div className="text-xs text-gray-400">
                    {c.profitMode === 'monthly' ? 'Monthly profit' : c.profitMode === 'halfYearly' ? 'Half-yearly' : 'At maturity'}
                    &nbsp;·&nbsp;{c.tenure}yr
                  </div>
                </div>
              </div>
              <div className="mt-1 text-xs text-blue-600">{c.eligible}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Investment amount */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Investment Amount (PKR)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">PKR</span>
          <input
            type="number"
            value={amount || ''}
            onChange={e => setAmount(Number(e.target.value) || 0)}
            min={cert.minInvestment}
            max={cert.maxInvestment ?? undefined}
            step="10000"
            className="w-full pl-14 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
            placeholder="e.g. 500000"
          />
        </div>
        {amount > 0 && (
          <p className="text-xs text-green-600 mt-1 font-medium">= {formatLakhCrore(amount)}</p>
        )}
        {cert.maxInvestment && amount > cert.maxInvestment && (
          <p className="text-xs text-red-600 mt-1">Max investment for {cert.name}: PKR {formatIndianComma(cert.maxInvestment)}</p>
        )}
      </div>

      {/* Filer status */}
      <div className="mb-6 bg-gray-50 rounded-lg p-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isFiler}
            onChange={e => setIsFiler(e.target.checked)}
            className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Registered Filer (on FBR ATL)</span>
            <p className="text-xs text-gray-500 mt-0.5">
              Filers pay 15% WHT on profit. Non-filers pay 30% WHT.
            </p>
          </div>
        </label>
      </div>

      {/* Results */}
      {amount > 0 && (
        <div className="space-y-4">
          {/* Main result cards */}
          {cert.profitMode === 'monthly' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 text-center">
                <p className="text-xs text-gray-500 mb-1">Monthly Net Profit</p>
                <p className="text-2xl font-bold text-green-700">PKR {formatIndianComma(monthlyNet)}</p>
                <p className="text-xs text-green-600 font-medium">{formatLakhCrore(monthlyNet)} / month</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 text-center">
                <p className="text-xs text-gray-500 mb-1">Annual Net Profit</p>
                <p className="text-2xl font-bold text-blue-700">PKR {formatIndianComma(annualNetProfit)}</p>
                <p className="text-xs text-blue-600 font-medium">{formatLakhCrore(annualNetProfit)} / year</p>
              </div>
            </div>
          )}

          {cert.profitMode === 'halfYearly' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 text-center">
                <p className="text-xs text-gray-500 mb-1">Half-Yearly Net Profit</p>
                <p className="text-2xl font-bold text-green-700">PKR {formatIndianComma(halfYearlyNet)}</p>
                <p className="text-xs text-green-600 font-medium">{formatLakhCrore(halfYearlyNet)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 text-center">
                <p className="text-xs text-gray-500 mb-1">Annual Net Profit</p>
                <p className="text-2xl font-bold text-blue-700">PKR {formatIndianComma(annualNetProfit)}</p>
                <p className="text-xs text-blue-600 font-medium">{formatLakhCrore(annualNetProfit)}</p>
              </div>
            </div>
          )}

          {cert.profitMode === 'maturity' && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
              <p className="text-xs text-gray-500 mb-1 text-center">Maturity Value (after {cert.tenure} years)</p>
              <p className="text-3xl font-bold text-green-700 text-center">PKR {formatIndianComma(maturityValue)}</p>
              <p className="text-sm text-green-600 text-center font-medium mt-1">{formatLakhCrore(maturityValue)}</p>
              <p className="text-xs text-gray-500 text-center mt-2">
                Total profit: PKR {formatIndianComma(annualGrossProfit * cert.tenure)} (gross) · Net of 15%/30% WHT
              </p>
            </div>
          )}

          {/* Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <div className="font-semibold text-gray-700 mb-2">Profit Breakdown</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Annual Gross Profit ({(cert.ratePA * 100).toFixed(2)}%)</span>
                <span className="font-medium text-gray-800">PKR {formatIndianComma(annualGrossProfit)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Withholding Tax ({(wht * 100).toFixed(0)}% — {isFiler ? 'Filer' : 'Non-Filer'})</span>
                <span className="font-medium">- PKR {formatIndianComma(annualWHT)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-green-700">
                <span>Annual Net Profit</span>
                <span>PKR {formatIndianComma(annualNetProfit)}</span>
              </div>
            </div>
            {!isFiler && (
              <p className="mt-2 text-xs text-orange-600 font-medium">
                💡 Register as filer to save PKR {formatIndianComma(annualWHT - annualGrossProfit * WHT_FILER)} / year in WHT.
              </p>
            )}
          </div>

          {/* WhatsApp share */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Share on WhatsApp
          </a>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg text-sm">
        <p className="font-semibold text-amber-800 mb-1">⚠️ Important</p>
        <p className="text-amber-700">
          Rates shown are approximate as of March 2026. National Savings rates change periodically.
          Always verify current rates at{' '}
          <a href="https://www.savings.gov.pk" target="_blank" rel="noopener noreferrer" className="underline font-medium">savings.gov.pk</a>{' '}
          before investing. Not financial advice.
        </p>
      </div>
    </div>
  );
}
