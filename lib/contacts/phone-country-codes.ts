export type PhoneCountryCode = {
  iso2: string;
  name: string;
  dialCode: string;
};

export const PHONE_COUNTRY_CODES: PhoneCountryCode[] = [
  { iso2: "OM", name: "Oman", dialCode: "+968" },
  { iso2: "AE", name: "United Arab Emirates", dialCode: "+971" },
  { iso2: "SA", name: "Saudi Arabia", dialCode: "+966" },
  { iso2: "QA", name: "Qatar", dialCode: "+974" },
  { iso2: "KW", name: "Kuwait", dialCode: "+965" },
  { iso2: "BH", name: "Bahrain", dialCode: "+973" },
  { iso2: "GB", name: "United Kingdom", dialCode: "+44" },
  { iso2: "US", name: "United States", dialCode: "+1" },
  { iso2: "IN", name: "India", dialCode: "+91" },
  { iso2: "PK", name: "Pakistan", dialCode: "+92" },
  { iso2: "EG", name: "Egypt", dialCode: "+20" },
  { iso2: "CH", name: "Switzerland", dialCode: "+41" },
  { iso2: "FR", name: "France", dialCode: "+33" },
  { iso2: "DE", name: "Germany", dialCode: "+49" },
  { iso2: "CN", name: "China", dialCode: "+86" },
  { iso2: "HK", name: "Hong Kong", dialCode: "+852" },
  { iso2: "SG", name: "Singapore", dialCode: "+65" },
];

export const DEFAULT_PHONE_COUNTRY_CODE = "+968";
