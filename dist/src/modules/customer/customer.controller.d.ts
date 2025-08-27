import { CustomerService } from "./customer.service";
import { CreateCustomerDto, CustomerResponseDto } from "./dto/customer.dto";
import { CurrentBusinessData } from "../common/decorators/current-business.decorator";
export declare class CustomerController {
    private readonly customerService;
    constructor(customerService: CustomerService);
    create(business: CurrentBusinessData, createCustomerDto: CreateCustomerDto, files: {
        id_document_front?: any[];
        id_document_back?: any[];
    }): Promise<CustomerResponseDto>;
    update(business: CurrentBusinessData, customerId: string, createCustomerDto: CreateCustomerDto, files: {
        id_document_front?: any[];
        id_document_back?: any[];
    }): Promise<CustomerResponseDto>;
    findAll(business: CurrentBusinessData): Promise<{
        data: any[];
    }>;
    findOne(business: CurrentBusinessData, id: string): Promise<{
        data: any;
    }>;
    findCustomerCards(business: CurrentBusinessData, id: string): Promise<{
        data: any[];
    }>;
    findCustomerTransactions(business: CurrentBusinessData, id: string): Promise<{
        data: any[];
    }>;
}
