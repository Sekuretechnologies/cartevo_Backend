import { CompanyService } from "./company.service";
import { WalletResponseDto, PersonalInfoDto, PersonalInfoResponseDto, BusinessInfoDto, BusinessInfoResponseDto, CheckExistingUserResponseDto, UpdateKybStatusDto, UpdateKybStatusResponseDto, TransactionResponseDto, CompanyUserDto, CreateExchangeRateDto, UpdateExchangeRateDto, CurrencyConversionDto, CreateTransactionFeeDto, UpdateTransactionFeeDto, CalculateTransactionFeeDto, CompleteKycDto, CompleteKycResponseDto, CompleteKybDto, CompleteKybResponseDto, BankingInfoDto, BankingInfoResponseDto, CompleteProfileDto, CompleteProfileResponseDto, OnboardingStatusDto } from "./dto/company.dto";
import { CurrentBusinessData } from "../common/decorators/current-business.decorator";
export declare class CompanyController {
    private readonly companyService;
    constructor(companyService: CompanyService);
    registerPersonalInfo(personalInfoDto: PersonalInfoDto, files: {
        id_document_front?: any[];
        id_document_back?: any[];
        proof_of_address?: any[];
    }): Promise<PersonalInfoResponseDto | CheckExistingUserResponseDto>;
    registerBusinessInfo(businessInfoDto: BusinessInfoDto, files: {
        share_holding_document?: any[];
        incorporation_certificate?: any[];
        proof_of_address?: any[];
        memart?: any[];
    }): Promise<BusinessInfoResponseDto>;
    registerCompanyUser(createDto: CompanyUserDto): Promise<BusinessInfoResponseDto>;
    getCompanyWallets(business: CurrentBusinessData): Promise<{
        data: WalletResponseDto[];
    }>;
    getCompanyTransactions(business: CurrentBusinessData): Promise<{
        data: TransactionResponseDto[];
    }>;
    getAllCompanies(): Promise<{
        companies: any[];
    }>;
    getCompanyById(companyId: string): Promise<{
        company: any;
    }>;
    updateKybStatus(companyId: string, updateKybStatusDto: UpdateKybStatusDto): Promise<UpdateKybStatusResponseDto>;
    createExchangeRate(business: CurrentBusinessData, createExchangeRateDto: CreateExchangeRateDto): Promise<any>;
    getCompanyExchangeRates(business: CurrentBusinessData): Promise<any>;
    updateExchangeRate(exchangeRateId: string, updateExchangeRateDto: UpdateExchangeRateDto): Promise<any>;
    deleteExchangeRate(exchangeRateId: string): Promise<any>;
    convertCurrency(business: CurrentBusinessData, currencyConversionDto: CurrencyConversionDto): Promise<any>;
    createTransactionFee(business: CurrentBusinessData, createTransactionFeeDto: CreateTransactionFeeDto): Promise<any>;
    getCompanyTransactionFees(business: CurrentBusinessData): Promise<any>;
    updateTransactionFee(feeId: string, updateTransactionFeeDto: UpdateTransactionFeeDto): Promise<any>;
    deleteTransactionFee(feeId: string): Promise<any>;
    calculateTransactionFee(business: CurrentBusinessData, calculateTransactionFeeDto: CalculateTransactionFeeDto): Promise<any>;
    completeKyc(business: CurrentBusinessData, completeKycDto: CompleteKycDto, files: {
        id_document_front?: any[];
        id_document_back?: any[];
        proof_of_address?: any[];
    }): Promise<CompleteKycResponseDto>;
    completeKyb(business: CurrentBusinessData, completeKybDto: CompleteKybDto, files: {
        share_holding_document?: any[];
        incorporation_certificate?: any[];
        business_proof_of_address?: any[];
    }): Promise<CompleteKybResponseDto>;
    addBankingInfo(business: CurrentBusinessData, bankingInfoDto: BankingInfoDto): Promise<BankingInfoResponseDto>;
    completeProfile(business: CurrentBusinessData, completeProfileDto: CompleteProfileDto): Promise<CompleteProfileResponseDto>;
    getOnboardingStatus(business: CurrentBusinessData): Promise<OnboardingStatusDto>;
}
