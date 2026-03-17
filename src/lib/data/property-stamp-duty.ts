/**
 * Property Stamp Duty Constants (T079)
 * Province-wise stamp duty, CVT, and registration fee rates.
 * Source: Punjab Stamp Duty, Sindh Stamp Act, KPK Finance Act, Balochistan Revenue, ICT regulations.
 * Last verified: 2026-03-17
 */

export const LAST_VERIFIED_DATE = '2026-03-17';

export interface ProvinceRates {
  name: string;
  stampDuty: number;       // fraction of property value
  cvtFiler: number;        // Capital Value Tax for active ATL filer
  cvtNonFiler: number;     // CVT for non-filer
  registrationFee: number; // DC office registration fee fraction
}

export const PROVINCE_STAMP_DUTY: Record<string, ProvinceRates> = {
  Punjab: {
    name: 'Punjab',
    stampDuty: 0.03,
    cvtFiler: 0.01,
    cvtNonFiler: 0.02,
    registrationFee: 0.01,
  },
  Sindh: {
    name: 'Sindh',
    stampDuty: 0.02,
    cvtFiler: 0.01,
    cvtNonFiler: 0.02,
    registrationFee: 0.005,
  },
  KPK: {
    name: 'Khyber Pakhtunkhwa',
    stampDuty: 0.03,
    cvtFiler: 0.01,
    cvtNonFiler: 0.02,
    registrationFee: 0.01,
  },
  Balochistan: {
    name: 'Balochistan',
    stampDuty: 0.02,
    cvtFiler: 0.01,
    cvtNonFiler: 0.02,
    registrationFee: 0.01,
  },
  ICT: {
    name: 'Islamabad Capital Territory (ICT)',
    stampDuty: 0.02,
    cvtFiler: 0.01,
    cvtNonFiler: 0.02,
    registrationFee: 0.01,
  },
};

export const PROVINCE_CODES = Object.keys(PROVINCE_STAMP_DUTY);
