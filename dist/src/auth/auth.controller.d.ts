import { AuthService } from './auth.service';
import { AuthTokenRequestDto, AuthTokenResponseDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    generateToken(authDto: AuthTokenRequestDto): Promise<AuthTokenResponseDto>;
}
