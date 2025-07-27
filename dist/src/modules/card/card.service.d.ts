import { PrismaService } from "../prisma/prisma.service";
import { CreateCardDto, CardResponseDto, CreateCardResponseDto, TransactionResponseDto } from "./dto/card.dto";
export declare class CardService {
    private prisma;
    constructor(prisma: PrismaService);
    createCard(createCardDto: CreateCardDto): Promise<CreateCardResponseDto>;
    fundCard(companyId: string, cardId: string, amount: number): Promise<{
        status: string;
        message: string;
    }>;
    withdrawFromCard(companyId: string, cardId: string, amount: number): Promise<{
        status: string;
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
    findAllByCompany(companyId: string): Promise<CardResponseDto[]>;
    findOne(companyId: string, cardId: string, reveal?: boolean): Promise<CardResponseDto>;
    getTransactions(companyId: string, cardId: string): Promise<TransactionResponseDto[]>;
    private generateCardNumber;
    private mapToResponseDto;
    private maskCardNumber;
}
