import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyUserDto, CreateCompanyUserResponseDto, WalletResponseDto } from './dto/company.dto';
export declare class CompanyService {
    private prisma;
    constructor(prisma: PrismaService);
    createCompanyUser(createDto: CreateCompanyUserDto): Promise<CreateCompanyUserResponseDto>;
    getCompanyBalance(companyId: string): Promise<{
        wallets: WalletResponseDto[];
    }>;
    private generateClientId;
    private generateClientKey;
    private mapCompanyToResponseDto;
    private mapUserToResponseDto;
    private mapWalletToResponseDto;
}
