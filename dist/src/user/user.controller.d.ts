import { UserService } from './user.service';
import { CreateUserDto, RegisterUserDto, LoginDto, VerifyOtpDto, UpdateUserDto, UserResponseDto, CreateUserResponseDto, AuthResponseDto, LoginSuccessResponseDto } from './dto/user.dto';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { SuccessResponseDto } from '../common/dto/response.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    createUser(currentUser: CurrentUserData, createUserDto: CreateUserDto): Promise<CreateUserResponseDto>;
    registerUser(registerDto: RegisterUserDto): Promise<SuccessResponseDto>;
    getCompanyUsers(currentUser: CurrentUserData): Promise<UserResponseDto[]>;
    updateUser(currentUser: CurrentUserData, userId: string, updateDto: UpdateUserDto): Promise<UserResponseDto>;
    deleteUser(currentUser: CurrentUserData, userId: string): Promise<SuccessResponseDto>;
}
export declare class AuthController {
    private readonly userService;
    constructor(userService: UserService);
    login(loginDto: LoginDto): Promise<AuthResponseDto>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<LoginSuccessResponseDto>;
}
