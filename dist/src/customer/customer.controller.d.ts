import { CustomerService } from './customer.service';
import { CreateCustomerDto, CustomerResponseDto } from './dto/customer.dto';
import { CurrentBusinessData } from '../common/decorators/current-business.decorator';
export declare class CustomerController {
    private readonly customerService;
    constructor(customerService: CustomerService);
    create(business: CurrentBusinessData, createCustomerDto: CreateCustomerDto): Promise<CustomerResponseDto>;
    findAll(business: CurrentBusinessData): Promise<CustomerResponseDto[]>;
    findOne(business: CurrentBusinessData, id: string): Promise<CustomerResponseDto>;
}
