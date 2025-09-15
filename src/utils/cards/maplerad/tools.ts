import { CardModel, UserModel } from "@/models";
import env from "@/env";
import fnOutput from "@/utils/shared/fnOutputHandler";
import {
  CardBrand,
  CardPaymentMethodType,
  CardClass,
  CardTransactionStatus,
  CardTransactionType,
  MapleradEnrollCustomerData,
  MapleradCreateCardData,
} from "./types";
import CustomerLogsModel from "@/models/prisma/customerLogsModel";
import { Customer, User } from "@prisma/client";
import { TransactionStatus } from "@/types";
import { BadRequestException } from "@nestjs/common";

export const validateEnrollCustomerData = async (
  data: MapleradEnrollCustomerData
) => {
  const requiredFields: (keyof MapleradEnrollCustomerData)[] = [
    "first_name",
    "last_name",
    "email",
    "country",
    "identification_number",
    "dob",
  ];
  const missingFields = requiredFields.filter((field) => !data[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `Champs requis manquants pour enrollment customer: ${missingFields.join(
        ", "
      )}`
    );
  }

  // Validation phone
  if (!data.phone?.phone_country_code || !data.phone?.phone_number) {
    throw new Error(
      "Téléphone requis: phone.phone_country_code et phone.phone_number"
    );
  }

  // Validation identity (requis selon doc)
  if (
    !data.identity?.type ||
    !data.identity?.image ||
    !data.identity?.number ||
    !data.identity?.country
  ) {
    throw new Error("Identity complète requise: type, image, number, country");
  }

  // Validation address
  if (
    !data.address?.street ||
    !data.address?.city ||
    !data.address?.state ||
    !data.address?.country ||
    !data.address?.postal_code
  ) {
    throw new Error(
      "Adresse complète requise: street, city, state, country, postal_code"
    );
  }
};

/**
 * 🔧 Helper pour créer des données d'enrollment depuis les données utilisateur Monix
 */
export const createEnrollDataFromWavletUser = (user: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  country?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  idType?: string;
  idNumber?: string;
  idFrontImageUrl?: string;
  idBackImageUrl?: string;
  selfieImageUrl?: string;
}): MapleradEnrollCustomerData => {
  // Extraire le code pays et le numéro du phoneNumber (format: +237123456789)
  const phoneMatch = user.phoneNumber.match(/^(\+\d{1,4})(\d+)$/);
  const phoneCountryCode = phoneMatch?.[1] || "+237"; // Par défaut Cameroun
  const phoneNumber =
    phoneMatch?.[2] || user.phoneNumber.replace(/^\+\d{1,4}/, "");

  // Formater la date de naissance pour Maplerad (format: 20-10-1988)
  const dobFormatted = user.dateOfBirth
    ? formatDateForMaplerad(user.dateOfBirth)
    : "01-01-1990"; // Date par défaut

  // Mapper le type d'identité vers les types Maplerad acceptés
  const mapleradIdType = mapWavletIdTypeToMaplerad(user.idType);

  // Combiner les images front et back si disponibles
  const identityImage = combineIdentityImages(
    user.idFrontImageUrl,
    user.idBackImageUrl
  );

  // ✅ Modifier l'email pour Maplerad en ajoutant "?" avant "@"
  const mapleradEmail = user.email.replace("@", "?@");

  // 🎯 Mapper le pays : CG (Congo) → CM (Cameroun) pour Maplerad
  const mappedCountry = mapCountryForMaplerad(user.country);

  return {
    first_name: user.firstName,
    last_name: user.lastName,
    email: mapleradEmail, // ✅ Email modifié pour Maplerad uniquement
    country: mappedCountry,
    identification_number: user.idNumber || "123456789", // TODO: Récupérer depuis KYC
    dob: dobFormatted,

    phone: {
      phone_country_code: phoneCountryCode,
      phone_number: phoneNumber,
    },

    identity: {
      type: mapleradIdType,
      image: identityImage,
      number: user.idNumber || "123456789",
      country: mappedCountry,
    },

    address: {
      street: user.address || "Non spécifié",
      city: user.city || "Douala",
      state: user.state || "Littoral",
      country: mappedCountry,
      postal_code: user.postalCode || "00000",
    },

    photo: user.selfieImageUrl, // Photo selfie pour vérification
  };
};

