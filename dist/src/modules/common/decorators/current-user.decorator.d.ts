export interface CurrentUserData {
    userId: string;
    email: string;
    company_id: string;
    roles: string[];
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
