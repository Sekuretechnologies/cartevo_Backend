import bcrypt from "bcrypt";

export function extractUsdAmountFromSentence(text: string): number | null {
  const match = text.match(/\$([0-9,.]+)/);
  return match ? parseFloat(match[1].replace(/,/g, "")) : null;
}

export function wordsInSentence(sentence: string, words: string[]): boolean {
  // Normalize sentence to lower case and split into word tokens
  const sentenceWords = sentence.toLowerCase().split(/\W+/);
  // Check if every word in the list is found in the sentence words
  return words.every((word) => sentenceWords.includes(word.toLowerCase()));
}

// Example usage:
// const words = ['apple', 'banana'];
// const sentence = 'I ate an apple and a banana today.';
// console.log(wordsInSentence(words, sentence)); // true
/** =========================================================== */
export const generateRandomCode = (length: number): string => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    result += characters[Math.floor(Math.random() * characters.length)];
  }
  return result;
};

/** =========================================================== */
export const generateRandomCodeNumber = (length: number): string => {
  let result = "";
  const characters = "0123456789";

  for (let i = 0; i < length; i++) {
    result += characters[Math.floor(Math.random() * characters.length)];
  }
  return result;
};

/** =========================================================== */
export function getFileExtension(filename: string) {
  return filename.split(".").pop();
}

/** =========================================================== */
export function getFileType(fileExtension: string) {
  if (
    fileExtension?.includes("jpg") ||
    fileExtension?.includes("jpeg") ||
    fileExtension?.includes("png")
  ) {
    return "image";
  } else if (
    fileExtension?.includes("pdf") ||
    fileExtension?.includes("doc") ||
    fileExtension?.includes("docx")
  ) {
    return "document";
  } else {
    return "file";
  }
}
/** =========================================================== */
export const isCorrectPassword = async function (
  candidatePassword: string,
  userPassword: string
) {
  const result = await bcrypt.compare(candidatePassword, userPassword);
  // console.log(`isCorrectPassword : ${candidatePassword} ::: `, result);
  return result;
};

/** =========================================================== */
export const transformArray = (array: any) => {
  return array.reduce((accumulator: any, current: any) => {
    // Check if the accumulator already has a property with the current status value
    if (!accumulator[current.status]) {
      // If not, add a new property with the current object as its value
      accumulator[current.status] = current;
    }
    // Return the accumulator for the next iteration
    return accumulator;
  }, {}); // Initialize the accumulator as an empty object
};

/** =========================================================== */
export interface ICategoryType {
  [key: string]: any;
}
export const categoryType: ICategoryType = {
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

export const categoryTypeV2: ICategoryType = {
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
    bank: "Transfert vers compte bancaire Nigeria", // "Transfert vers compte bancaire"
  },
};

/** =========================================================== */
export function findCategoryType(input: any) {
  for (const category in categoryType) {
    for (const type in categoryType[category]) {
      if (categoryType[category][type]?.toLowerCase() === input.toLowerCase()) {
        return { category: category, type: type };
      }
    }
  }
  return null; // Return null if no match is found
}

/** =========================================================== */
export function findCategoryTypeV2(input: any) {
  for (const category in categoryTypeV2) {
    for (const type in categoryTypeV2[category]) {
      if (
        categoryTypeV2[category][type]?.toLowerCase() === input.toLowerCase()
      ) {
        return { category: category, type: type };
      }
    }
  }
  return null; // Return null if no match is found
}

/** =========================================================== */
export function getCategoryTypeV2(inputCategory: string, inputType: string) {
  if (categoryTypeV2?.[inputCategory]?.[inputType]) {
    return categoryTypeV2?.[inputCategory]?.[inputType];
  }

  return `${inputCategory}-${inputType}`; // Return null if no match is found
}

/** =========================================================== */
export function startsWithWord(sentence: string, targetWord: string) {
  const regex = new RegExp(`^\\b${targetWord}\\b`, "i");
  return regex.test(sentence);
}

/** =========================================================== */
export function removeWord(sentence: string, word: string) {
  // Convert both the sentence and the word to lowercase for case-insensitive comparison
  const lowerCaseSentence = sentence.toLowerCase();
  const lowerCaseWord = word.toLowerCase();

  // Use a regular expression to match the word, ignoring case
  const regex = new RegExp("\\b" + lowerCaseWord + "\\b", "g");

  // Replace all occurrences of the word with an empty string
  return lowerCaseSentence.replace(regex, "");
}