/**
 * 🎯 Mapper le pays pour Maplerad
 *
 * Logique spéciale : CG (Congo) → CM (Cameroun) pour Maplerad
 * Car Maplerad ne supporte pas le Congo mais supporte le Cameroun
 */
const mapCountryForMaplerad = (country?: string): string => {
  if (!country) {
    return "CM"; // Par défaut Cameroun
  }

  const countryCode = country.toUpperCase();

  // 🎯 Mapping spécial : Congo → Cameroun
  if (countryCode === "CG") {
    console.debug("Mapping pays pour Maplerad", {
      original: country,
      mapped: "CM",
      reason: "Congo non supporté par Maplerad, utilisation du Cameroun",
    });
    return "CM";
  }

  // Autres pays supportés par Maplerad
  const supportedCountries = [
    "NG",
    "CM",
    "US",
    "GB",
    "KE",
    "GH",
    "ZA",
    "GA",
    "BJ",
  ];
  if (supportedCountries.includes(countryCode)) {
    return countryCode;
  }

  // Si le pays n'est pas supporté, utiliser Cameroun par défaut
  console.warn(
    "Pays non supporté par Maplerad, utilisation du Cameroun par défaut",
    {
      original: country,
      default: "CM",
    }
  );
  return "CM";
};

/**
 * 🏷️ Mapper les types d'identité Wavlet vers les types Maplerad
 *
 * Types Maplerad acceptés : NIN, PASSPORT, VOTERS_CARD, DRIVERS_LICENCE
 */
const mapWavletIdTypeToMaplerad = (wavletIdType?: string): string => {
  if (!wavletIdType) {
    return "NIN"; // Par défaut
  }

  const idType = wavletIdType.toUpperCase();

  // Correspondances directes
  if (idType.includes("PASSPORT") || idType === "PASSPORT") {
    console.debug("Type identité mappé", {
      wavlet: wavletIdType,
      maplerad: "PASSPORT",
    });
    return "PASSPORT";
  }

  if (
    idType.includes("DRIVERS") ||
    idType.includes("DRIVING") ||
    idType.includes("PERMIS") ||
    idType === "DRIVERS_LICENCE"
  ) {
    return "DRIVERS_LICENCE";
  }

  if (idType.includes("VOTER") || idType.includes("ELECTOR")) {
    return "VOTERS_CARD";
  }

  if (idType.includes("NIN") || idType.includes("NATIONAL")) {
    return "NIN";
  }

  // Par défaut NIN
  console.debug("Type identité par défaut", {
    wavlet: wavletIdType,
    maplerad: "NIN",
  });
  return "NIN";
};

/**
 * Combiner les images d'identité front et back
 */
const combineIdentityImages = (
  frontImageUrl?: string,
  backImageUrl?: string
): string => {
  if (frontImageUrl && backImageUrl) {
    // Si les deux images sont disponibles, les combiner
    return `${frontImageUrl};${backImageUrl}`;
  }
  return frontImageUrl || backImageUrl || "";
};

/**
 * Formater la date pour Maplerad (format: 20-10-1988)
 */
const formatDateForMaplerad = (date: string | Date): string => {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return "01-01-1990"; // Date par défaut
  }

  const day = dateObj.getDate().toString().padStart(2, "0");
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const year = dateObj.getFullYear();

  return `${day}-${month}-${year}`;
};

/**
 * Convertir depuis la plus petite unité (cents) vers la devise principale
 */
export const convertFromSmallestUnit = (
  amount: number,
  currency: string = "USD"
): number => {
  // Pour USD, 1 USD = 100 cents
  if (currency.toUpperCase() === "USD") {
    return amount / 100;
  }
  return amount;
};

/**
 * Convertir vers la plus petite unité (cents) depuis la devise principale
 */
export const convertToSmallestUnit = (
  amount: number,
  currency: string = "USD"
): number => {
  // Pour USD, 1 USD = 100 cents
  if (currency.toUpperCase() === "USD") {
    return Math.round(amount * 100);
  }
  return Math.round(amount);
};

/**
 * Mapper le statut de transaction Maplerad vers le statut local
 */
// export const mapMapleradTxStatusToLocal = (status: string): string => {
//   const statusMap: { [key: string]: string } = {
//     pending: "PENDING",
//     completed: "SUCCESS",
//     failed: "FAILED",
//     cancelled: "CANCELLED",
//     reversed: "REVERSED",
//   };

