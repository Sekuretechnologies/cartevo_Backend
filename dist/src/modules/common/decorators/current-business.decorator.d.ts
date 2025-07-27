export interface CurrentBusinessData {
    businessId: string;
    clientId: string;
    businessName: string;
}
export declare const CurrentBusiness: (...dataOrPipes: unknown[]) => ParameterDecorator;
