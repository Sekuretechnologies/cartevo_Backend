import { CreateCustomerDto, CustomerResponseDto } from "./dto/customer.dto";
export declare class CustomerService {
    constructor();
    create(companyId: string, createCustomerDto: CreateCustomerDto): Promise<CustomerResponseDto>;
    findAllByCompany(companyId: string): Promise<CustomerResponseDto[]>;
    findOne(companyId: string, customerId: string): Promise<CustomerResponseDto>;
    private mapToResponseDto;
}
