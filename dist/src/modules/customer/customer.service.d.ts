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
    findAllByCompany(companyId: string): Promise<CustomerResponseDto[]>;
    findOne(companyId: string, customerId: string): Promise<CustomerResponseDto>;
    private mapToResponseDto;
}
