import { useState, useEffect, useMemo } from 'react';

interface CommodityPrice {
  commodity: string;
  city: string;
  price: number;
  unit: string;
  date: string;
  source: string;
  change?: number;
}

interface ApiResponse {
  commodities: CommodityPrice[];
  updatedAt: string | null;
}

const SAMPLE_DATA: CommodityPrice[] = [
  { commodity: 'Wheat', city: 'Lahore', price: 5200, unit: '40kg', date: '2026-03-15', source: 'Sample', change: 1.2 },
  { commodity: 'Rice (Basmati)', city: 'Lahore', price: 8500, unit: '40kg', date: '2026-03-15', source: 'Sample', change: -0.5 },
  { commodity: 'Sugar', city: 'Karachi', price: 180, unit: 'kg', date: '2026-03-15', source: 'Sample', change: 0 },
  { commodity: 'Flour', city: 'Islamabad', price: 140, unit: 'kg', date: '2026-03-15', source: 'Sample', change: 2.1 },
  { commodity: 'Tomato', city: 'Peshawar', price: 220, unit: 'kg', date: '2026-03-15', source: 'Sample', change: -3.5 },
  { commodity: 'Onion', city: 'Multan', price: 160, unit: 'kg', date: '2026-03-15', source: 'Sample', change: 1.8 },
  { commodity: 'Potato', city: 'Quetta', price: 120, unit: 'kg', date: '2026-03-15', source: 'Sample', change: 0.5 },
  { commodity: 'Gold (24k)', city: 'National', price: 320900, unit: 'tola', date: '2026-03-15', source: 'Sample', change: 0.8 },
];

export default function MandiTable() {
  const [prices, setPrices] = useState<CommodityPrice[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price' | 'change'>('price');

  useEffect(() => {
    fetch('/api/commodities')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ApiResponse>;
      })
      .then(data => {
        setPrices(data.commodities);
        setUpdatedAt(data.updatedAt);
      })
      .catch(() => {
        setPrices(SAMPLE_DATA);
        setError('Live data unavailable — showing sample prices for illustration');
      })
      .finally(() => setLoading(false));
  }, []);

  const cities = useMemo(() => {
    const unique = [...new Set(prices.map(p => p.city))];
    return ['all', ...unique.sort()];
  }, [prices]);

  const commodities = useMemo(() => {
    const unique = [...new Set(prices.map(p => p.commodity))];
    return ['all', ...unique.sort()];
  }, [prices]);

  const filteredPrices = useMemo(() => {
    let filtered = prices;
    if (selectedCity !== 'all') filtered = filtered.filter(p => p.city === selectedCity);
    if (selectedCommodity !== 'all') filtered = filtered.filter(p => p.commodity === selectedCommodity);
    if (sortBy === 'price') filtered = [...filtered].sort((a, b) => b.price - a.price);
    else if (sortBy === 'change') filtered = [...filtered].sort((a, b) => (b.change ?? 0) - (a.change ?? 0));
    return filtered;
  }, [prices, selectedCity, selectedCommodity, sortBy]);

  const formatPrice = (price: number) => new Intl.NumberFormat('en-PK').format(price);

  const getChangeColor = (change?: number) => {
    if (!change) return 'text-gray-500';
    return change > 0 ? 'text-red-600' : 'text-green-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Gold & Silver Prices</h3>
        <p className="text-gray-600 text-sm">Live 24K gold and silver rates in PKR, sourced from international markets</p>
        {error && <p className="mt-1 text-amber-600 text-xs">{error}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label htmlFor="city-filter" className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <select id="city-filter" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
            {cities.map(city => <option key={city} value={city}>{city === 'all' ? 'All Cities' : city}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="commodity-filter" className="block text-sm font-medium text-gray-700 mb-1">Commodity</label>
          <select id="commodity-filter" value={selectedCommodity} onChange={e => setSelectedCommodity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
            {commodities.map(c => <option key={c} value={c}>{c === 'all' ? 'All Commodities' : c.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
          <select id="sort-by" value={sortBy} onChange={e => setSortBy(e.target.value as 'price' | 'change')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
            <option value="price">Price (High to Low)</option>
            <option value="change">Price Change</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-700">Commodity</th>
              <th className="text-left p-3 font-semibold text-gray-700">City</th>
              <th className="text-right p-3 font-semibold text-gray-700">Price</th>
              <th className="text-center p-3 font-semibold text-gray-700">Change</th>
              <th className="text-center p-3 font-semibold text-gray-700">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredPrices.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  {prices.length === 0 ? 'No price data available' : 'No entries match current filters'}
                </td>
              </tr>
            ) : (
              filteredPrices.map((price, i) => (
                <tr key={i} className="border-t border-gray-200 hover:bg-gray-50 transition">
                  <td className="p-3 font-medium text-gray-900">{price.commodity.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-gray-600">{price.city}</td>
                  <td className="p-3 text-right font-semibold text-gray-900">
                    PKR {formatPrice(price.price)} <span className="text-gray-500 text-xs">/{price.unit}</span>
                  </td>
                  <td className={`p-3 text-center ${getChangeColor(price.change)}`}>
                    {price.change != null ? `${price.change > 0 ? '↑' : '↓'} ${Math.abs(price.change).toFixed(2)}%` : '—'}
                  </td>
                  <td className="p-3 text-center text-gray-500 text-xs">
                    {new Date(price.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {updatedAt && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
          <span>{filteredPrices.length} entries displayed</span>
          <span>Data updated: {new Date(updatedAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      )}
    </div>
  );
}
