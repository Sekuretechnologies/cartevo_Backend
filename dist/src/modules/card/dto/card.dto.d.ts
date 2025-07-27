export declare class CreateCardDto {
    customer_id: string;
    amount: number;
    name_on_card: string;
    brand: string;
}
export declare class FundCardDto {
    amount: number;
}
export declare class WithdrawCardDto {
    amount: number;
}
export declare class CardResponseDto {
    id: string;
    customer_id: string;
    status: string;
    balance: number;
    number: string;
    created_at: Date;
    customer?: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
    };
}
export declare class CreateCardResponseDto {
    status: string;
    message: string;
    card: CardResponseDto;
}
export declare class TransactionResponseDto {
    id: string;
    category: string;
    type: string;
    id_card: string;
    card_balance_before: number;
    card_balance_after: number;
    wallet_balance_before: number;
    wallet_balance_after: number;
    amount: number;
    currency?: string;
    status?: string;
    created_at: Date;
}
