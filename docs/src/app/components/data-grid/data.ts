export interface Country {
  code: string;
  country: string;
  continent: string;
  capital: string;
  population: number;
  area: number;
}

/** Small sample for the live examples (approximate 2023 figures). */
export const COUNTRIES: Country[] = [
  { code: 'BR', country: 'Brazil', continent: 'South America', capital: 'Brasília', population: 216422446, area: 8515767 },
  { code: 'AR', country: 'Argentina', continent: 'South America', capital: 'Buenos Aires', population: 45773884, area: 2780400 },
  { code: 'CO', country: 'Colombia', continent: 'South America', capital: 'Bogotá', population: 52085168, area: 1141748 },
  { code: 'CL', country: 'Chile', continent: 'South America', capital: 'Santiago', population: 19629590, area: 756102 },
  { code: 'US', country: 'United States', continent: 'North America', capital: 'Washington, D.C.', population: 339996563, area: 9833520 },
  { code: 'MX', country: 'Mexico', continent: 'North America', capital: 'Mexico City', population: 128455567, area: 1964375 },
  { code: 'CA', country: 'Canada', continent: 'North America', capital: 'Ottawa', population: 38781291, area: 9984670 },
  { code: 'DE', country: 'Germany', continent: 'Europe', capital: 'Berlin', population: 83294633, area: 357592 },
  { code: 'FR', country: 'France', continent: 'Europe', capital: 'Paris', population: 64756584, area: 643801 },
  { code: 'IT', country: 'Italy', continent: 'Europe', capital: 'Rome', population: 58870762, area: 301340 },
  { code: 'PT', country: 'Portugal', continent: 'Europe', capital: 'Lisbon', population: 10247605, area: 92212 },
  { code: 'JP', country: 'Japan', continent: 'Asia', capital: 'Tokyo', population: 123294513, area: 377975 },
  { code: 'IN', country: 'India', continent: 'Asia', capital: 'New Delhi', population: 1428627663, area: 3287263 },
  { code: 'KR', country: 'South Korea', continent: 'Asia', capital: 'Seoul', population: 51784059, area: 100210 },
  { code: 'NG', country: 'Nigeria', continent: 'Africa', capital: 'Abuja', population: 223804632, area: 923768 },
  { code: 'EG', country: 'Egypt', continent: 'Africa', capital: 'Cairo', population: 112716598, area: 1002450 },
  { code: 'KE', country: 'Kenya', continent: 'Africa', capital: 'Nairobi', population: 55100586, area: 580367 },
  { code: 'AU', country: 'Australia', continent: 'Oceania', capital: 'Canberra', population: 26439111, area: 7692024 },
];
