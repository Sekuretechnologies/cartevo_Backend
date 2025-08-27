import { CreateCustomerDto, CustomerResponseDto } from "./dto/customer.dto";
import { FirebaseService } from "@/services/firebase.service";
export declare class CustomerService {
    private firebaseService;
    constructor(firebaseService: FirebaseService);
    create(companyId: string, createCustomerDto: CreateCustomerDto, files?: {
        id_document_front?: any[];
        id_document_back?: any[];
    }): Promise<CustomerResponseDto>;
    update(companyId: string, customerId: string, createCustomerDto: CreateCustomerDto, files?: {
        id_document_front?: any[];
        id_document_back?: any[];
    }): Promise<CustomerResponseDto>;
    findAllByCompany(companyId: string): Promise<{
        data: any[];
    }>;
    findAllCustomersWithCardCountByCompany(companyId: string): Promise<{
        data: any[];
    }>;
    findOne(companyId: string, customerId: string): Promise<{
        data: any;
    }>;
    findCustomerCards(companyId: string, customerId: string): Promise<{
        data: any[];
    }>;
    findCustomerTransactions(companyId: string, customerId: string): Promise<{
        data: any[];
    }>;
    private mapToResponseDto;
}