//   return statusMap[status.toLowerCase()] || "PENDING";
// };

/**
 * Validation des données de création de carte
 */
export const validateCreateCardData = (data: MapleradCreateCardData) => {
  if (!data.customer_id) {
    throw new Error("customer_id is required");
  }
  if (!data.currency) {
    throw new Error("currency is required");
  }
  if (!data.type) {
    throw new Error("type is required");
  }
  if (typeof data.auto_approve !== "boolean") {
    throw new Error("auto_approve must be a boolean");
  }

  // Validation de la devise (uniquement USD pour Maplerad)
  if (data.currency.toUpperCase() !== "USD") {
    throw new Error("Maplerad only supports USD currency");
  }

  // Validation du type de carte
  if (data.type.toUpperCase() !== "VIRTUAL") {
    throw new Error("Maplerad only supports VIRTUAL card type");
  }
};

/**
 * Gestion des erreurs Maplerad
 */
export const handleMapleradError = (error: any, context: string) => {
  console.error(`Maplerad Error in ${context}:`, error);

  if (error.response?.data?.message) {
    throw new Error(`Maplerad API Error: ${error.response.data.message}`);
  }

  if (error.message) {
    throw new Error(`Maplerad Error: ${error.message}`);
  }

  throw new Error("Unknown Maplerad error occurred");
};

/**
 * Générer un ID unique pour les références
 */
