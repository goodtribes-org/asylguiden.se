/**
 * Country configuration for the collector.
 *
 * Every upstream API wants the country code in a different shape — UNHCR uses
 * ISO-3 (`SWE`), Eurostat ISO-2 uppercase (`SE`), and Strapi's `country.code`
 * from #6 is ISO-2 lowercase (`se`). Keeping the mapping in one place is the
 * point of this file: spread across the clients, every new country would need
 * three separate corrections and would silently get two of them wrong.
 */
export interface CountryConfig {
  /** ISO 3166-1 alpha-2, lowercase. Matches `country.code` in Strapi (#6). */
  code: string;
  /** ISO 3166-1 alpha-3, uppercase. UNHCR's `coa` parameter. */
  iso3: string;
  /** ISO 3166-1 alpha-2, uppercase. Eurostat's `geo` dimension. */
  eurostatGeo: string;
  name: string;
}

export const COUNTRIES: Record<string, CountryConfig> = {
  se: { code: "se", iso3: "SWE", eurostatGeo: "SE", name: "Sverige" },
};

export const DEFAULT_COUNTRY = "se";

export function getCountry(code: string): CountryConfig | undefined {
  return COUNTRIES[code.toLowerCase()];
}

export function listCountryCodes(): string[] {
  return Object.keys(COUNTRIES);
}
