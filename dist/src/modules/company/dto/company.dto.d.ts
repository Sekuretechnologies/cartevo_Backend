export declare class CompanyUserDto {
    business_name: string;
    first_name: string;
    last_name: string;
    business_email: string;
    phone_number: string;
    business_type: string;
    business_country: string;
    business_country_phone_code: string;
    business_country_iso_code: string;
    business_country_currency: string;
    id_document_type: string;
    id_number: string;
    id_document_front: any;
    id_document_back: any;
    country_of_residence: string;
    password: string;
    confirm_password: string;
}
export declare class PersonalInfoDto {
    company_name: string;
    first_name: string;
    last_name: string;
    role: string;
    phone_number: string;
    gender: string;
    nationality: string;
    id_document_type: string;
    id_number: string;
    id_document_front: any;
    id_document_back: any;
    country_of_residence: string;
    state: string;
    city: string;
    street: string;
    postal_code: string;
    proof_of_address: any;
    email: string;
    password: string;
    confirm_password: string;
}
export declare class BusinessInfoDto {
    company_id: string;
    business_name: string;
    business_phone_number: string;
    business_address: string;
    business_type: string;
    country_of_operation: string;
    tax_id_number: string;
    business_website?: string;
    business_description: string;
    source_of_funds: string;
    share_holding_document: any;
    incorporation_certificate: any;
    proof_of_address: any;
}
export declare class CreateCompanyUserDto {
    full_name_user: string;
    email_user: string;
    password_user: string;
    name_company: string;
    country_company: string;
    email_company: string;
}
export declare class CompanyResponseDto {
    id: string;
    name: string;
    country: string;
    email: string;
    client_id: string;
    client_key: string;
    card_price: number;
    card_fund_rate: number;
    created_at: Date;
    updated_at: Date;
}
export declare class UserResponseDto {
    id: string;
    full_name: string;
    email: string;
    company_id: string;
    step: number;
    created_at: Date;
    updated_at: Date;
}
export declare class WalletResponseDto {
    id: string;
    balance: number;
    active: boolean;
    currency: string;
    country: string;
    country_iso_code: string;
    company_id: string;
    created_at: Date;
    updated_at: Date;
}
export declare class CreateCompanyUserResponseDto {
    status: boolean;
    message: string;
    user: UserResponseDto;
    company: CompanyResponseDto;
    wallets?: WalletResponseDto[];
}
export declare class ErrorResponseDto {
    success: boolean;
    message: string;
    error?: string;
}
export declare class PersonalInfoResponseDto {
    success: boolean;
    message: string;
    company_id: string;
    company_name: string;
    user_id: string;
    user_name: string;
    user_email: string;
    next_step: number;
}
export declare class BusinessInfoResponseDto {
    success: boolean;
    message: string;
    company_id: string;
    company_name: string;
    user_id: string;
    user_name: string;
    user_email: string;
    next_step: string;
}
export declare class CheckExistingUserResponseDto {
    success: boolean;
    message: string;
    user_exists: boolean;
    company_id?: string;
    company_name?: string;
    company_step?: number;
    action_required?: string;
}
export declare class UpdateKybStatusDto {
    kyb_status: string;
}
export declare class UpdateKycStatusDto {
    kyc_status: string;
}
export declare class UpdateKybStatusResponseDto {
    success: boolean;
    message: string;
    company_id: string;
    kyb_status: string;
    updated_at: Date;
}
export declare class UpdateKycStatusResponseDto {
    success: boolean;
    message: string;
    user_id: string;
    kyc_status: string;
    updated_at: Date;
}
export declare class TransactionResponseDto {
    id: string;
    category: string;
    type: string;
    card_id: string;
    card_balance_before: number;
    card_balance_after: number;
    wallet_balance_before: number;
    wallet_balance_after: number;
    amount: number;
    currency?: string;
    status?: string;
    created_at: Date;
    mcc?: string | null;
    mid?: string | null;
    merchant?: any;
    wallet_id?: string | null;
    customer_id: string;
    company_id: string;
    order_id?: string | null;
    provider?: string | null;
    description?: string | null;
    reason?: string | null;
    reference?: string | null;
    updated_at?: Date | string;
}
export declare class CompleteKycDto {
    id_document_type: string;
    id_number: string;
    id_document_front: any;
    id_document_back?: any;
    proof_of_address: any;
    country_of_residence: string;
    state: string;
    city: string;
    street: string;
    postal_code: string;
}
export declare class CompleteKycResponseDto {
    success: boolean;
    message: string;
    user_id: string;
    kyc_status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
    next_step: string;
    completed_at: Date;
}
export declare class CompleteKybDto {
    business_phone_number: string;
    business_address: string;
    tax_id_number: string;
    business_website?: string;
    business_description: string;
    source_of_funds: string;
    share_holding_document: any;
    incorporation_certificate: any;
    business_proof_of_address: any;
}
export declare class CompleteKybResponseDto {
    success: boolean;
    message: string;
    company_id: string;
    kyb_status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
    next_step: string;
    completed_at: Date;
}
export declare class BankingInfoDto {
    account_holder_name: string;
    account_number: string;
    routing_number: string;
    bank_name: string;
    swift_code: string;
    bank_address: string;
    bank_country: string;
    bank_currency: string;
}
export declare class BankingInfoResponseDto {
    success: boolean;
    message: string;
    company_id: string;
    bank_account_id: string;
    next_step: string;
    completed_at: Date;
}
export declare class CompleteProfileDto {
    role_in_company: string;
    phone_number: string;
    gender: string;
    nationality: string;
    address: string;
}
export declare class CompleteProfileResponseDto {
    success: boolean;
    message: string;
    user_id: string;
    company_id: string;
    next_step: string;
    completed_at: Date;
}
export declare class OnboardingStatusDto {
    company_id: string;
    user_id: string;
    current_step: number;
    completed_steps: string[];
    next_step: string;
    is_complete: boolean;
    kyc_status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
    kyb_status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
    banking_info_complete: boolean;
    profile_complete: boolean;
}
export declare class CreateExchangeRateDto {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    source?: string;
    description?: string;
    isActive?: boolean;
}
export declare class UpdateExchangeRateDto {
    rate?: number;
    source?: string;
    description?: string;
    isActive?: boolean;
}
export declare class ExchangeRateResponseDto {
    id: string;
    company_id: string;
    from_currency: string;
    to_currency: string;
    rate: number;
    source?: string;
    description?: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export declare class CurrencyConversionDto {
    amount: number;
    fromCurrency: string;
    toCurrency: string;
}
export declare class CurrencyConversionResponseDto {
    convertedAmount: number;
    rate: number;
    exchangeRateId: string;
    fromCurrency: string;
    toCurrency: string;
}
export declare class CreateTransactionFeeDto {
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
}
export declare class UpdateTransactionFeeDto {
    feePercentage?: number;
    feeFixed?: number;
    type?: "FIXED" | "PERCENTAGE";
    value?: number;
    active?: boolean;
    description?: string;
}
export declare class TransactionFeeResponseDto {
    id: string;
    company_id: string;
    transaction_type: string;
    transaction_category: string;
    country_iso_code: string;
    currency: string;
    fee_percentage?: number;
    fee_fixed?: number;
    type: "FIXED" | "PERCENTAGE";
    value: number;
    active: boolean;
    description?: string;
    created_at: Date;
    updated_at: Date;
}
export declare class CalculateTransactionFeeDto {
    amount: number;
    transactionType: string;
    transactionCategory: string;
    countryIsoCode: string;
    currency: string;
}
export declare class CalculateTransactionFeeResponseDto {
    feeAmount: number;
    feeType: "FIXED" | "PERCENTAGE";
    feeValue: number;
    calculatedPercentage?: number;
    calculatedFixed?: number;
    transactionFeeId: string;
}
