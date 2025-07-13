export interface CurrentUserData {
    userId: string;
    email: string;
    companyId: string;
    roles: string[];
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
