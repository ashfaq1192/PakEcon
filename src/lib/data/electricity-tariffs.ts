/**
 * NEPRA Electricity Tariff Constants (T028)
 *
 * Source: NEPRA notified tariffs for all 9 DISCOs.
 * Last verified: 2026-03-17
 * Updated via NEPRA notification; manual update required on each revision.
 *
 * Structure:
 * - slabs: progressive per-unit (kWh) rates
 * - fixedCharge: monthly fixed charge (PKR)
 * - fcaRate: Fuel Charge Adjustment per unit (PKR/kWh) — changes monthly
 * - gstRate: GST fraction (0.17 = 17%)
 */

export const LAST_VERIFIED_DATE = '2026-03-17';

export type ConsumerType = 'residential' | 'commercial' | 'agricultural';

export interface TariffSlab {
  /** Minimum units for this slab (inclusive) */
  min: number;
  /** Maximum units for this slab (inclusive), null = unlimited */
  max: number | null;
  /** Per-unit rate (PKR/kWh) for units within this slab */
  rate: number;
}

export interface DiscoTariff {
  name: string;
  residential: {
    slabs: TariffSlab[];
    fixedCharge: number;
    fcaRate: number;
  };
  commercial: {
    slabs: TariffSlab[];
    fixedCharge: number;
    fcaRate: number;
  };
  agricultural: {
    slabs: TariffSlab[];
    fixedCharge: number;
    fcaRate: number;
  };
}

/**
 * NEPRA notified tariff schedule — FY 2025-26
 * Residential slabs are progressive (each slab rate applies only to units in that band).
 * Commercial and agricultural are flat per-unit rates.
 */