export const generateReferenceId = (): string => {
  return `maplerad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Vérifier si un utilisateur a déjà un customer Maplerad
 */
export const hasMapleradCustomer = (user: any): boolean => {
  return !!user?.maplerad_customer_id;
};

/**
 * Préparer les données de customer pour Maplerad
 */
export const prepareMapleradCustomerData = (
  user: any
): MapleradEnrollCustomerData => {
  return createEnrollDataFromWavletUser({
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phoneNumber: user.phone_number,
    dateOfBirth: user.date_of_birth,
    country: user.country_iso_code,
    address: user.address,
    city: user.city,
    state: user.state,
    postalCode: user.postal_code,
    idType: user.id_type,
    idNumber: user.id_number,
    idFrontImageUrl: user.id_document_front,
    idBackImageUrl: user.id_document_back,
    selfieImageUrl: user.selfie_image_url,
  });
};

/**
 * Auto-fill user information for card issuance
 */
export const autoFillUserInfo = async (userId: string, issueCardDto: any) => {
  try {
    // Fetch user data from database
    const userResult = await UserModel.getOne({ id: userId });
    if (userResult.error || !userResult.output) {
      console.warn(`User ${userId} not found, using provided data only`);
      return issueCardDto;
    }

    const user = userResult.output;

    // Extract phone country code and number
    // const phoneMatch = user.phone?.match(/^(\+\d{1,4})(\d+)$/) || [];
    // const phoneCountryCode = phoneMatch[1] || "+237";
    // const phoneNumber =
    //   phoneMatch[2] || user.phone?.replace(/^\+\d{1,4}/, "") || "";
    // const fullPhone = `${phoneCountryCode}${phoneNumber}`;
    const fullPhoneNumber = buildFullPhoneNumber(user);

    // Map country code for address
    const countryCode = user.country_iso_code?.substring(0, 2) || "CM";

    return {
      ...issueCardDto,
      firstName: issueCardDto.firstName || user.first_name || "Unknown",
      lastName: issueCardDto.lastName || user.last_name || "User",
      email: issueCardDto.email || user.email || `user${userId}@example.com`,
      phone: issueCardDto.phone || fullPhoneNumber,
      address1: issueCardDto.address1 || user.address || "Address not provided",
      city:
        issueCardDto.city ||
        user.city ||
        (countryCode === "CM" ? "Douala" : "Unknown City"),
      state:
        issueCardDto.state ||
        user.state ||
        (countryCode === "CM" ? "Littoral" : "Unknown State"),
      zipcode:
        issueCardDto.zipcode ||
        user.postal_code ||
        (countryCode === "CM" ? "00237" : "00000"),
      country: issueCardDto.country || countryCode,
      idNumber: issueCardDto.idNumber || user.id_number || "000000000",
      idType: issueCardDto.idType || mapWavletIdTypeToMaplerad(user.id_type),
      // Additional fields that might be useful
      dateOfBirth: issueCardDto.dateOfBirth || user.date_of_birth,
      countryIsoCode: user.country_iso_code,
      userPhone: user.phone,
    };
  } catch (error: any) {
    console.error(`Error auto-filling user info for ${userId}:`, error);
    // Fallback to original DTO if there's an error
    return issueCardDto;
  }
};

/**
 * Pré-remplit automatiquement les informations utilisateur pour l'émission de carte
 */
// export const autoFillUserInfo = async (
//   userId: string,
//   partialDto: any
// ): Promise<any> => {
//   const userResult = await UserModel.getOne({ id: userId });
//   const user = userResult.output;

//   // Construire le numéro de téléphone complet avec le préfixe
//   const fullPhoneNumber = buildFullPhoneNumber(user);

//   // Corriger le type d'ID si nécessaire
//   const correctedIdType = s(user.id_document_type);

//   return {
//     // Informations personnelles (automatiquement remplies)
//     firstName: partialDto.firstName || user.first_name,
//     lastName: partialDto.lastName || user.last_name,
//     email: partialDto.email || user.email,
//     phone: partialDto.phone || fullPhoneNumber,

//     // Adresse (automatiquement remplie avec valeurs par défaut)
//     address1: partialDto.address1 || user.address || 'Adresse principale',
//     address2: partialDto.address2 || '5734', // Boite postale par défaut
//     city: partialDto.city || user.city || 'Douala',
//     state: partialDto.state || user.state || 'Littoral',
//     zipcode: partialDto.zipcode || '04582',
//     country: partialDto.country || user.country_iso_code || 'CM',

//     // Identification (automatiquement remplie)
//     idNumber: enrichIdNumberWithMonixReference(
//       partialDto.idNumber || user.id_number
//     ),
//     idType: partialDto.idType || correctedIdType,
//     customerBvn: partialDto.customerBvn || undefined, // Optionnel

//     // Informations de carte (obligatoires dans la requête)
//     initialBalance: partialDto.initialBalance!,
//     cardBrand: partialDto.cardBrand!,
//     clientReference: partialDto.clientReference!,
//     cardCurrency: partialDto.cardCurrency!,
//     walletCurrency: partialDto.walletCurrency!,

//     // Options (avec valeurs par défaut)
//     contactlessPayment: partialDto.contactlessPayment || false,
//     cardLimits: partialDto.cardLimits,
//     whiteListedMccs: partialDto.whiteListedMccs,
//     blackListedMccs: partialDto.blackListedMccs,
//     cardClass: partialDto.cardClass,
//   };
// };

/**
 * Construit le numéro de téléphone nettoyé (sans préfixe pour création de carte)
 */
export const buildFullPhoneNumber = (customer: Customer): string => {
  if (!customer.phone_number) {
    return "";
  }

  // Nettoyer le numéro (supprimer les espaces, tirets, etc.)
  let cleanPhoneNumber = customer.phone_number?.replace(/[\s\-\(\)]/g, "");

  // Si le numéro commence par '+', supprimer le préfixe international
  if (cleanPhoneNumber.startsWith("+")) {
    // Supprimer le '+' et le code pays (généralement 3 chiffres, ex: +237)
    cleanPhoneNumber = cleanPhoneNumber.substring(1);

    // Pour le Cameroun (+237), supprimer les 3 premiers chiffres
    if (cleanPhoneNumber.startsWith("237")) {
      cleanPhoneNumber = cleanPhoneNumber.substring(3);
    }
  }

  // Si le numéro commence par '0', le supprimer (format local)
  if (cleanPhoneNumber.startsWith("0") && !cleanPhoneNumber.startsWith("01")) {
    cleanPhoneNumber = cleanPhoneNumber.substring(1);
  }

  return cleanPhoneNumber;
};

/**
 * Validate retail card request
 */
// export const validateRetailCardRequest = (dto: any) => {
//   if (!dto.initialBalance || dto.initialBalance <= 0) {
//     throw new Error("Initial balance must be greater than 0");
//   }
//   if (!dto.cardBrand) {
//     throw new Error("Card brand is required");
//   }
//   if (!dto.cardCurrency) {
//     throw new Error("Card currency is required");
//   }
// };

/**
 * Generate client reference for transactions
 */
export const generateClientReference = (prefix: string = "CARD"): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Convert brand to Maplerad format
 */
export const convertBrandToMapleradFormat = (brand: string): string => {
  const brandMap: { [key: string]: string } = {
    visa: "VISA",
    mastercard: "MASTERCARD",
    VISA: "VISA",
    MASTERCARD: "MASTERCARD",
  };
  return brandMap[brand] || "VISA";
};

/**
 * Save card creation metadata for webhook
 */
export const saveCardCreationMetadata = async (
  reference: string,
  userId: string,
  feeCalculation: any,
  validatedDto: any,
  clientReference: string,
  customerId: string
) => {
  try {
    const metadata = {
      reference,
      userId,
      customerId,
      cardBrand: validatedDto.cardBrand || "VISA",
      initialBalance: validatedDto.initialBalance || 0,
      clientReference,
      isFirstCard: feeCalculation.isFirstCard || false,
      feeCalculation: {
        issuanceFeeXaf: feeCalculation.issuanceFeeXaf,
        topupFeeUsd: feeCalculation.topupFeeUsd,
        topupFeeXaf: feeCalculation.topupFeeXaf,
        totalFeeXaf: feeCalculation.totalFeeXaf,
        exchangeRateUsed: feeCalculation.exchangeRateUsed,
      },
      validatedDto: {
        firstName: validatedDto.firstName,
        lastName: validatedDto.lastName,
        email: validatedDto.email,
        phone: validatedDto.phone,
        address1: validatedDto.address1,
        city: validatedDto.city,
        state: validatedDto.state,
        country: validatedDto.country,
        cardCurrency: validatedDto.cardCurrency,
        contactlessPayment: validatedDto.contactlessPayment,
      },
      createdAt: new Date(),
      status: "PENDING", // Will be updated by webhook
    };

    // Import CustomerLogsModel to save metadata directly since service requires dependency injection
    // const { default: CustomerLogsModel } = await import(
    //   "@/models/prisma/customerLogsModel"
    // );

    // Save to database using CustomerLogsModel directly
    const result = await CustomerLogsModel.create({
      customer_id: customerId,
      customer_phone_number: "", // Will be populated from user data if needed
      action: "saveCreationMetadata",
      status: "PENDING",
      log_json: metadata,
      log_txt: `saveCardCreationMetadata : userId: ${userId} | reference: ${reference}`,
      created_at: new Date(),
    });

    if (result.error) {
      console.error("❌ Error saving creation metadata:", result.error);
      throw result.error;
    }

    console.log("Card creation metadata saved successfully", {
      reference,
      userId,
      clientReference,
      customerId,
    });

    return { success: true, metadata };
  } catch (error: any) {
    console.error("Failed to save card creation metadata:", error);

    // Fallback: Log to console if database save fails
    console.log("Card creation metadata (fallback log):", {
      reference,
      userId,
      feeCalculation,
      validatedDto,
      clientReference,
      customerId,
      timestamp: new Date().toISOString(),
    });

    return { success: false, error: error.message };
  }
};

/**
 * Adapt Maplerad final response
 */
export const adaptMapleradFinalResponse = (
  finalCard: any,
  feeCalculation: any
) => {
  return {
    card: finalCard,
    feeCalculation,
    success: true,
  };
};

/**
 * Generate a unique fee reference
 */
export const generateFeeReference = (): string => {
  return `fee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if a card is a Maplerad card
 */
export const isAMapleradCard = (card: any): boolean => {
  return card?.provider === "maplerad" || card?.brand === "MAPLERAD";
};

/**
 * Card currency enum
 */
export enum CardCurrency {
  USD = "USD",
  NGN = "NGN",
  XAF = "XAF",
  EUR = "EUR",
  GBP = "GBP",
}

/**
 * ID Type enum
 */
export enum IdType {
  NATIONAL_ID = "NATIONAL_ID",
  PASSPORT = "PASSPORT",
  DRIVERS_LICENCE = "DRIVERS_LICENCE",
  VOTERS_CARD = "VOTERS_CARD",
}

/**
 * Notification type enum
 */
export enum NotificationType {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
  ALERT = "ALERT",
}

/**
 * Transaction type enum
 */
export enum TransactionType {
  PAYMENT_SUCCESS_FEE = "PAYMENT_SUCCESS_FEE",
  PAYMENT_FAILURE_FEE = "PAYMENT_FAILURE_FEE",
  CARD_ISSUANCE = "CARD_ISSUANCE",
  CARD_TOPUP = "CARD_TOPUP",
  CARD_WITHDRAWAL = "CARD_WITHDRAWAL",
  WALLET_DEBIT = "WALLET_DEBIT",
  WALLET_CREDIT = "WALLET_CREDIT",
}

/**
 * Convert amount between currencies
 */
export const convertAmount = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  userId?: string
): Promise<{ convertedAmount: number; rate: number }> => {
  // Simplified conversion logic - in real implementation, use exchange rate service
  const conversionRates: { [key: string]: number } = {
    USD_XAF: 640,
    XAF_USD: 1 / 640,
    USD_EUR: 0.85,
    EUR_USD: 1 / 0.85,
    USD_GBP: 0.75,
    GBP_USD: 1 / 0.75,
  };

  const rateKey = `${fromCurrency}_${toCurrency}`;
  const rate = conversionRates[rateKey] || 1;

  return {
    convertedAmount: Math.round(amount * rate * 100) / 100,
    rate,
  };
};

