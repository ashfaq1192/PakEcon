/**
 * Loan / EMI Calculator (T036, T037)
 * Supports conventional and Islamic/Murabaha financing modes.
 */

import { useState } from 'react';
import { trackToolUse } from '../../lib/utils/analytics';

type LoanPurpose = 'home' | 'car' | 'personal' | 'business';
type FinancingMode = 'conventional' | 'islamic';

interface AmortizationRow {
  month: number;
  opening: number;
  installment: number;
  principal: number;
  profitOrInterest: number;
  closing: number;
}

interface CalcResult {
  monthlyInstallment: number;
  totalProfitOrInterest: number;
  totalPayable: number;
  amortization: AmortizationRow[];
  loanAmount: number;
  mode: FinancingMode;
  // Prepayment result (optional)
  prepayment?: {
    newMonthlyInstallment?: number;
    newTenureMonths?: number;
    remainingBalance: number;
    prepayAfterMonth: number;
  };
}

function buildAmortizationConventional(
  loanAmount: number,
  monthlyRate: number,
  tenureMonths: number,
  emi: number
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  let balance = loanAmount;
  const displayMonths = Math.min(tenureMonths, 12);

  for (let m = 1; m <= displayMonths; m++) {
    const interest = balance * monthlyRate;
    const principal = emi - interest;
    const closing = Math.max(0, balance - principal);
    rows.push({
      month: m,
      opening: balance,
      installment: emi,
      principal,
      profitOrInterest: interest,
      closing,
    });
    balance = closing;
  }
  return rows;
}

function buildAmortizationIslamic(
  loanAmount: number,
  totalProfit: number,
  tenureMonths: number,
  monthlyInstallment: number
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  const monthlyProfit = totalProfit / tenureMonths;
  let balance = loanAmount + totalProfit;
  const displayMonths = Math.min(tenureMonths, 12);

  for (let m = 1; m <= displayMonths; m++) {
    const closing = Math.max(0, balance - monthlyInstallment);
    rows.push({
      month: m,
      opening: balance,
      installment: monthlyInstallment,
      principal: monthlyInstallment - monthlyProfit,
      profitOrInterest: monthlyProfit,
      closing,
    });
    balance = closing;
  }
  return rows;
}

