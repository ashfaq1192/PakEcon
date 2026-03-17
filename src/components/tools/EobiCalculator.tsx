/**
 * EOBI Pension & Provident Fund Calculator (T077)
 */

import { useState } from 'react';
import { trackToolUse } from '../../lib/utils/analytics';

const EOBI_MONTHLY_PENSION_2026 = 10000; // PKR — notified by EOBI Board
const RETIREMENT_AGE = 60;

export default function EobiCalculator() {
  const [currentAge, setCurrentAge] = useState('30');
  const [monthlySalary, setMonthlySalary] = useState('50000');
  const [yearsService, setYearsService] = useState('5');
  const [pfRate, setPfRate] = useState('5');
  const [pfGrowthRate, setPfGrowthRate] = useState('7');

  const [result, setResult] = useState<{
    retirementAge: number;
    yearsToRetirement: number;
    eobiPension: number;
    pfMonthlyContribution: number;
    pfCorpus: number;
  } | null>(null);

  function calculate() {
    const age = parseInt(currentAge) || 0;
    const salary = parseFloat(monthlySalary) || 0;
    const pfR = parseFloat(pfRate) / 100 || 0;
    const growthR = parseFloat(pfGrowthRate) / 100 || 0;
    if (age <= 0 || age >= RETIREMENT_AGE || salary <= 0) return;

    const yearsToRetirement = RETIREMENT_AGE - age;
    const monthsToRetirement = yearsToRetirement * 12;
    const monthlyGrowthRate = growthR / 12;
    const monthlyContribution = salary * pfR;

    // PF corpus: future value of monthly contributions
    let pfCorpus = 0;
    if (monthlyGrowthRate > 0) {
      pfCorpus =
        monthlyContribution *
        ((Math.pow(1 + monthlyGrowthRate, monthsToRetirement) - 1) / monthlyGrowthRate) *
        (1 + monthlyGrowthRate);
    } else {
      pfCorpus = monthlyContribution * monthsToRetirement;
    }

    setResult({
      retirementAge: RETIREMENT_AGE,
      yearsToRetirement,
      eobiPension: EOBI_MONTHLY_PENSION_2026,
      pfMonthlyContribution: monthlyContribution,
      pfCorpus,
    });
    trackToolUse('eobi-calculator');
  }

  const fmt = (n: number) =>
    'PKR ' + n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: 'Current Age', value: currentAge, setter: setCurrentAge, min: 18, max: 59, placeholder: '30' },
          { label: 'Current Monthly Salary (PKR)', value: monthlySalary, setter: setMonthlySalary, min: 0, placeholder: '50000' },
          { label: 'Years of Service Completed', value: yearsService, setter: setYearsService, min: 0, placeholder: '5' },
          { label: 'PF Contribution Rate (%)', value: pfRate, setter: setPfRate, min: 0, max: 30, placeholder: '5' },
          { label: 'Assumed PF Growth Rate (% p.a.)', value: pfGrowthRate, setter: setPfGrowthRate, min: 0, max: 20, placeholder: '7' },
        ].map(({ label, value, setter, min, max, placeholder }) => (
          <div key={label}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
              type="number" min={min} max={max} value={value} placeholder={placeholder}
              onChange={e => setter(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        ))}
      </div>

      <button
        onClick={calculate}
        className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors"
      >
        Calculate
      </button>

      {result && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Retirement Estimate</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Retirement Age</span>
              <span>{result.retirementAge} years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Years to Retirement</span>
              <span>{result.yearsToRetirement} years</span>
            </div>
            <div className="flex justify-between border-t border-green-300 pt-2">
              <span className="text-gray-600">Monthly EOBI Pension</span>
              <span>{fmt(result.eobiPension)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Your Monthly PF Contribution</span>
              <span>{fmt(result.pfMonthlyContribution)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-green-400 pt-2">
              <span>Estimated PF Corpus at 60</span>
              <span className="text-green-700">{fmt(result.pfCorpus)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Based on current EOBI pension rate of {fmt(EOBI_MONTHLY_PENSION_2026)}/month effective 2026.
            Subject to change by EOBI Board. PF corpus assumes {pfGrowthRate}% p.a. growth compounded monthly.
          </p>
        </div>
      )}
    </div>
  );
}
