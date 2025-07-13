import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthTokenRequestDto, AuthTokenResponseDto } from './dto/auth.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    generateToken(authDto: AuthTokenRequestDto): Promise<AuthTokenResponseDto>;
    private parseExpiresIn;
}
