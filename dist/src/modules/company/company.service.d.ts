import { WalletResponseDto, PersonalInfoDto, PersonalInfoResponseDto, BusinessInfoDto, BusinessInfoResponseDto, CheckExistingUserResponseDto, UpdateKybStatusDto, UpdateKybStatusResponseDto, TransactionResponseDto, CompanyUserDto, CompleteKycDto, CompleteKycResponseDto, CompleteKybDto, CompleteKybResponseDto, BankingInfoDto, BankingInfoResponseDto, CompleteProfileDto, CompleteProfileResponseDto, OnboardingStatusDto } from "./dto/company.dto";
import { FirebaseService } from "../../services/firebase.service";
import { EmailService } from "../../services/email.service";
export declare class CompanyService {
    private firebaseService;
    private emailService;
    constructor(firebaseService: FirebaseService, emailService: EmailService);
    createCompanyUser(createDto: CompanyUserDto): Promise<BusinessInfoResponseDto>;
    registerPersonalInfo(personalInfoDto: PersonalInfoDto, files?: {
        id_document_front?: any[];
        id_document_back?: any[];
        proof_of_address?: any[];
    }): Promise<PersonalInfoResponseDto | CheckExistingUserResponseDto>;
    registerBusinessInfo(businessInfoDto: BusinessInfoDto, files?: {
        share_holding_document?: any[];
        incorporation_certificate?: any[];
        proof_of_address?: any[];
        memart?: any[];
    }): Promise<BusinessInfoResponseDto>;
    getCompanyBalance(companyId: string): Promise<{
        data: WalletResponseDto[];
    }>;
    getCompanyTransactions(companyId: string): Promise<{
        data: TransactionResponseDto[];
    }>;
    getAllCompanies(): Promise<{
        companies: any[];
    }>;
    getCompanyById(companyId: string): Promise<{
        company: any;
    }>;
    updateKybStatus(companyId: string, updateKybStatusDto: UpdateKybStatusDto): Promise<UpdateKybStatusResponseDto>;
    private generateClientId;
    private generateClientKey;
    private mapCompanyToResponseDto;
    private mapUserToResponseDto;
    private mapWalletToResponseDto;
    createExchangeRate(companyId: string, exchangeRateData: {
        fromCurrency: string;
        toCurrency: string;
        rate: number;
        source?: string;
        description?: string;
        isActive?: boolean;
    }): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
    getCompanyExchangeRates(companyId: string): Promise<{
        success: boolean;
        data: any;
    }>;
    updateExchangeRate(exchangeRateId: string, updateData: {
        rate?: number;
        source?: string;
        description?: string;
        isActive?: boolean;
    }): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
    deleteExchangeRate(exchangeRateId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    convertCurrency(companyId: string, amount: number, fromCurrency: string, toCurrency: string): Promise<{
        success: boolean;
        data: any;
    }>;
    createTransactionFee(companyId: string, feeData: {
        transactionType: string;
        transactionCategory: string;
        countryIsoCode: string;
        currency: string;
        feePercentage?: number;
        feeFixed?: number;
        type: "FIXED" | "PERCENTAGE";
        value: number;
        active?: boolean;
        description?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
    getCompanyTransactionFees(companyId: string): Promise<{
        success: boolean;
        data: any;
    }>;
    updateTransactionFee(feeId: string, updateData: {
        feePercentage?: number;
        feeFixed?: number;
        type?: "FIXED" | "PERCENTAGE";
        value?: number;
        active?: boolean;
        description?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
    deleteTransactionFee(feeId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    calculateTransactionFee(companyId: string, amount: number, transactionType: string, transactionCategory: string, countryIsoCode: string, currency: string): Promise<{
        success: boolean;
        data: any;
    }>;
    completeKyc(companyId: string, kycData: CompleteKycDto, files?: {
        id_document_front?: any[];
        id_document_back?: any[];
        proof_of_address?: any[];
    }): Promise<CompleteKycResponseDto>;
    completeKyb(companyId: string, kybData: CompleteKybDto, files?: {
        share_holding_document?: any[];
        incorporation_certificate?: any[];
        business_proof_of_address?: any[];
    }): Promise<CompleteKybResponseDto>;
    addBankingInfo(companyId: string, bankingData: BankingInfoDto): Promise<BankingInfoResponseDto>;
    completeProfile(companyId: string, profileData: CompleteProfileDto): Promise<CompleteProfileResponseDto>;
    getOnboardingStatus(companyId: string, userId: string): Promise<OnboardingStatusDto>;
}
