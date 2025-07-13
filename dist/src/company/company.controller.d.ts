import { CompanyService } from './company.service';
import { CreateCompanyUserDto, CreateCompanyUserResponseDto, WalletResponseDto } from './dto/company.dto';
import { CurrentBusinessData } from '../common/decorators/current-business.decorator';
export declare class CompanyController {
    private readonly companyService;
    constructor(companyService: CompanyService);
    registerCompanyUser(createDto: CreateCompanyUserDto): Promise<CreateCompanyUserResponseDto>;
    getCompanyWallets(business: CurrentBusinessData): Promise<{
        wallets: WalletResponseDto[];
    }>;
}
