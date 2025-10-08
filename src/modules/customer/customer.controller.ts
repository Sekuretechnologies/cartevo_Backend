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
  Query,
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
  CurrentUser,
  CurrentUserData,
} from "../common/decorators/current-user.decorator";
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
    description: "Customer with this email or ID already exists",
  })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() createCustomerDto: CreateCustomerDto,
    @UploadedFiles()
    files: {
      id_document_front?: any[];
      id_document_back?: any[];
    },
    @Query("enroll") enroll?: string
  ): Promise<CustomerResponseDto> {
    return this.customerService.create(
      user.userMode,
      user.companyId,
      createCustomerDto,
      files,
      enroll === "true"
    );
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
    @CurrentUser() user: CurrentUserData,
    @Param("id") customerId: string,
    @Body() createCustomerDto: CreateCustomerDto,
    @UploadedFiles()
    files: {
      id_document_front?: any[];
      id_document_back?: any[];
    }
  ): Promise<CustomerResponseDto> {
    return this.customerService.update(
      user.companyId,
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
    @CurrentUser() user: CurrentUserData,
    @Query("sync") sync?: string
  ): Promise<{ data: any[] }> {
    const shouldSync = sync === "true";
    return this.customerService.findAllByCompany(user.companyId, shouldSync);
  }

  // @Get("")
  // @ApiOperation({
  //   summary: "List all customers",
  //   description: "Retrieve all customers registered under the business",
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: "Customers retrieved successfully",
  //   type: [CustomerResponseDto],
  // })
  // async findAllWithCardCount(
  //   @CurrentBusiness() business: CurrentBusinessData
  // ): Promise<{ data: any[] }> {
  //   return this.customerService.findAllCustomersWithCardCountByCompany(
  //     business.businessId
  //   );
  // }

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
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string
  ): Promise<{ data: any }> {
    return this.customerService.findOne(user.companyId, id);
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
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Query("sync") sync?: string
  ): Promise<{ data: any[] }> {
    const shouldSync = sync === "true";
    return this.customerService.findCustomerCards(
      user.companyId,
      id,
      shouldSync
    );
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
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string
  ): Promise<{ data: any[] }> {
    return this.customerService.findCustomerTransactions(user.companyId, id);
  }
}
