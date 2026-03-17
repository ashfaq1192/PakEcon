import { useState } from 'react';

interface TaxSlab {
  min: number;
  max: number | null;
  rate: number;
}

const TAX_SLABS: TaxSlab[] = [
  { min: 0, max: 600000, rate: 0 },
  { min: 600000, max: 1200000, rate: 0.05 },
  { min: 1200000, max: 2200000, rate: 0.15 },
  { min: 2200000, max: 3200000, rate: 0.25 },
  { min: 3200000, max: 4100000, rate: 0.30 },
  { min: 4100000, max: null, rate: 0.35 }
];

interface TaxBreakdown {
  slabRange: string;
  taxableAmount: number;
  taxAmount: number;
  rate: number;
}

export default function TaxCalculator() {
  const [income, setIncome] = useState<number>(0);
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [useDigitalCredits, setUseDigitalCredits] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const calculateTax = (): { total: number; breakdown: TaxBreakdown[]; credits: number } => {
    let totalTax = 0;
    let remainingIncome = income;
    const breakdown: TaxBreakdown[] = [];

    for (const slab of TAX_SLABS) {
      if (remainingIncome <= 0) break;

      const slabMax = slab.max ?? Infinity;
      const taxableInSlab = Math.min(remainingIncome, slabMax - slab.min);
      const taxForSlab = taxableInSlab * slab.rate;

      if (taxForSlab > 0) {
        breakdown.push({
          slabRange: slab.max === null
            ? `PKR ${formatNumber(slab.min)}+`
            : `PKR ${formatNumber(slab.min)} - ${formatNumber(slab.max)}`,
          taxableAmount: taxableInSlab,
          taxAmount: taxForSlab,
          rate: slab.rate * 100
        });
      }

      totalTax += taxForSlab;
      remainingIncome -= taxableInSlab;
    }

    // Digital Nation Act credits for freelancers (10%)
    let credits = 0;
    if (isFreelancer && useDigitalCredits && totalTax > 0) {
      credits = totalTax * 0.10;
      totalTax -= credits;
    }

    return {
      total: Math.max(0, totalTax),
      breakdown,
      credits
    };
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-PK');
  };

  const result = calculateTax();
  const effectiveRate = income > 0 ? (result.total / income) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
      <div className="space-y-6">
        {/* Income Input */}
        <div>
          <label htmlFor="income" className="block text-sm font-semibold text-gray-700 mb-2">
            Annual Income (PKR)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
              PKR
            </span>
            <input
              id="income"
              type="number"
              value={income || ''}
              onChange={(e) => setIncome(Number(e.target.value) || 0)}
              className="w-full pl-14 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
              placeholder="Enter your annual income"
              min="0"
              step="1000"
            />
          </div>
        </div>

        {/* Freelancer Options */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isFreelancer}
              onChange={(e) => setIsFreelancer(e.target.checked)}
              className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="ml-3 text-gray-700">
              I am a Freelancer / IT Professional
            </span>
          </label>

          {isFreelancer && (
            <label className="flex items-center cursor-pointer ml-8">
              <input
                type="checkbox"
                checked={useDigitalCredits}
                onChange={(e) => setUseDigitalCredits(e.target.checked)}
                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="ml-3 text-gray-700">
                Apply <strong>Digital Nation Act Credits</strong> (10% discount)
              </span>
            </label>
          )}
        </div>

        {/* Results */}
        {income > 0 && (
          <div className="mt-8 space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <p className="text-sm text-gray-600 mb-2 font-medium">Estimated Annual Tax</p>
              <p className="text-4xl font-bold text-green-700">
                PKR {formatNumber(result.total)}
              </p>
              {effectiveRate > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Effective Rate: {effectiveRate.toFixed(2)}%
                </p>
              )}
            </div>

            {result.credits > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">
                  Digital Nation Act Credit Applied: -PKR {formatNumber(result.credits)}
                </p>
              </div>
            )}

            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-green-700 font-medium hover:text-green-800 transition flex items-center gap-2"
            >
              {showBreakdown ? 'Hide' : 'Show'} Tax Breakdown
              <span className={`transform transition-transform ${showBreakdown ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {showBreakdown && result.breakdown.length > 0 && (
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3 font-semibold text-gray-700">Income Slab</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Taxable Amount</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Rate</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.breakdown.map((item, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="p-3 text-gray-700">{item.slabRange}</td>
                        <td className="p-3 text-right text-gray-600">
                          PKR {formatNumber(item.taxableAmount)}
                        </td>
                        <td className="p-3 text-right text-gray-600">{item.rate}%</td>
                        <td className="p-3 text-right font-medium text-gray-800">
                          PKR {formatNumber(item.taxAmount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300 bg-gray-100">
                      <td className="p-3 font-bold text-gray-900" colSpan={3}>Total</td>
                      <td className="p-3 text-right font-bold text-green-700">
                        PKR {formatNumber(result.total + result.credits)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <span className="text-yellow-500 mr-2 mt-0.5">⚠️</span>
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Important Notice</p>
              <p>
                Calculation based on FBR 2026 tax slabs. This is an estimate for educational purposes only.
                Your actual tax liability may vary. Always consult a qualified tax professional or visit{' '}
                <a href="https://fbr.gov.pk" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                  fbr.gov.pk
                </a>{' '}
                for official filing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
