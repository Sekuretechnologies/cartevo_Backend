export declare const TIME_ZONE = "Africa/Douala";
export declare const COUNTRY_TIMEZONES: {
    readonly CM: "Africa/Douala";
    readonly GA: "Africa/Libreville";
    readonly CD: "Africa/Kinshasa";
    readonly BJ: "Africa/Porto-Novo";
    readonly NG: "Africa/Lagos";
    readonly KE: "Africa/Nairobi";
};
export declare const utcToLocalTimeByCountry: (utcDate: string | Date, countryCode?: string) => Date;
export declare const getCountryTimezone: (countryCode: string) => string;
export declare const utcToLocalTime: (utcDate: string | Date) => Date;
export declare const localToUtc: (localDate: string | Date) => string;
export declare const formatLocalDate: (date: Date, formatString?: string) => string;
export declare const formatLocalDateByCountry: (date: Date, countryCode?: string, formatString?: string) => string;
export declare function unixToLocalTime(unixTimestamp: string): Date;
export declare function unixToISOString(unixTimestamp: string): string;
