import { CardService } from "./card.service";
import { CreateCardDto, FundCardDto, WithdrawCardDto, CardResponseDto, CreateCardResponseDto, TransactionResponseDto } from "./dto/card.dto";
import { CurrentBusinessData } from "../common/decorators/current-business.decorator";
import { SuccessResponseDto } from "../common/dto/response.dto";
export declare class CardController {
    private readonly cardService;
    constructor(cardService: CardService);
    create(business: CurrentBusinessData, createCardDto: CreateCardDto): Promise<CreateCardResponseDto>;
    fundCard(business: CurrentBusinessData, cardId: string, fundDto: FundCardDto): Promise<SuccessResponseDto>;
    withdrawFromCard(business: CurrentBusinessData, cardId: string, withdrawDto: WithdrawCardDto): Promise<SuccessResponseDto>;
    freezeCard(business: CurrentBusinessData, cardId: string): Promise<SuccessResponseDto>;
    unfreezeCard(business: CurrentBusinessData, cardId: string): Promise<SuccessResponseDto>;
    findAll(business: CurrentBusinessData): Promise<CardResponseDto[]>;
    findOne(business: CurrentBusinessData, cardId: string): Promise<CardResponseDto>;
    getCardTransactions(business: CurrentBusinessData, cardId: string): Promise<TransactionResponseDto[]>;
}
