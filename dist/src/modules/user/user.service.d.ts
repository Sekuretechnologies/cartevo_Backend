import { PrismaService } from "@/modules/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { CreateUserDto, RegisterUserDto, LoginDto, VerifyOtpDto, UpdateUserDto, UserResponseDto, CreateUserResponseDto, AuthResponseDto, LoginSuccessResponseDto } from "./dto/user.dto";
export declare class UserService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
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
    private generateInvitationCode;
    private generateOTP;
    private mapToResponseDto;
}