export const DISCO_TARIFFS: Record<string, DiscoTariff> = {
  LESCO: {
    name: 'Lahore Electric Supply Company',
    residential: {
      slabs: [
        { min: 1, max: 100, rate: 7.74 },
        { min: 101, max: 200, rate: 10.06 },
        { min: 201, max: 300, rate: 14.43 },
        { min: 301, max: 400, rate: 20.17 },
        { min: 401, max: 500, rate: 22.65 },
        { min: 501, max: 600, rate: 25.09 },
        { min: 601, max: 700, rate: 25.09 },
        { min: 701, max: null, rate: 26.14 },
      ],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
    commercial: {
      slabs: [{ min: 1, max: null, rate: 26.97 }],
      fixedCharge: 400,
      fcaRate: 3.24,
    },
    agricultural: {
      slabs: [{ min: 1, max: null, rate: 15.80 }],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
  },

  HESCO: {
    name: 'Hyderabad Electric Supply Company',
    residential: {
      slabs: [
        { min: 1, max: 100, rate: 7.74 },
        { min: 101, max: 200, rate: 10.06 },
        { min: 201, max: 300, rate: 14.43 },
        { min: 301, max: 400, rate: 20.17 },
        { min: 401, max: 500, rate: 22.65 },
        { min: 501, max: 600, rate: 25.09 },
        { min: 601, max: 700, rate: 25.09 },
        { min: 701, max: null, rate: 26.14 },
      ],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
    commercial: {
      slabs: [{ min: 1, max: null, rate: 26.97 }],
      fixedCharge: 400,
      fcaRate: 3.24,
    },
    agricultural: {
      slabs: [{ min: 1, max: null, rate: 15.80 }],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
  },

  MEPCO: {
    name: 'Multan Electric Power Company',
    residential: {
      slabs: [
        { min: 1, max: 100, rate: 7.74 },
        { min: 101, max: 200, rate: 10.06 },
        { min: 201, max: 300, rate: 14.43 },
        { min: 301, max: 400, rate: 20.17 },
        { min: 401, max: 500, rate: 22.65 },
        { min: 501, max: 600, rate: 25.09 },
        { min: 601, max: 700, rate: 25.09 },
        { min: 701, max: null, rate: 26.14 },
      ],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
    commercial: {
      slabs: [{ min: 1, max: null, rate: 26.97 }],
      fixedCharge: 400,
      fcaRate: 3.24,
    },
    agricultural: {
      slabs: [{ min: 1, max: null, rate: 15.80 }],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
  },

  PESCO: {
    name: 'Peshawar Electric Supply Company',
    residential: {
      slabs: [
        { min: 1, max: 100, rate: 7.74 },
        { min: 101, max: 200, rate: 10.06 },
        { min: 201, max: 300, rate: 14.43 },
        { min: 301, max: 400, rate: 20.17 },
        { min: 401, max: 500, rate: 22.65 },
        { min: 501, max: 600, rate: 25.09 },
        { min: 601, max: 700, rate: 25.09 },
        { min: 701, max: null, rate: 26.14 },
      ],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
    commercial: {
      slabs: [{ min: 1, max: null, rate: 26.97 }],
      fixedCharge: 400,
      fcaRate: 3.24,
    },
    agricultural: {
      slabs: [{ min: 1, max: null, rate: 15.80 }],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
  },

  QESCO: {
    name: 'Quetta Electric Supply Company',
    residential: {
      slabs: [
        { min: 1, max: 100, rate: 7.74 },
        { min: 101, max: 200, rate: 10.06 },
        { min: 201, max: 300, rate: 14.43 },
        { min: 301, max: 400, rate: 20.17 },
        { min: 401, max: 500, rate: 22.65 },
        { min: 501, max: 600, rate: 25.09 },
        { min: 601, max: 700, rate: 25.09 },
        { min: 701, max: null, rate: 26.14 },
      ],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
    commercial: {
      slabs: [{ min: 1, max: null, rate: 26.97 }],
      fixedCharge: 400,
      fcaRate: 3.24,
    },
    agricultural: {
      slabs: [{ min: 1, max: null, rate: 15.80 }],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
  },

  IESCO: {
    name: 'Islamabad Electric Supply Company',
    residential: {
      slabs: [
        { min: 1, max: 100, rate: 7.74 },
        { min: 101, max: 200, rate: 10.06 },
        { min: 201, max: 300, rate: 14.43 },
        { min: 301, max: 400, rate: 20.17 },
        { min: 401, max: 500, rate: 22.65 },
        { min: 501, max: 600, rate: 25.09 },
        { min: 601, max: 700, rate: 25.09 },
        { min: 701, max: null, rate: 26.14 },
      ],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
    commercial: {
      slabs: [{ min: 1, max: null, rate: 26.97 }],
      fixedCharge: 400,
      fcaRate: 3.24,
    },
    agricultural: {
      slabs: [{ min: 1, max: null, rate: 15.80 }],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
  },

  GEPCO: {
    name: 'Gujranwala Electric Power Company',
    residential: {
      slabs: [
        { min: 1, max: 100, rate: 7.74 },
        { min: 101, max: 200, rate: 10.06 },
        { min: 201, max: 300, rate: 14.43 },
        { min: 301, max: 400, rate: 20.17 },
        { min: 401, max: 500, rate: 22.65 },
        { min: 501, max: 600, rate: 25.09 },
        { min: 601, max: 700, rate: 25.09 },
        { min: 701, max: null, rate: 26.14 },
      ],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
    commercial: {
      slabs: [{ min: 1, max: null, rate: 26.97 }],
      fixedCharge: 400,
      fcaRate: 3.24,
    },
    agricultural: {
      slabs: [{ min: 1, max: null, rate: 15.80 }],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
  },

  SEPCO: {
    name: 'Sukkur Electric Power Company',
    residential: {
      slabs: [
        { min: 1, max: 100, rate: 7.74 },
        { min: 101, max: 200, rate: 10.06 },
        { min: 201, max: 300, rate: 14.43 },
        { min: 301, max: 400, rate: 20.17 },
        { min: 401, max: 500, rate: 22.65 },
        { min: 501, max: 600, rate: 25.09 },
        { min: 601, max: 700, rate: 25.09 },
        { min: 701, max: null, rate: 26.14 },
      ],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
    commercial: {
      slabs: [{ min: 1, max: null, rate: 26.97 }],
      fixedCharge: 400,
      fcaRate: 3.24,
    },
    agricultural: {
      slabs: [{ min: 1, max: null, rate: 15.80 }],
      fixedCharge: 150,
      fcaRate: 3.24,
    },
  },

  KELECTRIC: {
    name: 'K-Electric (Karachi)',
    residential: {
      slabs: [
        { min: 1, max: 100, rate: 8.00 },
        { min: 101, max: 200, rate: 10.50 },
        { min: 201, max: 300, rate: 16.00 },
        { min: 301, max: 400, rate: 21.00 },
        { min: 401, max: 500, rate: 23.50 },
        { min: 501, max: 600, rate: 26.00 },
        { min: 601, max: 700, rate: 26.00 },
        { min: 701, max: null, rate: 27.00 },
      ],
      fixedCharge: 200,
      fcaRate: 3.40,
    },
    commercial: {
      slabs: [{ min: 1, max: null, rate: 28.00 }],
      fixedCharge: 500,
      fcaRate: 3.40,
    },
    agricultural: {
      slabs: [{ min: 1, max: null, rate: 16.50 }],
      fixedCharge: 200,
      fcaRate: 3.40,
    },
  },
};

export const GST_RATE = 0.17;

export const DISCO_CODES = Object.keys(DISCO_TARIFFS) as Array<keyof typeof DISCO_TARIFFS>;
