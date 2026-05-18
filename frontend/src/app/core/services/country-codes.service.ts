import { Injectable } from '@angular/core';

export interface CountryCode {
  code: string;
  country: string;
}

@Injectable({
  providedIn: 'root'
})
export class CountryCodesService {
  private countries: string[] = [
    'Zimbabwe',
    'Afghanistan',
    'Albania',
    'Algeria',
    'Andorra',
    'Angola',
    'Argentina',
    'Australia',
    'Austria',
    'Azerbaijan',
    'Bahamas',
    'Bahrain',
    'Bangladesh',
    'Barbados',
    'Belarus',
    'Belgium',
    'Belize',
    'Benin',
    'Bhutan',
    'Bolivia',
    'Bosnia and Herzegovina',
    'Botswana',
    'Brazil',
    'Brunei',
    'Bulgaria',
    'Burkina Faso',
    'Burundi',
    'Cambodia',
    'Cameroon',
    'Canada',
    'Cape Verde',
    'Central African Republic',
    'Chad',
    'Chile',
    'China',
    'Colombia',
    'Comoros',
    'Congo',
    'Costa Rica',
    'Croatia',
    'Cuba',
    'Cyprus',
    'Czech Republic',
    'Denmark',
    'Djibouti',
    'Dominica',
    'Dominican Republic',
    'East Timor',
    'Ecuador',
    'Egypt',
    'El Salvador',
    'Equatorial Guinea',
    'Eritrea',
    'Estonia',
    'Ethiopia',
    'Fiji',
    'Finland',
    'France',
    'Gabon',
    'Gambia',
    'Georgia',
    'Germany',
    'Ghana',
    'Greece',
    'Grenada',
    'Guatemala',
    'Guinea',
    'Guinea-Bissau',
    'Guyana',
    'Haiti',
    'Honduras',
    'Hungary',
    'Iceland',
    'India',
    'Indonesia',
    'Iran',
    'Iraq',
    'Ireland',
    'Israel',
    'Italy',
    'Ivory Coast',
    'Jamaica',
    'Japan',
    'Jordan',
    'Kazakhstan',
    'Kenya',
    'Kiribati',
    'Kosovo',
    'Kuwait',
    'Kyrgyzstan',
    'Laos',
    'Latvia',
    'Lebanon',
    'Lesotho',
    'Liberia',
    'Libya',
    'Liechtenstein',
    'Lithuania',
    'Luxembourg',
    'Madagascar',
    'Malawi',
    'Malaysia',
    'Maldives',
    'Mali',
    'Malta',
    'Marshall Islands',
    'Mauritania',
    'Mauritius',
    'Mexico',
    'Micronesia',
    'Moldova',
    'Monaco',
    'Mongolia',
    'Montenegro',
    'Morocco',
    'Mozambique',
    'Myanmar',
    'Namibia',
    'Nauru',
    'Nepal',
    'Netherlands',
    'New Zealand',
    'Nicaragua',
    'Niger',
    'Nigeria',
    'North Korea',
    'North Macedonia',
    'Norway',
    'Oman',
    'Pakistan',
    'Palau',
    'Palestine',
    'Panama',
    'Papua New Guinea',
    'Paraguay',
    'Peru',
    'Philippines',
    'Poland',
    'Portugal',
    'Qatar',
    'Romania',
    'Russia',
    'Rwanda',
    'Saint Kitts and Nevis',
    'Saint Lucia',
    'Saint Vincent and the Grenadines',
    'Samoa',
    'San Marino',
    'Sao Tome and Principe',
    'Saudi Arabia',
    'Senegal',
    'Serbia',
    'Seychelles',
    'Sierra Leone',
    'Singapore',
    'Slovakia',
    'Slovenia',
    'Solomon Islands',
    'Somalia',
    'South Africa',
    'South Korea',
    'South Sudan',
    'Spain',
    'Sri Lanka',
    'Sudan',
    'Suriname',
    'Sweden',
    'Switzerland',
    'Syria',
    'Taiwan',
    'Tajikistan',
    'Tanzania',
    'Thailand',
    'Togo',
    'Tonga',
    'Trinidad and Tobago',
    'Tunisia',
    'Turkey',
    'Turkmenistan',
    'Tuvalu',
    'Uganda',
    'Ukraine',
    'United Arab Emirates',
    'United Kingdom',
    'United States',
    'Uruguay',
    'Uzbekistan',
    'Vanuatu',
    'Vatican City',
    'Venezuela',
    'Vietnam',
    'Yemen',
    'Zambia'
  ];

