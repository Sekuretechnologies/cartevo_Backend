export declare class CreateCardDto {
    customer_id: string;
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
    success: boolean;
    message: string;
    card: CardResponseDto;
    transaction: {
        id: string;
        type: string;
        amount: number;
        card_balance_before: number;
        card_balance_after: number;
        wallet_balance_before: number;
        wallet_balance_after: number;
    };
}
export declare class TransactionResponseDto {
    id: string;
    type: string;
    id_card: string;
    card_balance_before: number;
    card_balance_after: number;
    wallet_balance_before: number;
    wallet_balance_after: number;
    amount: number;
    reference?: string;
    created_at: Date;
}
