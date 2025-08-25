import { CompanyService } from "./company.service";
import { CreateCompanyUserDto, CreateCompanyUserResponseDto, WalletResponseDto, PersonalInfoDto, PersonalInfoResponseDto, BusinessInfoDto, BusinessInfoResponseDto, CheckExistingUserResponseDto, UpdateKybStatusDto, UpdateKybStatusResponseDto, TransactionResponseDto } from "./dto/company.dto";
import { CurrentBusinessData } from "../common/decorators/current-business.decorator";
export declare class CompanyController {
    private readonly companyService;
    constructor(companyService: CompanyService);
    registerPersonalInfo(personalInfoDto: PersonalInfoDto, files: {
        id_document_front?: any[];
        id_document_back?: any[];
        proof_of_address?: any[];
    }): Promise<PersonalInfoResponseDto | CheckExistingUserResponseDto>;
    registerBusinessInfo(businessInfoDto: BusinessInfoDto, files: {
        share_holding_document?: any[];
        incorporation_certificate?: any[];
        proof_of_address?: any[];
        memart?: any[];
    }): Promise<BusinessInfoResponseDto>;
    registerCompanyUser(createDto: CreateCompanyUserDto): Promise<CreateCompanyUserResponseDto>;
    getCompanyWallets(business: CurrentBusinessData): Promise<{
        data: WalletResponseDto[];
    }>;
    getCompanyTransactions(business: CurrentBusinessData): Promise<{
        data: TransactionResponseDto[];
    }>;
    getAllCompanies(): Promise<{
        companies: any[];
    }>;
    getCompanyById(companyId: string): Promise<{
        company: any;
    }>;
    updateKybStatus(companyId: string, updateKybStatusDto: UpdateKybStatusDto): Promise<UpdateKybStatusResponseDto>;
}
