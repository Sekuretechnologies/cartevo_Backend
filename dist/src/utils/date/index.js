"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatLocalDateByCountry = exports.formatLocalDate = exports.localToUtc = exports.utcToLocalTime = exports.getCountryTimezone = exports.utcToLocalTimeByCountry = exports.COUNTRY_TIMEZONES = exports.TIME_ZONE = void 0;
exports.unixToLocalTime = unixToLocalTime;
exports.unixToISOString = unixToISOString;
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
exports.TIME_ZONE = "Africa/Douala";
exports.COUNTRY_TIMEZONES = {
    CM: "Africa/Douala",
    GA: "Africa/Libreville",
    CD: "Africa/Kinshasa",
    BJ: "Africa/Porto-Novo",
    NG: "Africa/Lagos",
    KE: "Africa/Nairobi",
};
const utcToLocalTimeByCountry = (utcDate, countryCode) => {
    const date = new Date(utcDate);
    if (countryCode &&
        exports.COUNTRY_TIMEZONES[countryCode]) {
        const timezone = exports.COUNTRY_TIMEZONES[countryCode];
        return (0, date_fns_tz_1.toZonedTime)(date, timezone);
    }
    return (0, date_fns_tz_1.toZonedTime)(date, exports.TIME_ZONE);
};
exports.utcToLocalTimeByCountry = utcToLocalTimeByCountry;
const getCountryTimezone = (countryCode) => {
    return (exports.COUNTRY_TIMEZONES[countryCode] ||
        exports.TIME_ZONE);
};
exports.getCountryTimezone = getCountryTimezone;
const utcToLocalTime = (utcDate) => {
    const date = new Date(utcDate);
    return (0, date_fns_tz_1.toZonedTime)(date, exports.TIME_ZONE);
};
exports.utcToLocalTime = utcToLocalTime;
const localToUtc = (localDate) => {
    return new Date(localDate).toISOString();
};
exports.localToUtc = localToUtc;
const formatLocalDate = (date, formatString = "yyyy-MM-dd HH:mm:ss") => {
    const localDate = (0, date_fns_tz_1.toZonedTime)(date, exports.TIME_ZONE);
    return (0, date_fns_1.format)(localDate, formatString);
};
exports.formatLocalDate = formatLocalDate;
const formatLocalDateByCountry = (date, countryCode, formatString = "yyyy-MM-dd HH:mm:ss") => {
    const timezone = (0, exports.getCountryTimezone)(countryCode || "CM");
    const localDate = (0, date_fns_tz_1.toZonedTime)(date, timezone);
    return (0, date_fns_1.format)(localDate, formatString);
};
exports.formatLocalDateByCountry = formatLocalDateByCountry;
function unixToLocalTime(unixTimestamp) {
    const date = new Date(Number(unixTimestamp) * 1000);
    return (0, date_fns_tz_1.toZonedTime)(date, exports.TIME_ZONE);
}
function unixToISOString(unixTimestamp) {
    const date = new Date(Number(unixTimestamp) * 1000);
    return date.toISOString();
}
//# sourceMappingURL=index.js.map