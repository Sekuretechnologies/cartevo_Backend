export declare class CreateUserDto {
    email: string;
    role: string;
}
export declare class RegisterUserDto {
    email: string;
    invitation_code: string;
    full_name: string;
    password: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class VerifyOtpDto {
    email: string;
    otp: string;
}
export declare class UpdateUserDto {
    full_name?: string;
    role?: string;
}
export declare class UserResponseDto {
    id: string;
    full_name?: string;
    email: string;
    company_id: string;
    status: string;
    step: number;
    role: string;
    created_at: Date;
    updated_at: Date;
}
export declare class CreateUserResponseDto {
    success: boolean;
    message: string;
    user: UserResponseDto;
    invitation_code: string;
}
export declare class AuthResponseDto {
    success: boolean;
    message: string;
    requires_otp: boolean;
}
export declare class LoginSuccessResponseDto {
    success: boolean;
    message: string;
    access_token: string;
    user: UserResponseDto;
    company: {
        id: string;
        name: string;
        country: string;
    };
    redirect_to: string;
}
export declare class UpdateKycStatusDto {
    kyc_status: string;
}
export declare class UpdateKycStatusResponseDto {
    success: boolean;
    message: string;
    user_id: string;
    kyc_status: string;
    updated_at: Date;
}
