/**
 * Analytics utility (T068)
 * Tracks tool usage events via Cloudflare Zaraz or beacon fallback.
 */

declare global {
  interface Window {
    zaraz?: {
      track: (event: string, properties?: Record<string, string>) => void;
    };
  }
}

export function trackToolUse(toolName: string): void {
  if (typeof window === 'undefined') return;
  if (window.zaraz) {
    window.zaraz.track('tool_used', { tool: toolName });
  }
}
