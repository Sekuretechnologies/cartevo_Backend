"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactionOperator = exports.getTextFormattedDate = exports.getFormattedTime = exports.getFormattedDate = exports.getFormattedDateTime = exports.translateCountry = exports.translateGender = exports.canWithdrawMoney = exports.countryFeeRate = exports.countryCurrency = exports.categoryTypeV2 = exports.categoryType = exports.transformArray = exports.isCorrectPassword = exports.generateRandomCodeNumber = exports.generateRandomCode = void 0;
exports.extractUsdAmountFromSentence = extractUsdAmountFromSentence;
exports.wordsInSentence = wordsInSentence;
exports.getFileExtension = getFileExtension;
exports.getFileType = getFileType;
exports.findCategoryType = findCategoryType;
exports.findCategoryTypeV2 = findCategoryTypeV2;
exports.getCategoryTypeV2 = getCategoryTypeV2;
exports.startsWithWord = startsWithWord;
exports.removeWord = removeWord;
exports.convertToTimeframe = convertToTimeframe;
exports.arrayToSetInString = arrayToSetInString;
exports.setMethodFilter = setMethodFilter;
exports.calculateAge = calculateAge;
exports.isEmptyString = isEmptyString;
exports.removeLeadingZero = removeLeadingZero;
exports.removeProvinceFromStateName = removeProvinceFromStateName;
exports.isValidTextInput = isValidTextInput;
exports.truncateText = truncateText;
exports.sanitizeTextInput = sanitizeTextInput;
exports.sanitizeName = sanitizeName;
const bcrypt_1 = require("bcrypt");
function extractUsdAmountFromSentence(text) {
    const match = text.match(/\$([0-9,.]+)/);
    return match ? parseFloat(match[1].replace(/,/g, "")) : null;
}
function wordsInSentence(sentence, words) {
    const sentenceWords = sentence.toLowerCase().split(/\W+/);
    return words.every((word) => sentenceWords.includes(word.toLowerCase()));
}
const generateRandomCode = (length) => {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
        result += characters[Math.floor(Math.random() * characters.length)];
    }
    return result;
};
exports.generateRandomCode = generateRandomCode;
const generateRandomCodeNumber = (length) => {
    let result = "";
    const characters = "0123456789";
    for (let i = 0; i < length; i++) {
        result += characters[Math.floor(Math.random() * characters.length)];
    }
    return result;
};
exports.generateRandomCodeNumber = generateRandomCodeNumber;
function getFileExtension(filename) {
    return filename.split(".").pop();
}
function getFileType(fileExtension) {
    if (fileExtension?.includes("jpg") ||
        fileExtension?.includes("jpeg") ||
        fileExtension?.includes("png")) {
        return "image";
    }
    else if (fileExtension?.includes("pdf") ||
        fileExtension?.includes("doc") ||
        fileExtension?.includes("docx")) {
        return "document";
    }
    else {
        return "file";
    }
}
const isCorrectPassword = async function (candidatePassword, userPassword) {
    const result = await bcrypt_1.default.compare(candidatePassword, userPassword);
    return result;
};
exports.isCorrectPassword = isCorrectPassword;
const transformArray = (array) => {
    return array.reduce((accumulator, current) => {
        if (!accumulator[current.status]) {
            accumulator[current.status] = current;
        }
        return accumulator;
    }, {});
};
exports.transformArray = transformArray;
exports.categoryType = {
    carte: {
        retrait: "Retrait de carte",
        recharge: "Recharge de carte",
        purchase: "Achat de carte",
        authorization: "Paiement accepté",
        decline: "Paiement refusé",
        reversal: "Remboursement dans la carte",
        refund: "Demande de remboursement ",
        termination: "Carte terminée/ désactivée",
        debitechec: "Frais d’échec de paiement",
    },
    solde: {
        retrait: "Retrait de compte",
        recharge: "Recharge de compte",
        parrainage: "Reversement dans le solde parrainage",
    },
    transfert: {
        transfert: "transfert vers compte sekure",
        bank: "transfert vers compte bancaire",
    },
};
exports.categoryTypeV2 = {
    card: {
        withdrawal: "Retrait de carte",
        topup: "Recharge de carte",
        purchase: "Achat de carte",
        authorization: "Paiement accepté",
        decline: "Paiement refusé",
        reversal: "Remboursement dans la carte",
        refund: "Demande de remboursement ",
        termination: "Carte terminée/ désactivée",
        faildebit: "Frais d’échec de paiement",
    },
    wallet: {
        withdrawal: "Retrait de compte",
        topup: "Recharge de compte",
        sponsorship: "Reversement dans le solde parrainage",
    },
    sponsorship: {
        withdrawal: "Retrait solde parrainage",
        topup: "Depot solde parrainage",
    },
    transfer: {
        transfer: "Transfert vers compte sekure",
        bank: "Transfert vers compte bancaire Nigeria",
    },
};
function findCategoryType(input) {
    for (const category in exports.categoryType) {
        for (const type in exports.categoryType[category]) {
            if (exports.categoryType[category][type]?.toLowerCase() === input.toLowerCase()) {
                return { category: category, type: type };
            }
        }
    }
    return null;
}
function findCategoryTypeV2(input) {
    for (const category in exports.categoryTypeV2) {
        for (const type in exports.categoryTypeV2[category]) {
            if (exports.categoryTypeV2[category][type]?.toLowerCase() === input.toLowerCase()) {
                return { category: category, type: type };
            }
        }
    }
    return null;
}
function getCategoryTypeV2(inputCategory, inputType) {
    if (exports.categoryTypeV2?.[inputCategory]?.[inputType]) {
        return exports.categoryTypeV2?.[inputCategory]?.[inputType];
    }
    return `${inputCategory}-${inputType}`;
}
function startsWithWord(sentence, targetWord) {
    const regex = new RegExp(`^\\b${targetWord}\\b`, "i");
    return regex.test(sentence);
}
function removeWord(sentence, word) {
    const lowerCaseSentence = sentence.toLowerCase();
    const lowerCaseWord = word.toLowerCase();
    const regex = new RegExp("\\b" + lowerCaseWord + "\\b", "g");
    return lowerCaseSentence.replace(regex, "");
}
function convertToTimeframe(timestampInSeconds) {
    const timestampInMs = timestampInSeconds * 1000;
    const date = new Date(Date.UTC(1970, 0, 1, 0, 0, 0));
    date.setUTCSeconds(timestampInSeconds);
    const formatter = new Intl.DateTimeFormat("fr-FR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Africa/Lagos",
    });
    const formattedDate = formatter.format(date);
    return formattedDate;
}
function arrayToSetInString(array) {
    const formattedString = `(${array.join(",")})`;
    return formattedString;
}
function setMethodFilter(identifier) {
    let key;
    let value;
    if (typeof identifier == "string" || typeof identifier == "number") {
        key = "id";
        value = identifier;
    }
    else if (typeof identifier == "object") {
        let i = 0;
        for (const [k, val] of Object.entries(identifier)) {
            if (i === 0) {
                key = k;
                value = val;
            }
            i++;
        }
    }
    return { key, value };
}
exports.countryCurrency = {
    CM: process.env.CM_TOP_UP_FEES,
    GB: "XAF",
    CI: "XOF",
};
exports.countryFeeRate = {
    CM: Number(process.env.CM_TOP_UP_FEES || 0),
    GB: Number(process.env.GA_TOP_UP_FEES || 0),
    BJ: Number(process.env.BJ_TOP_UP_FEES || 0),
    CD: Number(process.env.CD_TOP_UP_FEES || 0),
};
function calculateAge(birthDateString) {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
const canWithdrawMoney = function ({ is_from_v1, balance_xaf, }) {
    if (is_from_v1 && (!balance_xaf || Number(balance_xaf) === 0)) {
        return true;
    }
    else if (!is_from_v1) {
        return true;
    }
    else {
        return false;
    }
};
exports.canWithdrawMoney = canWithdrawMoney;
const translateGender = function (gender) {
    let result = "";
    switch (gender) {
        case "masculin":
            result = "male";
            break;
        case "feminin":
            result = "female";
            break;
        case "male":
            result = "masculin";
            break;
        case "female":
            result = "feminin";
            break;
        default:
            result = gender;
    }
    return result;
};
exports.translateGender = translateGender;
const translateCountry = function (gender) {
    let result = "";
    switch (gender?.toLowerCase()) {
        case "cameroun":
            result = "Cameroon";
            break;
        default:
            result = gender;
    }
    return result;
};
exports.translateCountry = translateCountry;
function isEmptyString(input) {
    return typeof input === "string" && input.trim() === "";
}
function removeLeadingZero(phoneNumber) {
    if (phoneNumber.startsWith("0")) {
        return phoneNumber.slice(1);
    }
    return phoneNumber;
}
const getFormattedDateTime = (entry, format, lang) => {
    let year0 = "";
    if (typeof entry === "string") {
        year0 = String(entry).slice(0, 1);
    }
    if (year0 === "0") {
        return "-/-";
    }
    else {
        if (format == "date") {
            return (0, exports.getFormattedDate)(entry, lang);
        }
        else if (format == "time") {
            return (0, exports.getFormattedTime)(entry);
        }
        else {
            return `${(0, exports.getFormattedDate)(entry, lang)}  ${(0, exports.getFormattedTime)(entry)}`;
        }
    }
};
exports.getFormattedDateTime = getFormattedDateTime;
const getFormattedDate = (entry, lang, isText) => {
    if (typeof entry === "string") {
        entry = new Date(entry);
    }
    if (entry) {
        let adjustedEntry = new Date(entry.getTime());
        if (adjustedEntry.getHours() === 0) {
            adjustedEntry.setHours(23);
            adjustedEntry.setDate(adjustedEntry.getDate() - 1);
        }
        const year = adjustedEntry.getFullYear();
        const month = `0${adjustedEntry.getMonth() + 1}`.slice(-2);
        const day = `0${adjustedEntry.getDate()}`.slice(-2);
        return lang == "fr" ? `${day}/${month}/${year}` : `${day}/${month}/${year}`;
    }
    return "";
};
exports.getFormattedDate = getFormattedDate;
const getFormattedTime = (entry) => {
    if (typeof entry === "string") {
        entry = new Date(entry);
    }
    if (entry) {
        let gmtOffset = entry.getTimezoneOffset() / 60;
        let hours = entry.getHours() + gmtOffset;
        hours = hours < 0 ? 24 + hours : hours;
        hours = hours > 23 ? hours - 24 : hours;
        const minutes = `0${entry.getMinutes()}`.slice(-2);
        if (isNaN(parseInt(`${hours}`)) || isNaN(parseInt(minutes))) {
            return "";
        }
        return `${Number(hours)}:${minutes}`;
    }
    return "";
};
exports.getFormattedTime = getFormattedTime;
const getTextFormattedDate = (entry, lang, withHours) => {
    let adjustedEntry;
    if (typeof entry === "string") {
        entry = new Date(entry);
    }
    adjustedEntry = new Date(entry.getTime());
    if (adjustedEntry.getHours() === 0) {
        adjustedEntry.setHours(23);
        adjustedEntry.setDate(adjustedEntry.getDate() - 1);
    }
    let options;
    if (withHours) {
        options = {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        };
    }
    else {
        options = {
            year: "numeric",
            month: "short",
            day: "numeric",
        };
    }
    const formattedDate = adjustedEntry.toLocaleDateString("fr-FR", options);
    return formattedDate;
};
exports.getTextFormattedDate = getTextFormattedDate;
const getTransactionOperator = function (method) {
    let result = "";
    switch (method) {
        case "cm.orange":
            result = "ORANGE MONEY";
            break;
        case "ORANGE_MONEY":
            result = "ORANGE MONEY";
            break;
        case "cm.mtn":
            result = "MTN MOMO";
            break;
        case "MTN_MOMO":
            result = "MTN MOMO";
            break;
        default:
            result = "";
    }
    return result;
};
exports.getTransactionOperator = getTransactionOperator;
function removeProvinceFromStateName(text) {
    let newText = text.trim();
    newText = newText.replace(/ Province$/i, "");
    return newText;
}
function isValidTextInput(text) {
    const regex = /^[a-zA-Z0-9[,.'-]*$/;
    return regex.test(text);
}
function truncateText(text, maxLength = 50, appendEllipsis = false) {
    if (text.length <= maxLength) {
        return text;
    }
    const truncated = text.slice(0, maxLength);
    return appendEllipsis ? truncated + "..." : truncated;
}
function sanitizeTextInput(text) {
    const charMap = {
        á: "a",
        à: "a",
        ã: "a",
        â: "a",
        ä: "a",
        é: "e",
        è: "e",
        ê: "e",
        ë: "e",
        í: "i",
        ì: "i",
        î: "i",
        ï: "i",
        ó: "o",
        ò: "o",
        õ: "o",
        ô: "o",
        ö: "o",
        ú: "u",
        ù: "u",
        û: "u",
        ü: "u",
        ç: "c",
        Á: "A",
        À: "A",
        Ã: "A",
        Â: "A",
        Ä: "A",
        É: "E",
        È: "E",
        Ê: "E",
        Ë: "E",
        Í: "I",
        Ì: "I",
        Î: "I",
        Ï: "I",
        Ó: "O",
        Ò: "O",
        Õ: "O",
        Ö: "O",
        Ô: "O",
        Ú: "U",
        Ù: "U",
        Û: "U",
        Ü: "U",
        Ç: "C",
    };
    const regex = /^[a-zA-Z0-9[,.'-]*$/;
    let sanitizedText = text
        .split("")
        .map((char) => {
        return charMap[char] || char;
    })
        .join("");
    sanitizedText = sanitizedText.replace(/[^a-zA-Z0-9[,.' -]/g, "-");
    sanitizedText = sanitizedText.replace(/-{2,}/g, "-");
    sanitizedText = sanitizedText.replace(/(^-+|-+$)/g, "");
    sanitizedText = sanitizedText.replace(/- /g, " ");
    sanitizedText = sanitizedText.replace(/ -/g, " ");
    return sanitizedText.trim();
}
function sanitizeName(text, uppercase = false) {
    const name = sanitizeTextInput(text);
    const transformedName = name
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim();
    if (uppercase) {
        return transformedName.toUpperCase();
    }
    return transformedName
        .split(" ")
        .map((word) => {
        if (word.length > 0) {
            return word[0].toUpperCase() + word.slice(1);
        }
        return word;
    })
        .join(" ");
}
//# sourceMappingURL=common.js.map