import { getLocales } from 'expo-localization';

export interface Country {
  iso: string;
  name: string;
  code: string;
  flag: string;
}

export const countries: Country[] = [
  { iso: 'BR', name: 'Brazil', code: '+55', flag: '\u{1F1E7}\u{1F1F7}' },
  { iso: 'US', name: 'United States', code: '+1', flag: '\u{1F1FA}\u{1F1F8}' },
  { iso: 'PT', name: 'Portugal', code: '+351', flag: '\u{1F1F5}\u{1F1F9}' },
  { iso: 'AR', name: 'Argentina', code: '+54', flag: '\u{1F1E6}\u{1F1F7}' },
  { iso: 'CL', name: 'Chile', code: '+56', flag: '\u{1F1E8}\u{1F1F1}' },
  { iso: 'CO', name: 'Colombia', code: '+57', flag: '\u{1F1E8}\u{1F1F4}' },
  { iso: 'MX', name: 'Mexico', code: '+52', flag: '\u{1F1F2}\u{1F1FD}' },
  { iso: 'UY', name: 'Uruguay', code: '+598', flag: '\u{1F1FA}\u{1F1FE}' },
  { iso: 'PY', name: 'Paraguay', code: '+595', flag: '\u{1F1F5}\u{1F1FE}' },
  { iso: 'PE', name: 'Peru', code: '+51', flag: '\u{1F1F5}\u{1F1EA}' },
  { iso: 'BO', name: 'Bolivia', code: '+591', flag: '\u{1F1E7}\u{1F1F4}' },
  { iso: 'EC', name: 'Ecuador', code: '+593', flag: '\u{1F1EA}\u{1F1E8}' },
  { iso: 'VE', name: 'Venezuela', code: '+58', flag: '\u{1F1FB}\u{1F1EA}' },
  { iso: 'CA', name: 'Canada', code: '+1', flag: '\u{1F1E8}\u{1F1E6}' },
  { iso: 'GB', name: 'United Kingdom', code: '+44', flag: '\u{1F1EC}\u{1F1E7}' },
  { iso: 'DE', name: 'Germany', code: '+49', flag: '\u{1F1E9}\u{1F1EA}' },
  { iso: 'FR', name: 'France', code: '+33', flag: '\u{1F1EB}\u{1F1F7}' },
  { iso: 'ES', name: 'Spain', code: '+34', flag: '\u{1F1EA}\u{1F1F8}' },
  { iso: 'IT', name: 'Italy', code: '+39', flag: '\u{1F1EE}\u{1F1F9}' },
  { iso: 'JP', name: 'Japan', code: '+81', flag: '\u{1F1EF}\u{1F1F5}' },
  { iso: 'KR', name: 'South Korea', code: '+82', flag: '\u{1F1F0}\u{1F1F7}' },
  { iso: 'CN', name: 'China', code: '+86', flag: '\u{1F1E8}\u{1F1F3}' },
  { iso: 'IN', name: 'India', code: '+91', flag: '\u{1F1EE}\u{1F1F3}' },
  { iso: 'AU', name: 'Australia', code: '+61', flag: '\u{1F1E6}\u{1F1FA}' },
  { iso: 'NZ', name: 'New Zealand', code: '+64', flag: '\u{1F1F3}\u{1F1FF}' },
  { iso: 'ZA', name: 'South Africa', code: '+27', flag: '\u{1F1FF}\u{1F1E6}' },
  { iso: 'AO', name: 'Angola', code: '+244', flag: '\u{1F1E6}\u{1F1F4}' },
  { iso: 'MZ', name: 'Mozambique', code: '+258', flag: '\u{1F1F2}\u{1F1FF}' },
  { iso: 'IL', name: 'Israel', code: '+972', flag: '\u{1F1EE}\u{1F1F1}' },
  { iso: 'AE', name: 'United Arab Emirates', code: '+971', flag: '\u{1F1E6}\u{1F1EA}' },
];

const FALLBACK_COUNTRY = countries[0]; // Brazil

export function getDeviceDefaultCountry(): Country {
  const regionCode = getLocales()[0]?.regionCode?.toUpperCase();
  if (!regionCode) return FALLBACK_COUNTRY;
  return countries.find((c) => c.iso === regionCode) ?? FALLBACK_COUNTRY;
}
