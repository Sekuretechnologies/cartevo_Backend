import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const TIME_ZONE = "Africa/Douala";

// 🌍 Mapping des fuseaux horaires par pays
export const COUNTRY_TIMEZONES = {
  CM: "Africa/Douala", // Cameroun
  GA: "Africa/Libreville", // Gabon
  CD: "Africa/Kinshasa", // RDC
  BJ: "Africa/Porto-Novo", // Bénin
  // Ajoutez facilement d'autres pays
  NG: "Africa/Lagos", // Nigeria (exemple futur)
  KE: "Africa/Nairobi", // Kenya (exemple futur)
} as const;

// 🔧 Fonction améliorée avec support multi-pays
export const utcToLocalTimeByCountry = (
  utcDate: string | Date,
  countryCode?: string
) => {
  const date = new Date(utcDate);

  // Si un code pays est fourni, utiliser son fuseau
  if (
    countryCode &&
    COUNTRY_TIMEZONES[countryCode as keyof typeof COUNTRY_TIMEZONES]
  ) {
    const timezone =
      COUNTRY_TIMEZONES[countryCode as keyof typeof COUNTRY_TIMEZONES];
    return toZonedTime(date, timezone);
  }

  // Fallback sur le fuseau par défaut (Cameroun)
  return toZonedTime(date, TIME_ZONE);
};

// 📅 Fonction pour obtenir le fuseau d'un pays
export const getCountryTimezone = (countryCode: string): string => {
  return (
    COUNTRY_TIMEZONES[countryCode as keyof typeof COUNTRY_TIMEZONES] ||
    TIME_ZONE
  );
};

// ⚠️ LEGACY: Garde la fonction existante pour compatibilité
export const utcToLocalTime = (utcDate: string | Date) => {
  const date = new Date(utcDate);
  return toZonedTime(date, TIME_ZONE);
};

export const localToUtc = (localDate: string | Date) => {
  return new Date(localDate).toISOString();
};

export const formatLocalDate = (
  date: Date,
  formatString = "yyyy-MM-dd HH:mm:ss"
) => {
  const localDate = toZonedTime(date, TIME_ZONE);
  return format(localDate, formatString);
};

// 🌍 Version améliorée avec support multi-pays
export const formatLocalDateByCountry = (
  date: Date,
  countryCode?: string,
  formatString = "yyyy-MM-dd HH:mm:ss"
) => {
  const timezone = getCountryTimezone(countryCode || "CM");
  const localDate = toZonedTime(date, timezone);
  return format(localDate, formatString);
};

export function unixToLocalTime(unixTimestamp: string) {
  // Parse to number and convert from seconds to milliseconds
  const date = new Date(Number(unixTimestamp) * 1000);
  return toZonedTime(date, TIME_ZONE);
}

export function unixToISOString(unixTimestamp: string): string {
  // Parse to number and convert from seconds to milliseconds
  const date = new Date(Number(unixTimestamp) * 1000);
  return date.toISOString();
}