export default function LoanEmiCalculator() {
  const [purpose, setPurpose] = useState<LoanPurpose>('home');
  const [mode, setMode] = useState<FinancingMode>('conventional');
  const [principal, setPrincipal] = useState('');
  const [downPct, setDownPct] = useState('20');
  const [annualRate, setAnnualRate] = useState('21');
  const [tenureYears, setTenureYears] = useState('10');
  const [result, setResult] = useState<CalcResult | null>(null);

  // Prepayment
  const [prepayAmount, setPrepayAmount] = useState('');
  const [prepayAfterMonth, setPrepayAfterMonth] = useState('');
  const [prepayMode, setPrepayMode] = useState<'reduce_emi' | 'reduce_tenure'>('reduce_emi');

  function calculate() {
    const p = parseFloat(principal) || 0;
    const dp = parseFloat(downPct) || 0;
    const rate = parseFloat(annualRate) || 0;
    const years = parseFloat(tenureYears) || 0;
    if (p <= 0 || rate <= 0 || years <= 0) return;

    const loanAmount = p * (1 - dp / 100);
    const tenureMonths = years * 12;

    let monthlyInstallment: number;
    let totalProfitOrInterest: number;
    let amortization: AmortizationRow[];

    if (mode === 'conventional') {
      const monthlyRate = rate / 1200;
      const factor = Math.pow(1 + monthlyRate, tenureMonths);
      monthlyInstallment = (loanAmount * monthlyRate * factor) / (factor - 1);
      totalProfitOrInterest = monthlyInstallment * tenureMonths - loanAmount;
      amortization = buildAmortizationConventional(loanAmount, monthlyRate, tenureMonths, monthlyInstallment);
    } else {
      // Islamic / Murabaha: flat profit, no compounding
      const totalProfit = loanAmount * (rate / 100) * years;
      monthlyInstallment = (loanAmount + totalProfit) / tenureMonths;
      totalProfitOrInterest = totalProfit;
      amortization = buildAmortizationIslamic(loanAmount, totalProfit, tenureMonths, monthlyInstallment);
    }

    const totalPayable = loanAmount + totalProfitOrInterest;
    setResult({ monthlyInstallment, totalProfitOrInterest, totalPayable, amortization, loanAmount, mode });
    trackToolUse('loan-emi-calculator');
  }

  function applyPrepayment() {
    if (!result) return;
    const prepay = parseFloat(prepayAmount) || 0;
    const afterMonth = parseInt(prepayAfterMonth, 10) || 0;
    if (prepay <= 0 || afterMonth <= 0) return;

    const years = parseFloat(tenureYears) || 0;
    const tenureMonths = years * 12;
    const rate = parseFloat(annualRate) || 0;

    // Compute balance at end of afterMonth
    let balance = result.loanAmount;
    const monthlyRate = rate / 1200;

    if (mode === 'conventional') {
      for (let m = 1; m <= afterMonth; m++) {
        const interest = balance * monthlyRate;
        balance = balance - (result.monthlyInstallment - interest);
      }
    } else {
      const monthlyPrincipal = result.loanAmount / tenureMonths;
      balance = result.loanAmount - monthlyPrincipal * afterMonth;
    }

    const remainingBalance = Math.max(0, balance - prepay);
    const remainingMonths = tenureMonths - afterMonth;

    let prepayResult: CalcResult['prepayment'];

    if (prepayMode === 'reduce_emi') {
      if (mode === 'conventional') {
        const factor = Math.pow(1 + monthlyRate, remainingMonths);
        const newEmi = (remainingBalance * monthlyRate * factor) / (factor - 1);
        prepayResult = { newMonthlyInstallment: newEmi, remainingBalance, prepayAfterMonth: afterMonth };
      } else {
        const remainingYears = remainingMonths / 12;
        const totalProfit = remainingBalance * (rate / 100) * remainingYears;
        const newEmi = (remainingBalance + totalProfit) / remainingMonths;
        prepayResult = { newMonthlyInstallment: newEmi, remainingBalance, prepayAfterMonth: afterMonth };
      }
    } else {
      // Reduce tenure, keep same EMI
      if (mode === 'conventional') {
        const newTenure = Math.ceil(
          Math.log(result.monthlyInstallment / (result.monthlyInstallment - remainingBalance * monthlyRate)) /
            Math.log(1 + monthlyRate)
        );
        prepayResult = { newTenureMonths: newTenure, remainingBalance, prepayAfterMonth: afterMonth };
      } else {
        const monthlyPrincipalPart = result.loanAmount / tenureMonths;
        const newTenure = Math.ceil(remainingBalance / monthlyPrincipalPart);
        prepayResult = { newTenureMonths: newTenure, remainingBalance, prepayAfterMonth: afterMonth };
      }
    }

    setResult(r => r ? { ...r, prepayment: prepayResult } : r);
  }

  const fmt = (n: number) =>
    'PKR ' + n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const isIslamic = mode === 'islamic';
  const interestLabel = isIslamic ? 'Profit Rate (%)' : 'Interest Rate (%)';
  const profitLabel = isIslamic ? 'Total Profit' : 'Total Interest';
  const installmentLabel = isIslamic ? 'Monthly Installment' : 'EMI';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Mode toggle */}
      <div className="flex gap-2 mb-5">
        {(['conventional', 'islamic'] as FinancingMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {m === 'islamic' ? 'Islamic / Murabaha' : 'Conventional'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Loan Purpose</label>
          <select
            value={purpose}
            onChange={e => setPurpose(e.target.value as LoanPurpose)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="home">Home / Mortgage</option>
            <option value="car">Car / Auto</option>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Principal Amount (PKR)</label>
          <input
            type="number" min="0" value={principal}
            onChange={e => setPrincipal(e.target.value)} placeholder="e.g. 5000000"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Down Payment (%)</label>
          <input
            type="number" min="0" max="99" value={downPct}
            onChange={e => setDownPct(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{interestLabel}</label>
          <input
            type="number" min="0" step="0.1" value={annualRate}
            onChange={e => setAnnualRate(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tenure (Years)</label>
          <input
            type="number" min="1" max="30" value={tenureYears}
            onChange={e => setTenureYears(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <button
        onClick={calculate}
        className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors"
      >
        Calculate
      </button>

      {result && (
        <>
          {/* Summary */}
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between font-bold text-base">
                <span>{installmentLabel}</span>
                <span className="text-green-700">{fmt(result.monthlyInstallment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Amount (after down payment)</span>
                <span>{fmt(result.loanAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{profitLabel}</span>
                <span>{fmt(result.totalProfitOrInterest)}</span>
              </div>
              <div className="flex justify-between border-t border-green-300 pt-1 font-semibold">
                <span>Total Payable</span>
                <span>{fmt(result.totalPayable)}</span>
              </div>
            </div>
            {isIslamic && (
              <p className="mt-2 text-xs text-gray-500">
                Islamic Murabaha: flat profit on declining balance — profit does not compound.
              </p>
            )}
          </div>

          {/* Amortization (first 12 months) */}
          <div className="mt-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Amortization Schedule (first 12 months)
            </h3>
            <table className="w-full text-xs border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-2 py-1 text-left">Month</th>
                  <th className="border border-gray-200 px-2 py-1 text-right">Opening</th>
                  <th className="border border-gray-200 px-2 py-1 text-right">{installmentLabel}</th>
                  <th className="border border-gray-200 px-2 py-1 text-right">Principal</th>
                  <th className="border border-gray-200 px-2 py-1 text-right">{isIslamic ? 'Profit' : 'Interest'}</th>
                  <th className="border border-gray-200 px-2 py-1 text-right">Closing</th>
                </tr>
              </thead>
              <tbody>
                {result.amortization.map(row => (
                  <tr key={row.month} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-2 py-1">{row.month}</td>
                    <td className="border border-gray-200 px-2 py-1 text-right">{fmt(row.opening)}</td>
                    <td className="border border-gray-200 px-2 py-1 text-right">{fmt(row.installment)}</td>
                    <td className="border border-gray-200 px-2 py-1 text-right">{fmt(row.principal)}</td>
                    <td className="border border-gray-200 px-2 py-1 text-right">{fmt(row.profitOrInterest)}</td>
                    <td className="border border-gray-200 px-2 py-1 text-right">{fmt(row.closing)}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-gray-100 font-semibold">
                  <td className="border border-gray-200 px-2 py-1">Total (12 mo.)</td>
                  <td className="border border-gray-200 px-2 py-1" />
                  <td className="border border-gray-200 px-2 py-1 text-right">
                    {fmt(result.amortization.reduce((s, r) => s + r.installment, 0))}
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-right">
                    {fmt(result.amortization.reduce((s, r) => s + r.principal, 0))}
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-right">
                    {fmt(result.amortization.reduce((s, r) => s + r.profitOrInterest, 0))}
                  </td>
                  <td className="border border-gray-200 px-2 py-1" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Prepayment simulation */}
          <div className="mt-6 p-4 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Lump-Sum Prepayment Simulation</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Prepayment Amount (PKR)</label>
                <input
                  type="number" min="0" value={prepayAmount}
                  onChange={e => setPrepayAmount(e.target.value)} placeholder="e.g. 500000"
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">After Month #</label>
                <input
                  type="number" min="1" value={prepayAfterMonth}
                  onChange={e => setPrepayAfterMonth(e.target.value)} placeholder="e.g. 24"
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Benefit As</label>
                <select
                  value={prepayMode}
                  onChange={e => setPrepayMode(e.target.value as 'reduce_emi' | 'reduce_tenure')}
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm"
                >
                  <option value="reduce_emi">Reduced {installmentLabel}</option>
                  <option value="reduce_tenure">Reduced Tenure</option>
                </select>
              </div>
            </div>
            <button
              onClick={applyPrepayment}
              className="mt-3 bg-gray-700 text-white py-1.5 px-4 rounded text-sm hover:bg-gray-800"
            >
              Simulate Prepayment
            </button>

            {result.prepayment && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <p>After prepaying {fmt(parseFloat(prepayAmount))} at month {result.prepayment.prepayAfterMonth}:</p>
                <p className="font-semibold mt-1">
                  Remaining Balance: {fmt(result.prepayment.remainingBalance)}
                </p>
                {result.prepayment.newMonthlyInstallment !== undefined && (
                  <p className="font-semibold text-green-700">
                    New {installmentLabel}: {fmt(result.prepayment.newMonthlyInstallment)}
                  </p>
                )}
                {result.prepayment.newTenureMonths !== undefined && (
                  <p className="font-semibold text-green-700">
                    New Tenure: {result.prepayment.newTenureMonths} months ({(result.prepayment.newTenureMonths / 12).toFixed(1)} years)
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
