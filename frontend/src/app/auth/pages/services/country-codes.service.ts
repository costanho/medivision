import { Injectable } from '@angular/core';

export interface CountryCode {
  code: string;
  country: string;
}

/**
 * Country Codes Service
 *
 * Provides a comprehensive list of country telephone codes
 * organized by region for phone number input forms
 */
@Injectable({
  providedIn: 'root'
})
export class CountryCodesService {

  private countryCodes: CountryCode[] = [
    // Africa (54 countries)
    { code: '+27', country: 'South Africa' },
    { code: '+234', country: 'Nigeria' },
    { code: '+254', country: 'Kenya' },
    { code: '+256', country: 'Uganda' },
    { code: '+255', country: 'Tanzania' },
    { code: '+260', country: 'Zambia' },
    { code: '+263', country: 'Zimbabwe' },
    { code: '+265', country: 'Malawi' },
    { code: '+258', country: 'Mozambique' },
    { code: '+267', country: 'Botswana' },
    { code: '+264', country: 'Namibia' },
    { code: '+268', country: 'Eswatini' },
    { code: '+266', country: 'Lesotho' },
    { code: '+269', country: 'Comoros' },
    { code: '+290', country: 'Saint Helena' },
    { code: '+291', country: 'Eritrea' },
    { code: '+212', country: 'Morocco' },
    { code: '+213', country: 'Algeria' },
    { code: '+216', country: 'Tunisia' },
    { code: '+218', country: 'Libya' },
    { code: '+220', country: 'Gambia' },
    { code: '+221', country: 'Senegal' },
    { code: '+222', country: 'Mauritania' },
    { code: '+223', country: 'Mali' },
    { code: '+224', country: 'Guinea' },
    { code: '+225', country: 'Ivory Coast' },
    { code: '+226', country: 'Burkina Faso' },
    { code: '+227', country: 'Niger' },
    { code: '+228', country: 'Togo' },
    { code: '+229', country: 'Benin' },
    { code: '+230', country: 'Mauritius' },
    { code: '+231', country: 'Liberia' },
    { code: '+232', country: 'Sierra Leone' },
    { code: '+233', country: 'Ghana' },
    { code: '+235', country: 'Chad' },
    { code: '+236', country: 'Central African Republic' },
    { code: '+237', country: 'Cameroon' },
    { code: '+238', country: 'Cape Verde' },
    { code: '+239', country: 'São Tomé and Príncipe' },
    { code: '+240', country: 'Equatorial Guinea' },
    { code: '+241', country: 'Gabon' },
    { code: '+242', country: 'Congo' },
    { code: '+243', country: 'Democratic Republic of the Congo' },
    { code: '+244', country: 'Angola' },
    { code: '+245', country: 'Guinea-Bissau' },
    { code: '+246', country: 'Diego Garcia' },
    { code: '+248', country: 'Seychelles' },
    { code: '+249', country: 'Sudan' },
    { code: '+250', country: 'Rwanda' },
    { code: '+251', country: 'Ethiopia' },
    { code: '+252', country: 'Somalia' },
    { code: '+253', country: 'Djibouti' },

    // Americas (38 countries)
    { code: '+1', country: 'United States' },
    { code: '+1', country: 'Canada' },
    { code: '+1', country: 'Bahamas' },
    { code: '+1', country: 'Barbados' },
    { code: '+1', country: 'Belize' },
    { code: '+1', country: 'Dominican Republic' },
    { code: '+1', country: 'Jamaica' },
    { code: '+1', country: 'Puerto Rico' },
    { code: '+1', country: 'Trinidad and Tobago' },
    { code: '+55', country: 'Brazil' },
    { code: '+56', country: 'Chile' },
    { code: '+57', country: 'Colombia' },
    { code: '+58', country: 'Venezuela' },
    { code: '+51', country: 'Peru' },
    { code: '+54', country: 'Argentina' },
    { code: '+595', country: 'Paraguay' },
    { code: '+598', country: 'Uruguay' },
    { code: '+591', country: 'Bolivia' },
    { code: '+592', country: 'Guyana' },
    { code: '+593', country: 'Ecuador' },
    { code: '+594', country: 'French Guiana' },
    { code: '+597', country: 'Suriname' },
    { code: '+52', country: 'Mexico' },
    { code: '+502', country: 'Guatemala' },
    { code: '+503', country: 'El Salvador' },
    { code: '+504', country: 'Honduras' },
    { code: '+505', country: 'Nicaragua' },
    { code: '+506', country: 'Costa Rica' },
    { code: '+507', country: 'Panama' },
    { code: '+53', country: 'Cuba' },
    { code: '+1', country: 'Antigua and Barbuda' },
    { code: '+1', country: 'Dominica' },
    { code: '+1', country: 'Grenada' },
    { code: '+1', country: 'Saint Kitts and Nevis' },
    { code: '+1', country: 'Saint Lucia' },
    { code: '+1', country: 'Saint Vincent and the Grenadines' },

    // Europe (49 countries)
    { code: '+44', country: 'United Kingdom' },
    { code: '+353', country: 'Ireland' },
    { code: '+33', country: 'France' },
    { code: '+49', country: 'Germany' },
    { code: '+39', country: 'Italy' },
    { code: '+34', country: 'Spain' },
    { code: '+31', country: 'Netherlands' },
    { code: '+32', country: 'Belgium' },
    { code: '+43', country: 'Austria' },
    { code: '+41', country: 'Switzerland' },
    { code: '+45', country: 'Denmark' },
    { code: '+46', country: 'Sweden' },
    { code: '+47', country: 'Norway' },
    { code: '+48', country: 'Poland' },
    { code: '+40', country: 'Romania' },
    { code: '+359', country: 'Bulgaria' },
    { code: '+385', country: 'Croatia' },
    { code: '+381', country: 'Serbia' },
    { code: '+386', country: 'Slovenia' },
    { code: '+387', country: 'Bosnia and Herzegovina' },
    { code: '+389', country: 'North Macedonia' },
    { code: '+30', country: 'Greece' },
    { code: '+358', country: 'Finland' },
    { code: '+420', country: 'Czech Republic' },
    { code: '+421', country: 'Slovakia' },
    { code: '+36', country: 'Hungary' },
    { code: '+370', country: 'Lithuania' },
    { code: '+371', country: 'Latvia' },
    { code: '+372', country: 'Estonia' },
    { code: '+373', country: 'Moldova' },
    { code: '+374', country: 'Armenia' },
    { code: '+375', country: 'Belarus' },
    { code: '+380', country: 'Ukraine' },
    { code: '+38', country: 'Russia' },
    { code: '+350', country: 'Gibraltar' },
    { code: '+351', country: 'Portugal' },
    { code: '+352', country: 'Luxembourg' },
    { code: '+354', country: 'Iceland' },
    { code: '+355', country: 'Albania' },
    { code: '+356', country: 'Malta' },
    { code: '+357', country: 'Cyprus' },
    { code: '+361', country: 'Andorra' },
    { code: '+376', country: 'Andorra' },
    { code: '+377', country: 'Monaco' },
    { code: '+378', country: 'San Marino' },
    { code: '+379', country: 'Vatican City' },
    { code: '+382', country: 'Montenegro' },
    { code: '+383', country: 'Kosovo' },
    { code: '+388', country: 'Liechtenstein' },

    // Asia & Middle East (47 countries)
    { code: '+91', country: 'India' },
    { code: '+92', country: 'Pakistan' },
    { code: '+880', country: 'Bangladesh' },
    { code: '+94', country: 'Sri Lanka' },
    { code: '+95', country: 'Myanmar' },
    { code: '+66', country: 'Thailand' },
    { code: '+60', country: 'Malaysia' },
    { code: '+65', country: 'Singapore' },
    { code: '+62', country: 'Indonesia' },
    { code: '+63', country: 'Philippines' },
    { code: '+84', country: 'Vietnam' },
    { code: '+85', country: 'Cambodia' },
    { code: '+856', country: 'Laos' },
    { code: '+86', country: 'China' },
    { code: '+81', country: 'Japan' },
    { code: '+82', country: 'South Korea' },
    { code: '+850', country: 'North Korea' },
    { code: '+886', country: 'Taiwan' },
    { code: '+852', country: 'Hong Kong' },
    { code: '+853', country: 'Macao' },
    { code: '+976', country: 'Mongolia' },
    { code: '+977', country: 'Nepal' },
    { code: '+93', country: 'Afghanistan' },
    { code: '+98', country: 'Iran' },
    { code: '+964', country: 'Iraq' },
    { code: '+966', country: 'Saudi Arabia' },
    { code: '+971', country: 'United Arab Emirates' },
    { code: '+973', country: 'Bahrain' },
    { code: '+974', country: 'Qatar' },
    { code: '+965', country: 'Kuwait' },
    { code: '+968', country: 'Oman' },
    { code: '+967', country: 'Yemen' },
    { code: '+970', country: 'Palestine' },
    { code: '+972', country: 'Israel' },
    { code: '+961', country: 'Lebanon' },
    { code: '+963', country: 'Syria' },
    { code: '+962', country: 'Jordan' },
    { code: '+975', country: 'Bhutan' },
    { code: '+88', country: 'Sri Lanka' },
    { code: '+90', country: 'Turkey' },
    { code: '+992', country: 'Tajikistan' },
    { code: '+993', country: 'Turkmenistan' },
    { code: '+998', country: 'Uzbekistan' },
    { code: '+996', country: 'Kyrgyzstan' },
    { code: '+994', country: 'Azerbaijan' },
    { code: '+995', country: 'Georgia' },

    // Oceania (13 countries)
    { code: '+61', country: 'Australia' },
    { code: '+64', country: 'New Zealand' },
    { code: '+679', country: 'Fiji' },
    { code: '+685', country: 'Samoa' },
    { code: '+689', country: 'French Polynesia' },
    { code: '+674', country: 'Nauru' },
    { code: '+678', country: 'Vanuatu' },
    { code: '+682', country: 'Cook Islands' },
    { code: '+686', country: 'Kiribati' },
    { code: '+688', country: 'Tuvalu' },
    { code: '+691', country: 'Micronesia' },
    { code: '+692', country: 'Marshall Islands' },
    { code: '+680', country: 'Palau' },
    { code: '+870', country: 'Inmarsat' },
    { code: '+878', country: 'Universal Personal Telecommunications' },
  ];

