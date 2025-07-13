export declare class SuccessResponseDto {
    success: boolean;
    message: string;
    data?: any;
}
export declare class ErrorResponseDto {
    success: boolean;
    message: string;
    statusCode: number;
    error?: string;
}
export declare class PaginatedResponseDto<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
