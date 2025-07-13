import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, CustomerResponseDto } from './dto/customer.dto';
export declare class CustomerService {
    private prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, createCustomerDto: CreateCustomerDto): Promise<CustomerResponseDto>;
    findAllByCompany(companyId: string): Promise<CustomerResponseDto[]>;
    findOne(companyId: string, customerId: string): Promise<CustomerResponseDto>;
    private mapToResponseDto;
}