  constructor() {}

  /**
   * Get all country codes
   * @returns Array of all country codes with their countries
   */
  getAllCountryCodes(): CountryCode[] {
    return this.countryCodes;
  }

  /**
   * Search country codes by country name
   * @param searchTerm - Country name to search
   * @returns Filtered array of matching countries
   */
  searchCountries(searchTerm: string): CountryCode[] {
    if (!searchTerm || searchTerm.trim() === '') {
      return this.countryCodes;
    }

    const term = searchTerm.toLowerCase();
    return this.countryCodes.filter(item =>
      item.country.toLowerCase().includes(term)
    );
  }

  /**
   * Get country code by country name
   * @param countryName - Name of the country
   * @returns Country code or null if not found
   */
  getCodeByCountry(countryName: string): string | null {
    const country = this.countryCodes.find(
      item => item.country.toLowerCase() === countryName.toLowerCase()
    );
    return country ? country.code : null;
  }

  /**
   * Get country name by country code
   * @param code - Country code (e.g., '+1')
   * @returns Array of countries with that code
   */
  getCountriesByCode(code: string): CountryCode[] {
    return this.countryCodes.filter(item => item.code === code);
  }

  /**
   * Get countries by region
   * @param region - Region name (Africa, Americas, Europe, Asia, Oceania)
   * @returns Filtered array of countries in that region
   */
  getCountriesByRegion(region: string): CountryCode[] {
    const regionMap: { [key: string]: string[] } = {
      'Africa': ['South Africa', 'Nigeria', 'Kenya', 'Uganda', 'Tanzania', 'Zambia', 'Zimbabwe', 'Malawi', 'Mozambique', 'Botswana', 'Namibia', 'Eswatini', 'Lesotho', 'Comoros', 'Eritrea', 'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Gambia', 'Senegal', 'Mali', 'Guinea', 'Ivory Coast', 'Burkina Faso', 'Niger', 'Togo', 'Benin', 'Mauritius', 'Liberia', 'Sierra Leone', 'Ghana', 'Chad', 'Central African Republic', 'Cameroon', 'Cape Verde', 'Equatorial Guinea', 'Gabon', 'Congo', 'Democratic Republic of the Congo', 'Angola', 'Guinea-Bissau', 'Seychelles', 'Sudan', 'Rwanda', 'Ethiopia', 'Somalia', 'Djibouti'],
      'Americas': ['United States', 'Canada', 'Bahamas', 'Barbados', 'Belize', 'Dominican Republic', 'Jamaica', 'Puerto Rico', 'Trinidad and Tobago', 'Brazil', 'Chile', 'Colombia', 'Venezuela', 'Peru', 'Argentina', 'Paraguay', 'Uruguay', 'Bolivia', 'Guyana', 'Ecuador', 'French Guiana', 'Suriname', 'Mexico', 'Guatemala', 'El Salvador', 'Honduras', 'Nicaragua', 'Costa Rica', 'Panama', 'Cuba', 'Antigua and Barbuda', 'Dominica', 'Grenada', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines'],
      'Europe': ['United Kingdom', 'Ireland', 'France', 'Germany', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Austria', 'Switzerland', 'Denmark', 'Sweden', 'Norway', 'Poland', 'Romania', 'Bulgaria', 'Croatia', 'Serbia', 'Slovenia', 'Bosnia and Herzegovina', 'North Macedonia', 'Greece', 'Finland', 'Czech Republic', 'Slovakia', 'Hungary', 'Lithuania', 'Latvia', 'Estonia', 'Moldova', 'Armenia', 'Belarus', 'Ukraine', 'Russia', 'Gibraltar', 'Portugal', 'Luxembourg', 'Iceland', 'Albania', 'Malta', 'Cyprus', 'Monaco', 'San Marino', 'Vatican City', 'Montenegro', 'Kosovo', 'Liechtenstein'],
      'Asia': ['India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Myanmar', 'Thailand', 'Malaysia', 'Singapore', 'Indonesia', 'Philippines', 'Vietnam', 'Cambodia', 'Laos', 'China', 'Japan', 'South Korea', 'North Korea', 'Taiwan', 'Hong Kong', 'Macao', 'Mongolia', 'Nepal', 'Afghanistan', 'Iran', 'Iraq', 'Saudi Arabia', 'United Arab Emirates', 'Bahrain', 'Qatar', 'Kuwait', 'Oman', 'Yemen', 'Palestine', 'Israel', 'Lebanon', 'Syria', 'Jordan', 'Bhutan', 'Turkey', 'Tajikistan', 'Turkmenistan', 'Uzbekistan', 'Kyrgyzstan', 'Azerbaijan', 'Georgia'],
      'Oceania': ['Australia', 'New Zealand', 'Fiji', 'Samoa', 'French Polynesia', 'Nauru', 'Vanuatu', 'Cook Islands', 'Kiribati', 'Tuvalu', 'Micronesia', 'Marshall Islands', 'Palau']
    };

    const countries = regionMap[region] || [];
    return this.countryCodes.filter(item => countries.includes(item.country));
  }
}
