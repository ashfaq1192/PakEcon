/**
 * Pakistani number formatting utilities
 * Uses Lakh/Crore system as preferred by Pakistani users
 */

const LAKH = 100_000;
const CRORE = 10_000_000;

/**
 * Returns a human-friendly Lakh/Crore label for a PKR amount.
 * e.g. 600000 → "6 Lakh"  |  12500000 → "1.25 Crore"
 */
export function formatLakhCrore(n: number): string {
  if (n >= CRORE) {
    const crore = n / CRORE;
    return `${+crore.toFixed(2)} Crore`;
  }
  if (n >= LAKH) {
    const lakh = n / LAKH;
    return `${+lakh.toFixed(2)} Lakh`;
  }
  if (n >= 1000) {
    return `${+(n / 1000).toFixed(1)} Hazar`;
  }
  return String(Math.round(n));
}

/**
 * Formats a PKR amount with the Indo-Arabic comma system (1,00,000).
 * e.g. 1234567 → "12,34,567"
 */
export function formatIndianComma(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return s;
  // Last 3 digits, then groups of 2
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return grouped + ',' + last3;
}

/**
 * Full PKR display with Indian comma + Lakh/Crore label.
 * e.g. 1234567 → "PKR 12,34,567 (12.35 Lakh)"
 */
export function formatPKRFull(n: number): { formatted: string; label: string } {
  return {
    formatted: 'PKR ' + formatIndianComma(n),
    label: formatLakhCrore(n),
  };
}
