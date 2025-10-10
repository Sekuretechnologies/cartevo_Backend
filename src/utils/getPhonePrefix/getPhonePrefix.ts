import { getCode } from "country-list";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";

/**
 * Retourne le code téléphonique à partir du nom complet du pays
 * @param countryName Nom complet du pays, ex: "Cameroon", "France"
 * @returns code téléphonique ou null si non trouvé
 */
function getPhonePrefixByCountry(countryName: string): string | null {
  // Récupérer le code ISO du pays (ex: "CM", "FR")
  const isoCode = getCode(countryName);
  if (!isoCode) return null;

  try {
    // Obtenir le code téléphonique via libphonenumber-js
    const phoneCode = getCountryCallingCode(isoCode);
    return phoneCode;
  } catch (err) {
    return null;
  }
}

export default getPhonePrefixByCountry;