  private countryCodes: CountryCode[] = [
    { code: '+263', country: 'Zimbabwe' },
    { code: '+1', country: 'USA/Canada' },
    { code: '+44', country: 'UK' },
    { code: '+27', country: 'South Africa' },
    { code: '+260', country: 'Zambia' },
    { code: '+265', country: 'Malawi' },
    { code: '+256', country: 'Uganda' },
    { code: '+254', country: 'Kenya' },
    { code: '+255', country: 'Tanzania' },
    { code: '+212', country: 'Morocco' },
    { code: '+234', country: 'Nigeria' },
    { code: '+233', country: 'Ghana' },
    { code: '+358', country: 'Finland' },
    { code: '+33', country: 'France' },
    { code: '+49', country: 'Germany' },
    { code: '+39', country: 'Italy' },
    { code: '+34', country: 'Spain' },
    { code: '+31', country: 'Netherlands' },
    { code: '+47', country: 'Norway' },
    { code: '+46', country: 'Sweden' },
    { code: '+41', country: 'Switzerland' },
    { code: '+43', country: 'Austria' },
    { code: '+32', country: 'Belgium' },
    { code: '+45', country: 'Denmark' },
    { code: '+353', country: 'Ireland' },
    { code: '+48', country: 'Poland' },
    { code: '+30', country: 'Greece' },
    { code: '+420', country: 'Czech Republic' },
    { code: '+36', country: 'Hungary' },
    { code: '+40', country: 'Romania' },
    { code: '+359', country: 'Bulgaria' },
    { code: '+385', country: 'Croatia' },
    { code: '+387', country: 'Bosnia and Herzegovina' },
    { code: '+381', country: 'Serbia' },
    { code: '+382', country: 'Montenegro' },
    { code: '+354', country: 'Iceland' },
    { code: '+61', country: 'Australia' },
    { code: '+64', country: 'New Zealand' },
    { code: '+65', country: 'Singapore' },
    { code: '+60', country: 'Malaysia' },
    { code: '+66', country: 'Thailand' },
    { code: '+84', country: 'Vietnam' },
    { code: '+63', country: 'Philippines' },
    { code: '+62', country: 'Indonesia' },
    { code: '+81', country: 'Japan' },
    { code: '+82', country: 'South Korea' },
    { code: '+86', country: 'China' },
    { code: '+91', country: 'India' },
    { code: '+92', country: 'Pakistan' },
    { code: '+880', country: 'Bangladesh' },
    { code: '+55', country: 'Brazil' },
    { code: '+56', country: 'Chile' },
    { code: '+57', country: 'Colombia' },
    { code: '+54', country: 'Argentina' },
    { code: '+51', country: 'Peru' },
    { code: '+58', country: 'Venezuela' },
    { code: '+52', country: 'Mexico' },
    { code: '+1', country: 'USA' },
    { code: '+1', country: 'Canada' },
    { code: '+880', country: 'Bangladesh' },
    { code: '+880', country: 'Bangladesh' },
    { code: '+55', country: 'Brazil' },
    { code: '+56', country: 'Chile' },
    { code: '+57', country: 'Colombia' },
    { code: '+54', country: 'Argentina' },
    { code: '+51', country: 'Peru' },
    { code: '+58', country: 'Venezuela' },
    { code: '+52', country: 'Mexico' },
    { code: '+966', country: 'Saudi Arabia' },
    { code: '+971', country: 'United Arab Emirates' },
    { code: '+974', country: 'Qatar' },
    { code: '+973', country: 'Bahrain' },
    { code: '+968', country: 'Oman' },
    { code: '+965', country: 'Kuwait' },
    { code: '+212', country: 'Morocco' },
    { code: '+216', country: 'Tunisia' },
    { code: '+213', country: 'Algeria' },
    { code: '+20', country: 'Egypt' },
    { code: '+231', country: 'Liberia' },
    { code: '+232', country: 'Sierra Leone' },
    { code: '+226', country: 'Burkina Faso' },
    { code: '+225', country: 'Ivory Coast' },
    { code: '+222', country: 'Mauritania' },
    { code: '+221', country: 'Senegal' },
    { code: '+223', country: 'Mali' },
    { code: '+229', country: 'Benin' },
    { code: '+227', country: 'Niger' },
    { code: '+237', country: 'Cameroon' },
    { code: '+242', country: 'Congo' },
    { code: '+243', country: 'Democratic Republic of Congo' },
    { code: '+220', country: 'Gambia' },
    { code: '+228', country: 'Togo' },
    { code: '+238', country: 'Cape Verde' },
    { code: '+244', country: 'Angola' },
    { code: '+297', country: 'Aruba' },
    { code: '+212', country: 'Morocco' }
  ];

  constructor() {}

  /**
   * Get all country codes
   */
  getCountryCodes(): CountryCode[] {
    return this.countryCodes;
  }

  /**
   * Get country code by country name
   */
  getCodeByCountry(country: string): string | undefined {
    const countryCode = this.countryCodes.find(cc => cc.country === country);
    return countryCode?.code;
  }

  /**
   * Get country name by code
   */
  getCountryByCode(code: string): string | undefined {
    const countryCode = this.countryCodes.find(cc => cc.code === code);
    return countryCode?.country;
  }

  /**
   * Get sorted unique country codes
   */
  getUniqueSortedCodes(): CountryCode[] {
    const uniqueCodesMap = new Map<string, CountryCode>();
    this.countryCodes.forEach(cc => {
      if (!uniqueCodesMap.has(cc.code)) {
        uniqueCodesMap.set(cc.code, cc);
      }
    });
    return Array.from(uniqueCodesMap.values()).sort((a, b) => {
      // Sort by code numerically
      const aNum = parseInt(a.code.replace('+', ''), 10);
      const bNum = parseInt(b.code.replace('+', ''), 10);
      return aNum - bNum;
    });
  }

  /**
   * Get default country code
   */
  getDefaultCode(): string {
    return '+263'; // Zimbabwe
  }

  /**
   * Get default country
   */
  getDefaultCountry(): string {
    return 'Zimbabwe';
  }

  /**
   * Get all countries list
   */
  getCountries(): string[] {
    return this.countries;
  }

  /**
   * Get sorted countries list
   */
  getSortedCountries(): string[] {
    return [...this.countries].sort((a, b) => a.localeCompare(b));
  }

  /**
   * Get countries by search term
   */
  searchCountries(searchTerm: string): string[] {
    const term = searchTerm.toLowerCase();
    return this.countries.filter(country =>
      country.toLowerCase().includes(term)
    );
  }
}