/** =========================================================== */
export function convertToTimeframe(timestampInSeconds: any) {
  // Convert seconds to milliseconds
  const timestampInMs = timestampInSeconds * 1000;

  // Create a timezone-aware Date object
  const date = new Date(Date.UTC(1970, 0, 1, 0, 0, 0)); // Start of Unix epoch
  date.setUTCSeconds(timestampInSeconds);

  // Create an Intl.DateTimeFormat object for consistent formatting
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

  // Get the formatted date string
  const formattedDate = formatter.format(date);

  return formattedDate;
}

/** =========================================================== */
export function arrayToSetInString(array: any[]) {
  const formattedString = `(${array.join(",")})`;
  return formattedString;
}

/** =========================================================== */
export function setMethodFilter(identifier: any): { key: string; value: any } {
  let key: any;
  let value: any;
  if (typeof identifier == "string" || typeof identifier == "number") {
    key = "id";
    value = identifier;
  } else if (typeof identifier == "object") {
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

/** =========================================================== */
interface IDict {
  [key: string]: any;
}
export const countryCurrency: IDict = {
  CM: process.env.CM_TOP_UP_FEES,
  GB: "XAF",
  CI: "XOF",
};

export const countryFeeRate: IDict = {
  CM: Number(process.env.CM_TOP_UP_FEES || 0),
  GB: Number(process.env.GA_TOP_UP_FEES || 0),
  BJ: Number(process.env.BJ_TOP_UP_FEES || 0),
  CD: Number(process.env.CD_TOP_UP_FEES || 0),
};

/** =========================================================== */
export function calculateAge(birthDateString: string) {
  const birthDate = new Date(birthDateString);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  // If the birthday hasn't occurred yet this year, subtract one from the age
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

/** =========================================================== */
export const canWithdrawMoney = function ({
  is_from_v1,
  balance_xaf,
}: {
  is_from_v1: boolean;
  balance_xaf: any;
}) {
  if (is_from_v1 && (!balance_xaf || Number(balance_xaf) === 0)) {
    return true;
  } else if (!is_from_v1) {
    return true;
  } else {
    return false;
  }
};

export const translateGender = function (gender: string) {
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

export const translateCountry = function (gender: string) {
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

export function isEmptyString(input: any) {
  return typeof input === "string" && input.trim() === "";
}

export function removeLeadingZero(phoneNumber: string) {
  if (phoneNumber.startsWith("0")) {
    return phoneNumber.slice(1);
  }
  return phoneNumber;
}

export const getFormattedDateTime = (
  entry: Date,
  format?: string,
  lang?: string
) => {
  let year0 = "";
  if (typeof entry === "string") {
    // const x = new Date(entry);
    year0 = String(entry).slice(0, 1);
  }

  if (year0 === "0") {
    return "-/-";
  } else {
    if (format == "date") {
      return getFormattedDate(entry, lang);
    } else if (format == "time") {
      return getFormattedTime(entry);
    } else {
      return `${getFormattedDate(entry, lang)}  ${getFormattedTime(entry)}`;
    }
  }
};

export const getFormattedDate = (
  entry: Date,
  lang?: string,
  isText?: boolean
) => {
  if (typeof entry === "string") {
    entry = new Date(entry);
  }
  if (entry) {
    // Adjust the date to the day before if necessary
    let adjustedEntry = new Date(entry.getTime());

    // Check if the time is midnight (00:00)
    if (adjustedEntry.getHours() === 0) {
      // Set the time to 23:59 (11:00 PM) if it's midnight
      adjustedEntry.setHours(23);
      adjustedEntry.setDate(adjustedEntry.getDate() - 1);
    }

    const year = adjustedEntry.getFullYear();
    const month = `0${adjustedEntry.getMonth() + 1}`.slice(-2); // Note: getMonth() returns 0-11, hence the +1
    const day = `0${adjustedEntry.getDate()}`.slice(-2);

    // const year = entry.getFullYear();
    // const month = `0${entry.getMonth() + 1}`.slice(-2);
    // const day = `0${entry.getDate()}`.slice(-2);

    return lang == "fr" ? `${day}/${month}/${year}` : `${day}/${month}/${year}`;
  }
  return "";
};

export const getFormattedTime = (entry: Date) => {
  if (typeof entry === "string") {
    // console.log("getFormattedTime : ", entry);
    entry = new Date(entry);
  }
  if (entry) {
    let gmtOffset = entry.getTimezoneOffset() / 60;
    let hours = entry.getHours() + gmtOffset;
    hours = hours < 0 ? 24 + hours : hours; // Adjust for negative hours
    hours = hours > 23 ? hours - 24 : hours; // Adjust for hours exceeding 23
    const minutes = `0${entry.getMinutes()}`.slice(-2);
    if (isNaN(parseInt(`${hours}`)) || isNaN(parseInt(minutes))) {
      return "";
    }
    return `${Number(hours)}:${minutes}`;
  }
  return "";
};

export const getTextFormattedDate = (
  entry: Date | string,
  lang?: string,
  withHours?: boolean
): string => {
  let adjustedEntry: Date;

  // Handle input type
  if (typeof entry === "string") {
    entry = new Date(entry);
  }

  // Adjust the date to the day before if necessary
  adjustedEntry = new Date(entry.getTime());

  // Check if the time is midnight (00:00) and adjust if needed
  if (adjustedEntry.getHours() === 0) {
    adjustedEntry.setHours(23);
    adjustedEntry.setDate(adjustedEntry.getDate() - 1);
  }

  // Format the date using toLocaleDateString
  let options: Intl.DateTimeFormatOptions;

  if (withHours) {
    options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
  } else {
    options = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
  }

  const formattedDate = adjustedEntry.toLocaleDateString("fr-FR", options);

  return formattedDate;
};

export const getTransactionOperator = function (method: string) {
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

export function removeProvinceFromStateName(text: string) {
  let newText = text.trim();
  newText = newText.replace(/ Province$/i, "");
  return newText;
}

export function isValidTextInput(text: string) {
  // Regular expression to match the allowed characters
  const regex = /^[a-zA-Z0-9[,.'-]*$/;

  // Test the text against the regular expression
  return regex.test(text);
}

export function truncateText(
  text: string,
  maxLength: number = 50,
  appendEllipsis: boolean = false
): string {
  if (text.length <= maxLength) {
    return text; // Return the original text if it's within the limit
  }

  // Truncate the text to the specified maxLength
  const truncated = text.slice(0, maxLength);

  // Append ellipsis if required
  return appendEllipsis ? truncated + "..." : truncated;
}

export function sanitizeTextInput(text: string) {
  // Mapping of accented characters to their non-accented counterparts
  const charMap: any = {
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

  // Regular expression for allowed characters including letters, numbers, and special characters [,.-']
  const regex = /^[a-zA-Z0-9[,.'-]*$/;

  let sanitizedText = text
    .split("")
    .map((char) => {
      return charMap[char] || char; // Replace accented characters or keep the character
    })
    .join("");

  sanitizedText = sanitizedText.replace(/[^a-zA-Z0-9[,.' -]/g, "-"); // Remove any disallowed characters

  // Replace multiple occurrences of '-' with a single '-'
  sanitizedText = sanitizedText.replace(/-{2,}/g, "-"); // Replace multiple hyphens with a single hyphen
  sanitizedText = sanitizedText.replace(/(^-+|-+$)/g, ""); // Remove leading/trailing hyphens
  sanitizedText = sanitizedText.replace(/- /g, " "); // Replace hyphens with spaces
  sanitizedText = sanitizedText.replace(/ -/g, " "); // Replace hyphens with spaces

  return sanitizedText.trim();
}

export function sanitizeName(text: string, uppercase = false) {
  const name = sanitizeTextInput(text);
  // Step 1: Replace camel case and normalize spaces
  const transformedName = name
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Insert space between camel case words
    .replace(/\s+/g, " ") // Replace multiple spaces with a single space
    .trim(); // Trim the entire string

  // If uppercase boolean is true, convert everything to uppercase
  if (uppercase) {
    return transformedName.toUpperCase();
  }

  // Step 2: Capitalize each word
  return transformedName
    .split(" ") // Split the name into words
    .map((word) => {
      // Capitalize the first letter and lowercase the rest
      if (word.length > 0) {
        return word[0].toUpperCase() + word.slice(1);
      }
      return word; // For empty words, just return as is
    })
    .join(" "); // Rejoin the words into a single string
}

// export function sanitizeTextInput0(text:string) {
//   const com_acento = 'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÖÔÚÙÛÜÇ<,>´`-,~';
//   const sem_acento = 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC          ';
//   const regex = /^[a-zA-Z0-9[,.'-]*$/;

//   let textResult =  text.split('').map(char => {
//       const charIdx = com_acento.indexOf(char)
//       if (charIdx !== -1) {
//       return sem_acento[charIdx]
//     }
//     return char
//   }).join('')

//   // Test the text against the regular expression
//   let isValidText = regex.test(textResult);

//   if(!isValidText) {
//     textResult = text.replace(/[^a-zA-Z0-9[,.'-]]/g, ''); // Remove any disallowed characters
//   }

//   return textResult;
// }
