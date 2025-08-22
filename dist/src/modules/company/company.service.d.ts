import { CreateCompanyUserDto, CreateCompanyUserResponseDto, WalletResponseDto, PersonalInfoDto, PersonalInfoResponseDto, BusinessInfoDto, BusinessInfoResponseDto, CheckExistingUserResponseDto, UpdateKybStatusDto, UpdateKybStatusResponseDto } from "./dto/company.dto";
import { FirebaseService } from "../../services/firebase.service";
import { EmailService } from "../../services/email.service";
export declare class CompanyService {
    private firebaseService;
    private emailService;
    constructor(firebaseService: FirebaseService, emailService: EmailService);
    createCompanyUser(createDto: CreateCompanyUserDto): Promise<CreateCompanyUserResponseDto>;
    registerPersonalInfo(personalInfoDto: PersonalInfoDto, files?: {
        id_document_front?: any[];
        id_document_back?: any[];
        proof_of_address?: any[];
    }): Promise<PersonalInfoResponseDto | CheckExistingUserResponseDto>;
    registerBusinessInfo(businessInfoDto: BusinessInfoDto, files?: {
        share_holding_document?: any[];
        incorporation_certificate?: any[];
        proof_of_address?: any[];
        memart?: any[];
    }): Promise<BusinessInfoResponseDto>;
    getCompanyBalance(companyId: string): Promise<{
        wallets: WalletResponseDto[];
    }>;
    updateKybStatus(companyId: string, updateKybStatusDto: UpdateKybStatusDto): Promise<UpdateKybStatusResponseDto>;
    private generateClientId;
    private generateClientKey;
    private mapCompanyToResponseDto;
    private mapUserToResponseDto;
    private mapWalletToResponseDto;
}
