export declare function extractUsdAmountFromSentence(text: string): number | null;
export declare function wordsInSentence(sentence: string, words: string[]): boolean;
export declare const generateRandomCode: (length: number) => string;
export declare const generateRandomCodeNumber: (length: number) => string;
export declare function getFileExtension(filename: string): string;
export declare function getFileType(fileExtension: string): "image" | "document" | "file";
export declare const isCorrectPassword: (candidatePassword: string, userPassword: string) => Promise<boolean>;
export declare const transformArray: (array: any) => any;
export interface ICategoryType {
    [key: string]: any;
}
export declare const categoryType: ICategoryType;
export declare const categoryTypeV2: ICategoryType;
export declare function findCategoryType(input: any): {
    category: string;
    type: string;
};
export declare function findCategoryTypeV2(input: any): {
    category: string;
    type: string;
};
export declare function getCategoryTypeV2(inputCategory: string, inputType: string): any;
export declare function startsWithWord(sentence: string, targetWord: string): boolean;
export declare function removeWord(sentence: string, word: string): string;
export declare function convertToTimeframe(timestampInSeconds: any): string;
export declare function arrayToSetInString(array: any[]): string;
export declare function setMethodFilter(identifier: any): {
    key: string;
    value: any;
};
interface IDict {
    [key: string]: any;
}
export declare const countryCurrency: IDict;
export declare const countryFeeRate: IDict;
export declare function calculateAge(birthDateString: string): number;
export declare const canWithdrawMoney: ({ is_from_v1, balance_xaf, }: {
    is_from_v1: boolean;
    balance_xaf: any;
}) => boolean;
export declare const translateGender: (gender: string) => string;
export declare const translateCountry: (gender: string) => string;
export declare function isEmptyString(input: any): boolean;
export declare function removeLeadingZero(phoneNumber: string): string;
export declare const getFormattedDateTime: (entry: Date, format?: string, lang?: string) => string;
export declare const getFormattedDate: (entry: Date, lang?: string, isText?: boolean) => string;
export declare const getFormattedTime: (entry: Date) => string;
export declare const getTextFormattedDate: (entry: Date | string, lang?: string, withHours?: boolean) => string;
export declare const getTransactionOperator: (method: string) => string;
export declare function removeProvinceFromStateName(text: string): string;
export declare function isValidTextInput(text: string): boolean;
export declare function truncateText(text: string, maxLength?: number, appendEllipsis?: boolean): string;
export declare function sanitizeTextInput(text: string): string;
export declare function sanitizeName(text: string, uppercase?: boolean): string;
export {};
