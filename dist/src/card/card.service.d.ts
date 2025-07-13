import { PrismaService } from '../prisma/prisma.service';
import { CreateCardDto, FundCardDto, WithdrawCardDto, CardResponseDto, CreateCardResponseDto, TransactionResponseDto } from './dto/card.dto';
export declare class CardService {
    private prisma;
    constructor(prisma: PrismaService);
    createCard(companyId: string, createCardDto: CreateCardDto): Promise<CreateCardResponseDto>;
    fundCard(companyId: string, cardId: string, fundDto: FundCardDto): Promise<{
        success: boolean;
        message: string;
    }>;
    withdrawFromCard(companyId: string, cardId: string, withdrawDto: WithdrawCardDto): Promise<{
        success: boolean;
        message: string;
    }>;
    freezeCard(companyId: string, cardId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    unfreezeCard(companyId: string, cardId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    terminateCard(companyId: string, cardId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    findAllByCompany(companyId: string): Promise<CardResponseDto[]>;
    findOne(companyId: string, cardId: string): Promise<CardResponseDto>;
    getTransactions(companyId: string, cardId: string): Promise<TransactionResponseDto[]>;
    private generateCardNumber;
    private mapToResponseDto;
    private maskCardNumber;
}
