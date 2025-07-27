import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { CreateCustomerDto, CustomerResponseDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentBusiness, CurrentBusinessData } from '../common/decorators/current-business.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiOperation({
    summary: 'Register new customer',
    description: 'Register a new customer under the business account',
  })
  @ApiResponse({
    status: 201,
    description: 'Customer registered successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Customer with this email already exists',
  })
  async create(
    @CurrentBusiness() business: CurrentBusinessData,
    @Body() createCustomerDto: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.customerService.create(business.businessId, createCustomerDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all customers',
    description: 'Retrieve all customers registered under the business',
  })
  @ApiResponse({
    status: 200,
    description: 'Customers retrieved successfully',
    type: [CustomerResponseDto],
  })
  async findAll(
    @CurrentBusiness() business: CurrentBusinessData,
  ): Promise<CustomerResponseDto[]> {
    return this.customerService.findAllByCompany(business.businessId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get customer details',
    description: 'Retrieve details of a specific customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer details retrieved successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  async findOne(
    @CurrentBusiness() business: CurrentBusinessData,
    @Param('id') id: string,
  ): Promise<CustomerResponseDto> {
    return this.customerService.findOne(business.businessId, id);
  }
}