/**
 * Create enrollment data from SKR user
 */
export const createEnrollDataFromSkrUser = (
  user: any
): MapleradEnrollCustomerData => {
  return createEnrollDataFromWavletUser(user);
};

/**
 * Log error handling strategy
 */
export const logErrorHandlingStrategy = (
  mapleradCallSucceeded: boolean,
  totalToDebitXaf: number,
  context: string
) => {
  console.log("Error handling strategy", {
    mapleradCallSucceeded,
    totalToDebitXaf,
    context,
  });
};

/**
 * Map Maplerad transaction status to local status
 */
export const mapMapleradTxStatusToLocal = (
  mapleradStatus: string
): TransactionStatus => {
  switch (mapleradStatus?.toLowerCase()) {
    case "success":
    case "successful":
    case "completed":
      return TransactionStatus.SUCCESS;
    case "failed":
    case "failure":
      return TransactionStatus.FAILED;
    case "pending":
    case "processing":
      return TransactionStatus.PENDING;
    case "cancelled":
    case "canceled":
      return TransactionStatus.CANCELLED;
    case "reversed":
      return TransactionStatus.REVERSED;
    default:
      return TransactionStatus.PENDING;
  }
};

// ===== MÉTHODES PRIVÉES DE VALIDATION =====

export const validateRetailCardRequest = (dto: any): void => {
  if (!dto.initialBalance || dto.initialBalance <= 0) {
    throw new BadRequestException("Initial balance must be greater than 0");
  }
  if (!dto.cardBrand) {
    throw new BadRequestException("Card brand is required");
  }
  if (!dto.cardCurrency) {
    throw new BadRequestException("Card currency is required");
  }

  // IssueRetailCardDto
  // Validation NGN : pas de contactless
  if (dto.cardCurrency === CardCurrency.NGN && dto.contactlessPayment) {
    throw new BadRequestException(
      "Les cartes NGN ne supportent pas les paiements sans contact"
    );
  }

  // Vali
  // dation solde minimum
  if (dto.initialBalance < 1) {
    throw new BadRequestException("Le solde initial doit être d'au moins 1");
  }

  // Validation limites contactless
  if (dto.contactlessPayment && !dto.cardLimits) {
    throw new BadRequestException(
      "Les limites de carte sont requises pour les cartes contactless"
    );
  }
};

export const validateLiteCardRequest = (dto: any): void => {
  // IssueLiteCardDto
  // Validation solde pour carte lite
  if (dto.initialBalance < 1 || dto.initialBalance > 1000) {
    throw new BadRequestException(
      "Le solde initial pour une carte lite doit être entre 1 et 1000 USD"
    );
  }
};

export const validateCorporateCardRequest = (dto: any): void => {
  // IssueCorporateCardDto
  // Validation NGN : pas de contactless
  if (dto.cardCurrency === CardCurrency.NGN && dto.contactlessPayment) {
    throw new BadRequestException(
      "Les cartes d'entreprise NGN ne supportent pas les paiements sans contact"
    );
  }

  // Validation solde minimum pour entreprise
  if (dto.initialBalance < 10) {
    throw new BadRequestException(
      "Le solde initial pour une carte d'entreprise doit être d'au moins 10"
    );
  }
};

export const validateReIssueRequest = (dto: any): void => {
  // Validation solde minimum
  if (dto.initialBalance < 0) {
    throw new BadRequestException("Le solde initial ne peut pas être négatif");
  }
};
