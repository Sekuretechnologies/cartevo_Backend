import { PrismaService } from "@/modules/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { CreateUserDto, RegisterUserDto, LoginDto, VerifyOtpDto, UpdateUserDto, UserResponseDto, CreateUserResponseDto, AuthResponseDto, LoginSuccessResponseDto, UpdateKycStatusDto, UpdateKycStatusResponseDto } from "./dto/user.dto";
import { EmailService } from "../../services/email.service";
export declare class UserService {
    private prisma;
    private jwtService;
    private emailService;
    constructor(prisma: PrismaService, jwtService: JwtService, emailService: EmailService);
    createUser(ownerUserId: string, createUserDto: CreateUserDto): Promise<CreateUserResponseDto>;
    registerUser(registerDto: RegisterUserDto): Promise<{
        success: boolean;
        message: string;
    }>;
    login(loginDto: LoginDto): Promise<AuthResponseDto>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<LoginSuccessResponseDto>;
    updateUser(ownerUserId: string, userId: string, updateDto: UpdateUserDto): Promise<UserResponseDto>;
    deleteUser(ownerUserId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getCompanyUsers(userId: string): Promise<UserResponseDto[]>;
    getAllUsers(): Promise<{
        users: any[];
    }>;
    getUserById(userId: string): Promise<{
        user: any;
    }>;
    updateKycStatus(userId: string, updateKycStatusDto: UpdateKycStatusDto): Promise<UpdateKycStatusResponseDto>;
    private generateInvitationCode;
    private generateOTP;
    private mapToResponseDto;
}
