interface IStatusCode {
    [key: string]: any;
}
export type TCode = 'BAD_ENTRY' | 'NOT_AUTHORIZED' | 'ERROR' | 'FORBIDDEN' | 'NOT_FOUND';
export declare const statusCodes: IStatusCode;
export interface InputProps {
    output?: any;
    error?: any;
    message?: string;
    code?: number | TCode;
}
export interface OutputProps {
    status: string;
    output?: any;
    error?: any;
    message?: string;
    code: number;
}
declare const fnOutput: {
    success: ({ output, error, message, code }: InputProps) => OutputProps;
    error: ({ output, error, message, code }: InputProps) => OutputProps;
};
export default fnOutput;
