import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Put,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from "@nestjs/swagger";
import { CustomerService } from "./customer.service";
import { CreateCustomerDto, CustomerResponseDto } from "./dto/customer.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CurrentBusiness,
  CurrentBusinessData,
} from "../common/decorators/current-business.decorator";
import { FileFieldsInterceptor } from "@nestjs/platform-express";

@ApiTags("Customers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("customers")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "id_document_front", maxCount: 1 },
      { name: "id_document_back", maxCount: 1 },
    ])
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Register new customer",
    description: "Register a new customer under the business account",
  })
  @ApiResponse({
    status: 201,
    description: "Customer registered successfully",
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "Customer with this email already exists",
  })
  async create(
    @CurrentBusiness() business: CurrentBusinessData,
    @Body() createCustomerDto: CreateCustomerDto,
    @UploadedFiles()
    files: {
      id_document_front?: any[];
      id_document_back?: any[];
    }
  ): Promise<CustomerResponseDto> {
    return this.customerService.create(business.businessId, createCustomerDto);
  }

  @Put()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "id_document_front", maxCount: 1 },
      { name: "id_document_back", maxCount: 1 },
    ])
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Update customer",
    description: "Update a customer under the business account",
  })
  @ApiResponse({
    status: 201,
    description: "Customer updated successfully",
    type: CustomerResponseDto,
  })
  async update(
    @CurrentBusiness() business: CurrentBusinessData,
    @Param("id") customerId: string,
    @Body() createCustomerDto: CreateCustomerDto,
    @UploadedFiles()
    files: {
      id_document_front?: any[];
      id_document_back?: any[];
    }
  ): Promise<CustomerResponseDto> {
    return this.customerService.update(
      business.businessId,
      customerId,
      createCustomerDto
    );
  }

  @Get()
  @ApiOperation({
    summary: "List all customers",
    description: "Retrieve all customers registered under the business",
  })
  @ApiResponse({
    status: 200,
    description: "Customers retrieved successfully",
    type: [CustomerResponseDto],
  })
  async findAll(
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<CustomerResponseDto[]> {
    return this.customerService.findAllByCompany(business.businessId);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get customer details",
    description: "Retrieve details of a specific customer",
  })
  @ApiResponse({
    status: 200,
    description: "Customer details retrieved successfully",
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Customer not found",
  })
  async findOne(
    @CurrentBusiness() business: CurrentBusinessData,
    @Param("id") id: string
  ): Promise<CustomerResponseDto> {
    return this.customerService.findOne(business.businessId, id);
  }

  @Get(":id/cards")
  @ApiOperation({
    summary: "Get customer cards",
    description: "Retrieve cards of a specific customer",
  })
  @ApiResponse({
    status: 200,
    description: "Customer cards retrieved successfully",
    // type: CustomerResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Customer cards not found",
  })
  async findCustomerCards(
    @CurrentBusiness() business: CurrentBusinessData,
    @Param("id") id: string
  ): Promise<any[]> {
    return this.customerService.findCustomerCards(business.businessId, id);
  }

  @Get(":id/transactions")
  @ApiOperation({
    summary: "Get customer transactions",
    description: "Retrieve transactions of a specific customer",
  })
  @ApiResponse({
    status: 200,
    description: "Customer transactions retrieved successfully",
    // type: CustomerResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Customer transactions not found",
  })
  async findCustomerTransactions(
    @CurrentBusiness() business: CurrentBusinessData,
    @Param("id") id: string
  ): Promise<any[]> {
    return this.customerService.findCustomerTransactions(
      business.businessId,
      id
    );
  }
}
