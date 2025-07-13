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
