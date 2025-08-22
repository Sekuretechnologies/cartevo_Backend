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
    memart: any;
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
