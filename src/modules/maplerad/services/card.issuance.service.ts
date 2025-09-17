import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CardStatus, Customer } from "@prisma/client";
import CardModel from "@/models/prisma/cardModel";
import CompanyModel from "@/models/prisma/companyModel";
import CustomerModel from "@/models/prisma/customerModel";
import TransactionModel from "@/models/prisma/transactionModel";
import WalletModel from "@/models/prisma/walletModel";
import CustomerLogsModel from "@/models/prisma/customerLogsModel";
import { v4 as uuidv4 } from "uuid";
import {
  decodeText,
  encodeText,
  signToken,
  decodeToken,
} from "@/utils/shared/encryption";
import { utcToLocalTime } from "@/utils/date";
import { CreateCardDto } from "../dto/create-card.dto";
import { MapleradUtils } from "../utils/maplerad.utils";
import { CurrentUserData } from "@/modules/common/decorators/current-user.decorator";
import TransactionFeeModel from "@/models/prisma/transactionFeeModel";
import BalanceTransactionRecordModel from "@/models/prisma/balanceTransactionRecordModel";
import { TransactionCategory, TransactionType } from "@/types";
import { CustomerProviderMappingModel } from "@/models";
import {
  extractExpiryMonthYear,
  getFormattedDate,
  convertMapleradAmountToMainUnit,
  convertAmountToMapleradFormat,
} from "@/utils/shared/common";
import { WebhookWaitingService } from "./webhook-waiting.service";
import { CardRecordService } from "./card.record.service";
import { CustomerSyncService } from "./customer.sync.service";

/**
 * Advanced Card Issuance Service for Maplerad
 * Implements sophisticated card creation with auto-fill, secure fund reservation,
 * webhook waiting, and comprehensive error recovery
 */
@Injectable()
export class CardIssuanceService {
  private readonly logger = new Logger(CardIssuanceService.name);

  constructor(
    private prisma: PrismaService,
    private webhookWaitingService: WebhookWaitingService,
    private cardRecordService: CardRecordService,
    private customerSyncService: CustomerSyncService
  ) {}

  /**
   * Issue a retail Maplerad card with advanced features
   */
  async issueRetailCard(
    createCardDto: CreateCardDto,
    user: CurrentUserData
  ): Promise<any> {
    this.logger.log("🚀 ADVANCED MAPLERAD CARD CREATION FLOW - START", {
      customerId: createCardDto.customer_id,
      brand: createCardDto.brand,
      amount: createCardDto.amount,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Auto-fill and validate customer data
      const completeDto = await this.autoFillUserInfo(
        createCardDto.customer_id,
        createCardDto
      );

      // 2. Validate business rules
      await this.validateRetailCardRequest(completeDto, user);

      // 3. Calculate fees with business rules
      const feeCalculation = await this.calculateCardFees(
        createCardDto.customer_id,
        completeDto.amount,
        user.companyId
      );

      // 4. Get customer and company data
      const customer = await this.getCustomerData(createCardDto.customer_id);
      const company = await this.getCompanyData(user.companyId);

      // 5. Secure fund reservation before external API calls
      const originalBalance = await this.reserveFundsSecurely(
        user.companyId,
        feeCalculation.totalAmount,
        `Card issuance reservation for ${customer.first_name} ${customer.last_name}`
      );

      let mapleradCallSucceeded = false;
      let cardResult: any = null;
      let mapleradCustomerId: string;

      try {
        // 6. Ensure Maplerad customer exists
        mapleradCustomerId = await this.ensureMapleradCustomer(
          customer,
          user.companyId
        );

        // 7. Create card via Maplerad API
        cardResult = await this.createMapleradCard(
          mapleradCustomerId,
          completeDto
        );
        mapleradCallSucceeded = true;

        // 8. Save metadata for webhook tracking
        await this.saveCardCreationMetadata(
          cardResult.reference,
          createCardDto.customer_id,
          feeCalculation,
          completeDto,
          `CARD_${Date.now()}`,
          mapleradCustomerId
        );

        // 9. Wait for webhook confirmation
        const webhookResult = await this.waitForCardCreationWebhook(
          cardResult.reference,
          customer.id,
          mapleradCustomerId
        );

        // 9. Process successful creation
        const result = await this.processSuccessfulCardCreation(
          webhookResult,
          customer,
          company,
          completeDto,
          feeCalculation,
          originalBalance
        );

        this.logger.log("🎉 ADVANCED MAPLERAD CARD CREATION FLOW - COMPLETED", {
          cardId: result.card.id,
          customerId: customer.id,
          success: true,
        });

        return result;
      } catch (error: any) {
        // Handle different error scenarios
        await this.handleCardCreationError(
          error,
          mapleradCallSucceeded,
          feeCalculation.totalAmount,
          customer,
          user.companyId
        );
        throw error;
      }
    } catch (error: any) {
      this.logger.error("❌ ADVANCED CARD CREATION FAILED", {
        customerId: createCardDto.customer_id,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(`Card creation failed: ${error.message}`);
    }
  }

  /**
   * Auto-fill user information from database
   */
  private async autoFillUserInfo(
    customerId: string,
    partialDto: Partial<CreateCardDto>
  ): Promise<CreateCardDto> {
    this.logger.log("🔍 AUTO-FILLING USER INFO - START", {
      customerId,
      providedFields: Object.keys(partialDto),
      timestamp: new Date().toISOString(),
    });

    this.logger.log("📊 FETCHING CUSTOMER DATA FROM DATABASE", {
      customerId,
      timestamp: new Date().toISOString(),
    });

    const customerResult = await CustomerModel.getOne({ id: customerId });
    if (customerResult.error || !customerResult.output) {
      this.logger.error("❌ CUSTOMER NOT FOUND FOR AUTO-FILL", {
        customerId,
        error: customerResult.error?.message || "Customer not found",
        timestamp: new Date().toISOString(),
      });
      throw new NotFoundException("Customer not found");
    }

    const customer = customerResult.output;
    this.logger.log("✅ CUSTOMER DATA RETRIEVED", {
      customerId,
      customerName:
        `${customer.first_name} ${customer.last_name}`.toUpperCase(),
      customerEmail: customer.email,
      timestamp: new Date().toISOString(),
    });

    // Build complete DTO with auto-filled fields
    const originalBrand = partialDto.brand;
    const originalAmount = partialDto.amount;
    const originalNameOnCard = partialDto.name_on_card;

    const completeDto: CreateCardDto = {
      customer_id: customerId,
      brand: partialDto.brand || "VISA",
      amount: partialDto.amount || 2, // Minimum amount
      name_on_card:
        partialDto.name_on_card ||
        `${customer.first_name} ${customer.last_name}`.toUpperCase(),
    };

    // Track which fields were auto-filled
    const autoFilledFields: string[] = [];
    if (!originalBrand) autoFilledFields.push("brand");
    if (!originalAmount) autoFilledFields.push("amount");
    if (!originalNameOnCard) autoFilledFields.push("name_on_card");

    this.logger.log("🔄 AUTO-FILL COMPLETED", {
      customerId,
      originalFields: {
        brand: originalBrand,
        amount: originalAmount,
        nameOnCard: originalNameOnCard,
      },
      autoFilledFields,
      finalDto: {
        brand: completeDto.brand,
        amount: completeDto.amount,
        nameOnCard: completeDto.name_on_card,
      },
      timestamp: new Date().toISOString(),
    });

    return completeDto;
  }

  /**
   * Validate retail card request
   */
  private async validateRetailCardRequest(
    dto: CreateCardDto,
    user: CurrentUserData
  ): Promise<void> {
    this.logger.log("🔍 VALIDATING CARD REQUEST - START", {
      customerId: dto.customer_id,
      brand: dto.brand,
      amount: dto.amount,
      userId: user.userId,
      companyId: user.companyId,
      timestamp: new Date().toISOString(),
    });

    // Validate customer exists and belongs to company
    this.logger.log("👤 CHECKING CUSTOMER ACCESS", {
      customerId: dto.customer_id,
      userId: user.userId,
      companyId: user.companyId,
      timestamp: new Date().toISOString(),
    });

    const customerResult = await CustomerModel.getOne({
      id: dto.customer_id,
    });
    if (customerResult.error || !customerResult.output) {
      this.logger.error("❌ CUSTOMER NOT FOUND", {
        customerId: dto.customer_id,
        error: customerResult.error?.message || "Customer not found",
        timestamp: new Date().toISOString(),
      });
      throw new NotFoundException("Customer not found");
    }
    const customer = customerResult.output;

    if (customer.company_id !== user.companyId) {
      this.logger.error("🚫 ACCESS DENIED TO CUSTOMER", {
        customerId: dto.customer_id,
        customerCompanyId: customer.company_id,
        userCompanyId: user.companyId,
        userId: user.userId,
        timestamp: new Date().toISOString(),
      });
      throw new BadRequestException("Access denied to customer");
    }

    this.logger.log("✅ CUSTOMER ACCESS VERIFIED", {
      customerId: dto.customer_id,
      customerName: `${customer.first_name} ${customer.last_name}`,
      customerCompanyId: customer.company_id,
      timestamp: new Date().toISOString(),
    });

    // Validate customer age (18+)
    this.logger.log("🎂 VALIDATING CUSTOMER AGE", {
      customerId: dto.customer_id,
      birthDate: customer.date_of_birth,
      timestamp: new Date().toISOString(),
    });

    const actualDate = new Date(Date.now() + 3600 * 1000);
    const birthdate: any = customer.date_of_birth;
    const differenceEnMilliseconds =
      actualDate.getTime() - new Date(birthdate).getTime();
    const age = Math.floor(
      differenceEnMilliseconds / (365.25 * 24 * 60 * 60 * 1000)
    );

    this.logger.log("📅 CALCULATED CUSTOMER AGE", {
      customerId: dto.customer_id,
      age,
      birthDate: customer.date_of_birth,
      timestamp: new Date().toISOString(),
    });

    if (age < 18) {
      this.logger.error("❌ CUSTOMER TOO YOUNG", {
        customerId: dto.customer_id,
        age,
        requiredAge: 18,
        timestamp: new Date().toISOString(),
      });
      throw new BadRequestException("Customer must be at least 18 years old");
    }

    // Check card limit (max 5 cards per customer)
    this.logger.log("🔢 CHECKING CARD LIMIT", {
      customerId: dto.customer_id,
      companyId: user.companyId,
      timestamp: new Date().toISOString(),
    });

    const cardSizeResult = await CardModel.count({
      customer_id: dto.customer_id,
      status: { not: CardStatus.TERMINATED },
      company_id: user.companyId,
    });
    const cardSize = Number(cardSizeResult.output || 0);

    this.logger.log("📊 CURRENT CARD COUNT", {
      customerId: dto.customer_id,
      currentCards: cardSize,
      maxAllowed: 5,
      timestamp: new Date().toISOString(),
    });

    if (cardSize >= 5) {
      this.logger.error("❌ CARD LIMIT EXCEEDED", {
        customerId: dto.customer_id,
        currentCards: cardSize,
        maxAllowed: 5,
        timestamp: new Date().toISOString(),
      });
      throw new BadRequestException("Maximum 5 cards allowed per customer");
    }

    // Validate amount (minimum 2 USD)
    this.logger.log("💰 VALIDATING CARD AMOUNT", {
      customerId: dto.customer_id,
      amount: dto.amount,
      minimumAmount: 2,
      timestamp: new Date().toISOString(),
    });

    if (dto.amount < 2) {
      this.logger.error("❌ AMOUNT TOO LOW", {
        customerId: dto.customer_id,
        amount: dto.amount,
        minimumAmount: 2,
        timestamp: new Date().toISOString(),
      });
      throw new BadRequestException("Minimum card funding amount is 2 USD");
    }

    // Validate brand
    this.logger.log("🏷️ VALIDATING CARD BRAND", {
      customerId: dto.customer_id,
      brand: dto.brand,
      validBrands: ["VISA", "MASTERCARD"],
      timestamp: new Date().toISOString(),
    });

    const validBrands = ["VISA", "MASTERCARD"];
    if (!validBrands.includes(dto.brand.toUpperCase())) {
      this.logger.error("❌ INVALID CARD BRAND", {
        customerId: dto.customer_id,
        brand: dto.brand,
        validBrands,
        timestamp: new Date().toISOString(),
      });
      throw new BadRequestException("Brand must be VISA or MASTERCARD");
    }

    this.logger.log("✅ CARD REQUEST VALIDATION COMPLETED", {
      customerId: dto.customer_id,
      brand: dto.brand,
      amount: dto.amount,
      age,
      currentCards: cardSize,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Calculate card fees using TransactionFeeModel with business rules
   */
  private async calculateCardFees(
    customerId: string,
    amount: number,
    companyId: string
  ): Promise<{
    issuanceFee: number;
    fundFee: number;
    withdrawFee: number;
    totalAmount: number;
    isFirstCard: boolean;
    paymentSuccessFees?: Map<string, any>;
    paymentFailureFees?: Map<string, any>;
  }> {
    try {
      // Get card purchase fees from TransactionFeeModel
      const feesResult = await TransactionFeeModel.get({
        company_id: companyId,
        transaction_category: TransactionCategory.CARD,
        transaction_type: {
          in: [
            TransactionType.ISSUANCE,
            TransactionType.FUND,
            TransactionType.WITHDRAW,
            TransactionType.PAYMENT_SUCCESS_FEE,
            TransactionType.PAYMENT_FAILURE_FEE,
          ],
        },
        currency: "USD",
      });

      if (feesResult.output) {
        const fees: any[] = feesResult.output;
        const issuanceFeeRecord = fees.find(
          (fee) => fee.transaction_type === TransactionType.ISSUANCE
        );
        const fundFeeRecord = fees.find(
          (fee) => fee.transaction_type === TransactionType.FUND
        );
        const withdrawFeeRecord = fees.find(
          (fee) => fee.transaction_type === TransactionType.WITHDRAW
        );

        const paymentSuccessFee = fees.filter(
          (fee) => fee.transaction_type === TransactionType.PAYMENT_SUCCESS_FEE
        );
        const paymentSuccessFeeMap = new Map<string, any>();
        paymentSuccessFee.forEach((payFee) => {
          const normalizedPayFee = {
            type: payFee.type,
            value: payFee.value,
            range_min: payFee.range_min,
            range_max: payFee.range_max,
            currency: payFee.currency,
          };
          paymentSuccessFeeMap.set(
            `${payFee.range_min}_${payFee.range_max}`,
            normalizedPayFee
          );
        });

        const paymentFailureFee = fees.filter(
          (fee) =>
            fee.transaction_type === TransactionType.PAYMENT_FAILURE_FEE &&
            fee.type === "RANGE"
        );
        const paymentFailureFeeMap = new Map<string, any>();
        paymentFailureFee.forEach((payFee) => {
          const normalizedPayFee = {
            type: payFee.type,
            value: payFee.value,
            range_min: payFee.range_min,
            range_max: payFee.range_max,
            currency: payFee.currency,
          };
          paymentFailureFeeMap.set(
            `${payFee.range_min}_${payFee.range_max}`,
            normalizedPayFee
          );
        });

        // Check if this is the customer's first card
        const existingCardsResult = await CardModel.count({
          customer_id: customerId,
          company_id: companyId,
        });
        const isFirstCard = Number(existingCardsResult.output || 0) === 0;

        const issuanceFee =
          issuanceFeeRecord?.type === "FIXED"
            ? parseFloat(issuanceFeeRecord?.value?.toString())
            : 1;
        const fundFee =
          fundFeeRecord?.type === "FIXED"
            ? parseFloat(fundFeeRecord?.value?.toString())
            : 0.5;
        const withdrawFee =
          withdrawFeeRecord?.type === "FIXED"
            ? parseFloat(withdrawFeeRecord?.value?.toString())
            : 0.5;

        const totalAmount = issuanceFee + amount;

        this.logger.debug("Calculated card fees using TransactionFeeModel", {
          customerId,
          amount,
          issuanceFee,
          fundFee,
          withdrawFee,
          totalAmount,
          isFirstCard,
          paymentSuccessFeesCount: paymentSuccessFeeMap.size,
          paymentFailureFeesCount: paymentFailureFeeMap.size,
        });

        return {
          issuanceFee,
          fundFee,
          withdrawFee,
          totalAmount,
          isFirstCard,
          paymentSuccessFees: paymentSuccessFeeMap,
          paymentFailureFees: paymentFailureFeeMap,
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to get card fees from database:`, error);
    }

    // Fallback to default fees if TransactionFeeModel fails
    // Check if this is the customer's first card
    const existingCardsResult = await CardModel.count({
      customer_id: customerId,
      company_id: companyId,
    });
    const isFirstCard = Number(existingCardsResult.output || 0) === 0;

    const issuanceFee = 1; // USD
    const fundFee = 0.5; // USD
    const withdrawFee = 0.5; // USD
    const totalAmount = issuanceFee + amount;

    this.logger.debug("Using fallback card fees", {
      customerId,
      amount,
      issuanceFee,
      fundFee,
      withdrawFee,
      totalAmount,
      isFirstCard,
    });

    return {
      issuanceFee,
      fundFee,
      withdrawFee,
      totalAmount,
      isFirstCard,
    };
  }

  /**
   * Get customer data
   */
  private async getCustomerData(customerId: string): Promise<any> {
    const customerResult = await CustomerModel.getOne({ id: customerId });
    if (customerResult.error || !customerResult.output) {
      throw new NotFoundException("Customer not found");
    }
    return customerResult.output;
  }

  /**
   * Get company data
   */
  private async getCompanyData(companyId: string): Promise<any> {
    const companyResult = await CompanyModel.getOne({ id: companyId });
    if (companyResult.error || !companyResult.output) {
      throw new NotFoundException("Company not found");
    }
    return companyResult.output;
  }

  /**
   * Secure fund reservation before external API calls
   */
  private async reserveFundsSecurely(
    companyId: string,
    amount: number,
    description: string
  ): Promise<number> {
    this.logger.log("🔐 FUND RESERVATION - START", {
      companyId,
      amount,
      description,
      timestamp: new Date().toISOString(),
    });

    // Get USD wallet
    this.logger.log("💰 FETCHING USD WALLET", {
      companyId,
      currency: "USD",
      timestamp: new Date().toISOString(),
    });

    const usdWalletResult = await WalletModel.getOne({
      company_id: companyId,
      currency: "USD",
      is_active: true,
    });

    if (usdWalletResult.error || !usdWalletResult.output) {
      this.logger.error("❌ USD WALLET NOT FOUND", {
        companyId,
        error: usdWalletResult.error?.message || "Wallet not found",
        timestamp: new Date().toISOString(),
      });
      throw new BadRequestException("USD wallet not found");
    }

    const usdWallet = usdWalletResult.output;
    const walletBalance = usdWallet.balance.toNumber();

    this.logger.log("✅ WALLET RETRIEVED", {
      companyId,
      walletId: usdWallet.id,
      currentBalance: walletBalance,
      timestamp: new Date().toISOString(),
    });

    // Check sufficient balance
    this.logger.log("🔍 CHECKING SUFFICIENT BALANCE", {
      companyId,
      requiredAmount: amount,
      availableBalance: walletBalance,
      hasSufficientFunds: walletBalance >= amount,
      timestamp: new Date().toISOString(),
    });

    if (walletBalance < amount) {
      this.logger.error("❌ INSUFFICIENT FUNDS", {
        companyId,
        requiredAmount: amount,
        availableBalance: walletBalance,
        shortfall: amount - walletBalance,
        timestamp: new Date().toISOString(),
      });
      throw new BadRequestException(
        `Insufficient balance. Required: $${amount}, Available: $${walletBalance}`
      );
    }

    // Reserve funds by updating wallet balance
    const newBalance = walletBalance - amount;
    this.logger.log("🔄 RESERVING FUNDS", {
      companyId,
      walletId: usdWallet.id,
      amount,
      previousBalance: walletBalance,
      newBalance,
      description,
      timestamp: new Date().toISOString(),
    });

    await WalletModel.update(usdWallet.id, { balance: newBalance });

    this.logger.log("✅ FUNDS RESERVED SECURELY", {
      companyId,
      walletId: usdWallet.id,
      amount,
      previousBalance: walletBalance,
      newBalance,
      description,
      timestamp: new Date().toISOString(),
    });

    return walletBalance; // Return original balance
  }

  /**
   * Ensure Maplerad customer exists
   */
  async ensureMapleradCustomer(
    customer: Customer,
    companyId: string
  ): Promise<string> {
    this.logger.log("👤 ENSURING MAPLERAD CUSTOMER EXISTS - START", {
      customerId: customer.id,
      companyId,
      customerEmail: customer.email,
      timestamp: new Date().toISOString(),
    });

    this.logger.log("🔍 CHECKING EXISTING MAPLERAD CUSTOMER MAPPING", {
      customerId: customer.id,
      provider: "maplerad",
      timestamp: new Date().toISOString(),
    });

    const mapleradCustomerResult = await CustomerProviderMappingModel.getOne({
      customer_id: customer.id,
      provider_name: "maplerad",
    });

    let mapleradCustomerId =
      mapleradCustomerResult.output?.provider_customer_id;

    this.logger.log("📊 MAPPING LOOKUP RESULT", {
      customerId: customer.id,
      mappingExists: !!mapleradCustomerResult.output,
      mapleradCustomerId: mapleradCustomerId || "none",
      timestamp: new Date().toISOString(),
    });

    if (!mapleradCustomerId) {
      this.logger.log("🆕 MAPLERAD CUSTOMER NOT FOUND - CREATING NEW", {
        customerId: customer.id,
        customerName: `${customer.first_name} ${customer.last_name}`,
        customerEmail: customer.email,
        timestamp: new Date().toISOString(),
      });

      // Create Maplerad customer
      const customerData = {
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        country: customer.country_iso_code,
        identification_number: customer.identification_number,
        dob: getFormattedDate(new Date(customer.date_of_birth)),
        phone: {
          phone_country_code: customer.country_phone_code,
          phone_number: customer.phone_number,
        },
        identity: {
          type: customer.id_document_type,
          image: customer.id_document_front,
          number: customer.identification_number,
          country: customer.country_iso_code,
        },
        address: {
          street: customer.street || "",
          city: customer.city || "",
          state: customer.state || "",
          country: customer.country_iso_code,
          postal_code: customer.postal_code || "00000",
        },
      };

      this.logger.log("🌐 CALLING MAPLERAD CUSTOMER CREATION API", {
        customerId: customer.id,
        customerEmail: customer.email,
        country: customer.country_iso_code,
        timestamp: new Date().toISOString(),
      });

      const enrollmentStartTime = Date.now();
      const enrollmentResult = await MapleradUtils.createCustomer(customerData);
      const enrollmentDuration = Date.now() - enrollmentStartTime;

      console.log(
        "ensureMapleradCustomer :: enrollmentResult ::",
        enrollmentResult
      );

      if (enrollmentResult.error) {
        // Check if the error is "customer is already enrolled"
        if (enrollmentResult.error.message === "customer is already enrolled") {
          this.logger.warn("⚠️ CUSTOMER ALREADY ENROLLED - SYNCING CUSTOMERS", {
            customerId: customer.id,
            error: enrollmentResult.error.message,
            duration: `${enrollmentDuration}ms`,
            timestamp: new Date().toISOString(),
          });

          // Call syncCustomers service to sync the customer mappings
          this.logger.log("🔄 CALLING SYNC CUSTOMERS SERVICE", {
            customerId: customer.id,
            companyId,
            timestamp: new Date().toISOString(),
          });

          const syncResult = await this.customerSyncService.syncCustomers(
            companyId,
            {
              force: true, // Force sync to get the latest mappings
            }
          );

          this.logger.log("✅ CUSTOMER SYNC COMPLETED", {
            customerId: customer.id,
            syncResult: {
              success: syncResult.success,
              customersProcessed: syncResult.summary?.totalCustomers || 0,
              mappingsCreated: syncResult.summary?.created || 0,
              mappingsUpdated: syncResult.summary?.updated || 0,
            },
            timestamp: new Date().toISOString(),
          });

          // Now try to get the current customer provider_customer_id from mapping
          this.logger.log("🔍 RETRIEVING UPDATED CUSTOMER MAPPING", {
            customerId: customer.id,
            provider: "maplerad",
            timestamp: new Date().toISOString(),
          });

          const updatedMappingResult =
            await CustomerProviderMappingModel.getOne({
              customer_id: customer.id,
              provider_name: "maplerad",
            });

          if (updatedMappingResult.output?.provider_customer_id) {
            mapleradCustomerId =
              updatedMappingResult.output.provider_customer_id;

            this.logger.log("✅ RETRIEVED MAPLERAD CUSTOMER ID FROM SYNC", {
              customerId: customer.id,
              mapleradCustomerId,
              timestamp: new Date().toISOString(),
            });
          } else {
            this.logger.error(
              "❌ FAILED TO GET PROVIDER CUSTOMER ID AFTER SYNC",
              {
                customerId: customer.id,
                mappingResult: updatedMappingResult,
                timestamp: new Date().toISOString(),
              }
            );
            throw new BadRequestException(
              "Customer is already enrolled but could not retrieve provider customer ID after sync"
            );
          }
        } else {
          this.logger.error("❌ MAPLERAD CUSTOMER CREATION FAILED", {
            customerId: customer.id,
            error: enrollmentResult.error.message,
            duration: `${enrollmentDuration}ms`,
            timestamp: new Date().toISOString(),
          });
          throw new BadRequestException(
            "Failed to enroll customer in Maplerad: " +
              enrollmentResult.error.message
          );
        }
      } else {
        // Success case - set mapleradCustomerId from enrollment result
        mapleradCustomerId = enrollmentResult.output.id;

        this.logger.log("✅ MAPLERAD CUSTOMER CREATED SUCCESSFULLY", {
          customerId: customer.id,
          mapleradCustomerId,
          duration: `${enrollmentDuration}ms`,
          timestamp: new Date().toISOString(),
        });

        // Create provider mapping
        this.logger.log("🔗 CREATING PROVIDER MAPPING RECORD", {
          customerId: customer.id,
          mapleradCustomerId,
          provider: "maplerad",
          timestamp: new Date().toISOString(),
        });

        await CustomerProviderMappingModel.create({
          customer_id: customer.id,
          provider_customer_id: mapleradCustomerId,
          provider_name: "maplerad",
        });

        this.logger.log("✅ PROVIDER MAPPING CREATED", {
          customerId: customer.id,
          mapleradCustomerId,
          mappingId: "created",
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      this.logger.log("✅ EXISTING MAPLERAD CUSTOMER FOUND", {
        customerId: customer.id,
        mapleradCustomerId,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.log("👤 ENSURING MAPLERAD CUSTOMER EXISTS - COMPLETED", {
      customerId: customer.id,
      mapleradCustomerId,
      timestamp: new Date().toISOString(),
    });

    return mapleradCustomerId;
  }

  /**
   * Create card via Maplerad API
   */
  private async createMapleradCard(
    mapleradCustomerId: string,
    dto: CreateCardDto
  ): Promise<any> {
    this.logger.log("💳 CREATING MAPLERAD CARD - START", {
      mapleradCustomerId,
      brand: dto.brand,
      amount: dto.amount,
      nameOnCard: dto.name_on_card,
      timestamp: new Date().toISOString(),
    });

    // Map brand to Maplerad format
    const normalizedBrand = dto.brand.toUpperCase();
    const mapleradBrand =
      normalizedBrand === "MASTERCARD"
        ? "MASTERCARD"
        : normalizedBrand === "VISA"
        ? "VISA"
        : "VISA";
    const cardData = {
      customer_id: mapleradCustomerId,
      currency: "USD",
      type: "VIRTUAL",
      brand: mapleradBrand,
      auto_approve: true,
      amount: convertAmountToMapleradFormat(dto.amount, "USD"), // Convert to cents using utility
    };

    this.logger.log("🌐 CALLING MAPLERAD CARD CREATION API", {
      mapleradCustomerId,
      brand: mapleradBrand,
      amountInCents: cardData.amount,
      amountInDollars: dto.amount,
      timestamp: new Date().toISOString(),
    });

    const cardCreationStartTime = Date.now();
    const cardResult = await MapleradUtils.createCard(cardData);
    const cardCreationDuration = Date.now() - cardCreationStartTime;

    if (cardResult.error) {
      this.logger.error("❌ MAPLERAD CARD CREATION FAILED", {
        mapleradCustomerId,
        brand: mapleradBrand,
        amount: dto.amount,
        error: cardResult.error.message,
        duration: `${cardCreationDuration}ms`,
        timestamp: new Date().toISOString(),
      });
      throw new BadRequestException(
        "Failed to create card: " + cardResult.error.message
      );
    }

    const mapleradCard = cardResult.output;
    this.logger.log("✅ MAPLERAD CARD CREATION SUCCESSFUL", {
      mapleradCustomerId,
      mapleradCardId: mapleradCard.id,
      reference: mapleradCard.reference,
      brand: mapleradBrand,
      amount: dto.amount,
      duration: `${cardCreationDuration}ms`,
      timestamp: new Date().toISOString(),
    });

    return mapleradCard;
  }

  /**
   * Wait for card creation webhook using WebhookWaitingService
   */
  private async waitForCardCreationWebhook(
    reference: string,
    customerId: string,
    mapleradCustomerId?: string
  ): Promise<any> {
    this.logger.log("🕐 WAITING FOR CARD CREATION WEBHOOK - START", {
      reference,
      timestamp: new Date().toISOString(),
    });

    try {
      // Use WebhookWaitingService to wait for the webhook
      const webhookResult = await this.webhookWaitingService.waitForWebhook(
        reference,
        60000 // 1 minute timeout
        // 300000 // 5 minutes timeout
      );

      this.logger.log("✅ WEBHOOK WAIT COMPLETED", {
        reference,
        success: webhookResult.success,
        source: webhookResult.source,
        waitTime: webhookResult.waitTime,
        timestamp: new Date().toISOString(),
      });

      if (webhookResult.success) {
        // Webhook arrived successfully
        const result = {
          success: true,
          source: webhookResult.source,
          data: webhookResult.data,
          waitTime: webhookResult.waitTime,
        };

        this.logger.log("✅ WEBHOOK WAIT SUCCESSFUL - RETURNING RESULT", {
          reference,
          result: {
            success: result.success,
            source: result.source,
            waitTime: result.waitTime,
            hasCardData: !!result.data?.card,
            cardId: result.data?.card?.id,
          },
          timestamp: new Date().toISOString(),
        });

        return result;
      } else if (webhookResult.timeout) {
        // Timeout occurred, fallback to polling
        this.logger.warn("⏰ WEBHOOK TIMEOUT - FALLBACK TO POLLING", {
          reference,
          waitTime: webhookResult.waitTime,
          timestamp: new Date().toISOString(),
        });

        const pollResult = await this.fallbackPolling(
          reference,
          customerId,
          mapleradCustomerId
        );

        this.logger.log("🔄 FALLBACK POLLING COMPLETED - RETURNING RESULT", {
          reference,
          pollResult: {
            success: pollResult.success,
            source: pollResult.source,
            waitTime: pollResult.waitTime,
            hasCardData: !!pollResult.data?.card,
            cardId: pollResult.data?.card?.id,
          },
          timestamp: new Date().toISOString(),
        });

        return pollResult;
      } else {
        // Webhook failed
        this.logger.error("❌ WEBHOOK FAILED", {
          reference,
          error: webhookResult.error,
          timestamp: new Date().toISOString(),
        });

        throw new BadRequestException(
          `Card creation webhook failed: ${webhookResult.error}`
        );
      }
    } catch (error: any) {
      this.logger.error("❌ WEBHOOK WAIT PROCESS FAILED", {
        reference,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // Try fallback polling as last resort
      try {
        this.logger.warn("🔄 ATTEMPTING FALLBACK POLLING", {
          reference,
          timestamp: new Date().toISOString(),
        });

        const pollResult = await this.fallbackPolling(
          reference,
          customerId,
          mapleradCustomerId
        );
        return pollResult;
      } catch (pollError: any) {
        this.logger.error("❌ FALLBACK POLLING ALSO FAILED", {
          reference,
          pollError: pollError.message,
          timestamp: new Date().toISOString(),
        });

        throw new BadRequestException(
          `Failed to wait for card creation confirmation: ${error.message}`
        );
      }
    }
  }

  /**
   * Fallback polling method when webhook waiting fails
   * Enhanced to check for any new cards the customer may have acquired
   */
  private async fallbackPolling(
    reference: string,
    customerId: string,
    mapleradCustomerId: string
  ): Promise<any> {
    const startTime = Date.now();
    const maxWaitTime = 60000; // 1 minute for fallback polling
    const pollInterval = 10000; // 10 seconds between polls

    this.logger.log("🔄 FALLBACK POLLING - START", {
      reference,
      maxWaitTime: `${maxWaitTime}ms`,
      pollInterval: `${pollInterval}ms`,
      timestamp: new Date().toISOString(),
    });

    // // Extract customer ID from logs or metadata
    // let customerId: string | null = null;
    // try {
    //   const logsResult = await CustomerLogsModel.get({
    //     action: "card_creation_pending",
    //     log_json: { reference },
    //   });

    //   if (logsResult.output && logsResult.output.length > 0) {
    //     const log = logsResult.output[0];
    //     customerId = log.customer_id;
    //   }
    // } catch (error: any) {
    //   this.logger.warn("⚠️ FAILED TO EXTRACT CUSTOMER ID FROM LOGS", {
    //     reference,
    //     error: error.message,
    //     timestamp: new Date().toISOString(),
    //   });
    // }

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // const pollResult = await this.pollCardStatus(reference);

        // if (pollResult.found) {
        //   this.logger.log("✅ CARD FOUND VIA FALLBACK POLLING", {
        //     reference,
        //     cardData: pollResult.card,
        //     totalWaitTime: `${Date.now() - startTime}ms`,
        //     timestamp: new Date().toISOString(),
        //   });

        //   return {
        //     success: true,
        //     source: "polling",
        //     data: { card: pollResult.card },
        //     waitTime: Date.now() - startTime,
        //   };
        // }

        // If specific card not found and we have customer info, check for new cards
        if (mapleradCustomerId) {
          const newCardCheck = await this.checkForNewCustomerCards(
            customerId,
            mapleradCustomerId,
            reference
          );

          if (newCardCheck.found) {
            this.logger.log("🎯 NEW CARD FOUND FOR CUSTOMER", {
              reference,
              // customerId,
              newCardId: newCardCheck.card.id,
              newCardStatus: newCardCheck.card.status,
              totalWaitTime: `${Date.now() - startTime}ms`,
              timestamp: new Date().toISOString(),
            });

            return {
              success: true,
              source: "polling_new_card",
              data: { card: newCardCheck.card },
              waitTime: Date.now() - startTime,
              message: "Found newly created card for customer",
            };
          }
        }

        this.logger.log("🔄 CARD NOT READY YET - CONTINUING FALLBACK POLL", {
          reference,
          elapsedTime: `${Date.now() - startTime}ms`,
          customerId,
          mapleradCustomerId,
          timestamp: new Date().toISOString(),
        });

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (pollError: any) {
        this.logger.warn("⚠️ FALLBACK POLLING ERROR", {
          reference,
          error: pollError.message,
          elapsedTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        });

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    // Final timeout
    this.logger.error("⏰ FALLBACK POLLING TIMEOUT", {
      reference,
      totalWaitTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      source: "timeout",
      error: "Card creation polling timeout",
      data: {
        card: {
          id: reference,
          status: "PENDING",
          balance: 0,
          maskedPan: "****-****-****-****",
          last4: "****",
          expiryMonth: 12,
          expiryYear: 2029,
          brand: "VISA",
        },
      },
      waitTime: Date.now() - startTime,
      message:
        "Card creation may still be processing. Please check status later.",
    };
  }

  /**
   * Check if webhook has arrived by examining metadata/logs
   */
  private async checkWebhookArrival(reference: string): Promise<{
    arrived: boolean;
    data?: any;
  }> {
    try {
      // Check CustomerLogsModel for webhook arrival
      // In a real implementation, you might have a dedicated webhook tracking table
      const logsResult = await CustomerLogsModel.get({
        action: "card_creation_webhook_received",
        log_json: { reference },
      });

      if (logsResult.output && logsResult.output.length > 0) {
        const latestLog = logsResult.output[0];
        return {
          arrived: true,
          data: latestLog.log_json?.webhookData,
        };
      }

      return { arrived: false };
    } catch (error: any) {
      this.logger.warn("Failed to check webhook arrival", {
        reference,
        error: error.message,
      });
      return { arrived: false };
    }
  }

  /**
   * Poll Maplerad API for card status
   */
  private async pollCardStatus(reference: string): Promise<{
    found: boolean;
    card?: any;
  }> {
    try {
      this.logger.log("🔍 POLLING MAPLERAD FOR CARD STATUS", {
        reference,
        timestamp: new Date().toISOString(),
      });

      // Try to get card by reference (this might not work if reference != card ID)
      // In practice, you might need to store the card ID separately or use a different approach
      const cardResult = await MapleradUtils.getCard(reference, false);

      if (!cardResult.error && cardResult.output) {
        const card = cardResult.output;

        // Check if card is in a final state
        if (card.status === "ACTIVE" || card.status === "DISABLED") {
          const expiry = card.expiry || "";
          const { expiry_month, expiry_year } = extractExpiryMonthYear(expiry);
          return {
            found: true,
            card: {
              id: card.id,
              status: card.status,
              balance: card.balance || 0,
              maskedPan:
                card.masked_pan || `****-****-****-${card.last4 || "****"}`,
              last4: card.last4 || "****",
              expiryMonth: card.expiry_month || expiry_month || 12,
              expiryYear: card.expiry_year || expiry_year || 99,
              brand: card.brand || "VISA",
              cardNumber: card.card_umber,
              cvv: card.cvv,
            },
          };
        }
      }

      return { found: false };
    } catch (error: any) {
      this.logger.warn("Card polling failed", {
        reference,
        error: error.message,
      });
      return { found: false };
    }
  }

  /**
   * Process successful card creation
   */
  private async processSuccessfulCardCreation(
    webhookResult: any,
    customer: any,
    company: any,
    dto: CreateCardDto,
    feeCalculation: any,
    originalBalance: number
  ): Promise<any> {
    this.logger.log("🎯 PROCESSING SUCCESSFUL CARD CREATION - START", {
      customerId: customer.id,
      companyId: company.id,
      amount: dto.amount,
      brand: dto.brand,
      isFirstCard: feeCalculation.isFirstCard,
      timestamp: new Date().toISOString(),
    });

    console.log(
      "processSuccessfulCardCreation : webhookResult :: ",
      webhookResult
    );

    const finalCard = webhookResult.data.card;
    const cardId = uuidv4();

    this.logger.log("🆔 GENERATED CARD ID", {
      cardId,
      customerId: customer.id,
      mapleradCardId: finalCard.id,
      timestamp: new Date().toISOString(),
    });

    // Create local card record
    this.logger.log("💾 CREATING LOCAL CARD RECORD", {
      cardId,
      customerId: customer.id,
      brand: dto.brand,
      amount: dto.amount,
      timestamp: new Date().toISOString(),
    });

    console.log("FINAL CARD :: ", finalCard);

    const savedCard = await this.createLocalCardRecord(
      cardId,
      customer,
      company,
      dto,
      finalCard
    );

    this.logger.log("✅ LOCAL CARD RECORD CREATED", {
      cardId,
      maskedNumber: savedCard.masked_number,
      last4: savedCard.last4,
      timestamp: new Date().toISOString(),
    });

    // Create transactions
    this.logger.log("💸 CREATING CARD TRANSACTIONS", {
      cardId,
      customerId: customer.id,
      issuanceFee: feeCalculation.issuanceFee,
      fundingAmount: dto.amount,
      totalAmount: feeCalculation.totalAmount,
      timestamp: new Date().toISOString(),
    });

    await this.createCardTransactions(
      cardId,
      customer,
      company,
      dto,
      feeCalculation,
      originalBalance
    );

    this.logger.log("✅ CARD TRANSACTIONS CREATED", {
      cardId,
      transactionsCreated: 2, // fee + funding
      timestamp: new Date().toISOString(),
    });

    // Log success
    this.logger.log("📝 LOGGING CARD CREATION SUCCESS", {
      cardId,
      customerId: customer.id,
      amount: dto.amount,
      brand: dto.brand,
      timestamp: new Date().toISOString(),
    });

    await this.logCardCreationSuccess(cardId, customer, dto, feeCalculation);

    const result = {
      status: "success",
      message: feeCalculation.isFirstCard
        ? "First card created successfully!"
        : "Card created successfully!",
      card: {
        id: cardId,
        customer_id: customer.id,
        status: "ACTIVE",
        balance: dto.amount,
        masked_number: savedCard.masked_number,
        last4: savedCard.last4,
        expiry_month: savedCard.expiry_month,
        expiry_year: savedCard.expiry_year,
        brand: dto.brand,
        currency: "USD",
        created_at: new Date(),
      },
      autoFilledFields: [], // Could track which fields were auto-filled
    };

    this.logger.log("🎉 SUCCESSFUL CARD CREATION PROCESSING COMPLETED", {
      cardId,
      customerId: customer.id,
      amount: dto.amount,
      brand: dto.brand,
      isFirstCard: feeCalculation.isFirstCard,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  /**
   * Create local card record
   */
  async createLocalCardRecord(
    cardId: string,
    customer: any,
    company: any,
    dto: CreateCardDto,
    finalCard: any
  ): Promise<any> {
    // Encrypt sensitive data
    const encryptedCardNumber = signToken(finalCard.cardNumber || "***");
    const encryptedCvv = signToken(finalCard.cvv || "***");

    const newCardResult = await CardModel.create({
      id: cardId,
      status: "ACTIVE",
      customer_id: customer.id,
      company_id: customer.company_id,
      country: customer.country_iso_code,
      brand: dto.brand,
      provider: encodeText("maplerad"),
      currency: "USD",
      name: dto.name_on_card,
      balance: dto.amount,
      reference: finalCard.id,
      provider_card_id: finalCard.id,
      number: `tkMplr_${encryptedCardNumber}`,
      masked_number:
        finalCard.maskedPan || `****-****-****-${finalCard.last4 || "****"}`,
      last4: finalCard.last4,
      cvv: `tkMplr_${encryptedCvv}`,
      expiry_month: finalCard.expiryMonth || 12,
      expiry_year: finalCard.expiryYear || 99,
      postal_code: customer.postal_code || "00000",
      street: customer.address || "",
      city: customer.city || "",
      state_code: customer.state || "",
      country_iso_code: customer.country_iso_code,
      is_active: true,
      is_virtual: true,
      provider_card_metadata: finalCard,
    });

    if (newCardResult.error) {
      this.logger.error("Local card creation error", {
        error: newCardResult.error,
      });
      throw new BadRequestException("Failed to save card locally");
    }

    return newCardResult.output;
  }

  /**
   * Create card transactions with balance transaction records
   */
  private async createCardTransactions(
    cardId: string,
    customer: any,
    company: any,
    dto: CreateCardDto,
    feeCalculation: any,
    originalBalance: number
  ): Promise<void> {
    // Get USD wallet for balance transaction records
    const usdWalletResult = await WalletModel.getOne({
      company_id: company.id,
      currency: "USD",
      is_active: true,
    });
    if (usdWalletResult.error || !usdWalletResult.output) {
      throw new BadRequestException(
        "USD wallet not found for balance tracking"
      );
    }
    const usdWallet = usdWalletResult.output;

    const transactionId = uuidv4();

    // Card creation fee transaction
    const feeTransactionResult = await TransactionModel.create({
      id: transactionId,
      status: "PENDING",
      category: "CARD",
      type: "PURCHASE",
      amount: feeCalculation.issuanceFee,
      currency: "USD",
      customer_id: customer.id,
      company_id: customer.company_id,
      card_id: cardId,
      card_balance_before: 0,
      card_balance_after: 0,
      wallet_balance_before: originalBalance,
      wallet_balance_after: originalBalance - feeCalculation.issuanceFee,
      provider: encodeText("maplerad"),
      description: "Card creation fee",
      created_at: utcToLocalTime(new Date())?.toISOString(),
    });

    if (feeTransactionResult.error) {
      throw new BadRequestException("Failed to create fee transaction");
    }

    // Create balance transaction record for wallet (fee debit)
    await BalanceTransactionRecordModel.create({
      transaction_id: transactionId,
      entity_type: "wallet",
      entity_id: usdWallet.id,
      old_balance: originalBalance,
      new_balance: originalBalance - feeCalculation.issuanceFee,
      amount_changed: -feeCalculation.issuanceFee, // Negative for debit
      currency: "USD",
      change_type: "debit",
      description: "Card creation fee debit from wallet",
    });

    // Card funding transaction
    const fundingTransactionId = uuidv4();
    const fundingTransactionResult = await TransactionModel.create({
      id: fundingTransactionId,
      status: "PENDING",
      category: "CARD",
      type: "FUND",
      amount: dto.amount,
      currency: "USD",
      customer_id: customer.id,
      company_id: customer.company_id,
      card_id: cardId,
      card_balance_before: 0,
      card_balance_after: dto.amount,
      wallet_balance_before: originalBalance - feeCalculation.issuanceFee,
      wallet_balance_after: originalBalance - feeCalculation.totalAmount,
      provider: encodeText("maplerad"),
      description: "Initial card funding",
      created_at: utcToLocalTime(new Date())?.toISOString(),
    });

    if (fundingTransactionResult.error) {
      throw new BadRequestException("Failed to create funding transaction");
    }

    // Create balance transaction record for wallet (funding debit)
    await BalanceTransactionRecordModel.create({
      transaction_id: fundingTransactionId,
      entity_type: "wallet",
      entity_id: usdWallet.id,
      old_balance: originalBalance - feeCalculation.issuanceFee,
      new_balance: originalBalance - feeCalculation.totalAmount,
      amount_changed: -dto.amount, // Negative for debit
      currency: "USD",
      change_type: "debit",
      description: "Initial card funding debit from wallet",
    });

    // Create balance transaction record for card (funding credit)
    await BalanceTransactionRecordModel.create({
      transaction_id: fundingTransactionId,
      entity_type: "card",
      entity_id: cardId,
      old_balance: 0, // New card starts with 0 balance
      new_balance: dto.amount,
      amount_changed: dto.amount, // Positive for credit
      currency: "USD",
      change_type: "credit",
      description: "Initial card funding credit to card",
    });

    this.logger.debug("Balance transaction records created", {
      cardId,
      walletId: usdWallet.id,
      feeTransactionId: transactionId,
      fundingTransactionId,
      totalRecords: 3, // 1 wallet debit (fee) + 1 wallet debit (funding) + 1 card credit
    });
  }

  /**
   * Log card creation success
   */
  private async logCardCreationSuccess(
    cardId: string,
    customer: any,
    dto: CreateCardDto,
    feeCalculation: any
  ): Promise<void> {
    await CustomerLogsModel.create({
      customer_id: customer.id,
      action: "card-purchase",
      status: "SUCCESS",
      log_json: {
        card_id: cardId,
        amount: dto.amount,
        brand: dto.brand,
        maplerad_customer_id: customer.maplerad_customer_id,
        is_first_card: feeCalculation.isFirstCard,
        total_cost: feeCalculation.totalAmount,
      },
      log_txt: `Maplerad card created successfully: ${cardId}`,
      created_at: new Date(),
    });
  }

  /**
   * Handle card creation errors with different recovery strategies
   */
  private async handleCardCreationError(
    error: any,
    mapleradCallSucceeded: boolean,
    reservedAmount: number,
    customer: any,
    companyId: string
  ): Promise<void> {
    if (!mapleradCallSucceeded) {
      // Refund reserved funds if Maplerad call failed
      await this.refundReservedFunds(companyId, reservedAmount);

      this.logger.warn("Maplerad call failed - funds refunded", {
        customerId: customer.id,
        amount: reservedAmount,
        error: error.message,
      });
    } else {
      // Maplerad succeeded but post-processing failed - keep funds (service delivered)
      this.logger.error(
        "Post-Maplerad error - funds kept (service delivered)",
        {
          customerId: customer.id,
          reservedAmount,
          error: error.message,
        }
      );
    }

    // Log the error
    await CustomerLogsModel.create({
      customer_id: customer.id,
      action: "card-purchase",
      status: "FAILED",
      log_json: {
        error: error.message,
        maplerad_succeeded: mapleradCallSucceeded,
        reserved_amount: reservedAmount,
      },
      log_txt: `Maplerad card creation failed: ${error.message}`,
      created_at: new Date(),
    });
  }

  /**
   * Save card creation metadata for webhook tracking
   */
  private async saveCardCreationMetadata(
    reference: string,
    customerId: string,
    feeCalculation: any,
    validatedDto: CreateCardDto,
    clientReference: string,
    mapleradCustomerId: string
  ): Promise<void> {
    // For now, we'll use CustomerLogsModel to store the metadata
    // In production, you might want to create a dedicated CardCreationTracking table
    await CustomerLogsModel.create({
      customer_id: customerId,
      action: "card_creation_pending",
      status: "PENDING",
      log_json: {
        reference,
        mapleradCustomerId,
        cardBrand: validatedDto.brand,
        initialBalance: validatedDto.amount,
        nameOnCard: validatedDto.name_on_card,
        clientReference,
        isFirstCard: feeCalculation.isFirstCard,
        feeCalculation,
        webhookExpected: true,
        createdAt: new Date(),
      },
      log_txt: `Card creation initiated - waiting for webhook: ${reference}`,
      created_at: new Date(),
    });

    this.logger.debug("Card creation metadata saved for webhook tracking", {
      reference,
      customerId,
      clientReference,
      mapleradCustomerId,
    });
  }

  /**
   * Check for new customer cards that may not be saved locally
   */
  private async checkForNewCustomerCards(
    customerId: string,
    mapleradCustomerId: string,
    reference: string
  ): Promise<{ found: boolean; card?: any }> {
    try {
      this.logger.log("🔍 CHECKING FOR NEW CUSTOMER CARDS", {
        customerId,
        mapleradCustomerId,
        reference,
        timestamp: new Date().toISOString(),
      });

      // Get all cards from Maplerad for this customer
      const mapleradCardsResult = await MapleradUtils.getAllCards({
        customerId: mapleradCustomerId,
        status: "ACTIVE", // Focus on active cards
      });

      if (mapleradCardsResult.error) {
        this.logger.warn("⚠️ FAILED TO FETCH MAPLERAD CARDS", {
          customerId,
          mapleradCustomerId,
          error: mapleradCardsResult.error.message,
          timestamp: new Date().toISOString(),
        });
        return { found: false };
      }

      const mapleradCards = mapleradCardsResult.output?.data || [];
      this.logger.log("📊 MAPLERAD CARDS RETRIEVED", {
        customerId,
        mapleradCustomerId,
        mapleradCardsCount: mapleradCards.length,
        timestamp: new Date().toISOString(),
      });

      if (mapleradCards.length === 0) {
        return { found: false };
      }

      // Get local cards for this customer
      const localCardsResult = await CardModel.get({
        customer_id: customerId,
        provider: encodeText("maplerad"),
      });

      const localCards = localCardsResult.output || [];
      const localProviderCardIds = new Set(
        localCards.map((card: any) => card.provider_card_id)
      );

      this.logger.log("🏠 LOCAL CARDS COMPARISON", {
        customerId,
        localCardsCount: localCards.length,
        localProviderCardIds: Array.from(localProviderCardIds),
        timestamp: new Date().toISOString(),
      });

      // Find the most recent card that is not saved locally
      let mostRecentNewCard: any = null;
      let mostRecentTimestamp = 0;

      for (const mapleradCard of mapleradCards) {
        // Skip if card is already saved locally
        if (localProviderCardIds.has(mapleradCard.id)) {
          continue;
        }

        // Check if this card is more recent than the current most recent
        const cardTimestamp = new Date(mapleradCard.created_at || 0).getTime();
        if (cardTimestamp > mostRecentTimestamp) {
          mostRecentTimestamp = cardTimestamp;
          mostRecentNewCard = mapleradCard;
        }
      }

      if (mostRecentNewCard) {
        this.logger.log("🎯 MOST RECENT NEW CARD FOUND", {
          customerId,
          mapleradCustomerId,
          newCardId: mostRecentNewCard.id,
          newCardStatus: mostRecentNewCard.status,
          newCardCreatedAt: mostRecentNewCard.created_at,
          reference,
          timestamp: new Date().toISOString(),
        });

        // Convert Maplerad card format to our internal format
        const expiry = mostRecentNewCard.expiry || "";
        const { expiry_month, expiry_year } = extractExpiryMonthYear(expiry);

        const cardData = {
          id: mostRecentNewCard.id,
          status: mostRecentNewCard.status,
          balance: convertMapleradAmountToMainUnit(
            mostRecentNewCard.balance || 0,
            "USD"
          ),
          maskedPan:
            mostRecentNewCard.masked_pan ||
            `****-****-****-${mostRecentNewCard.last4 || "****"}`,
          last4: mostRecentNewCard.last4 || "****",
          expiryMonth: mostRecentNewCard.expiry_month || expiry_month || 12,
          expiryYear: mostRecentNewCard.expiry_year || expiry_year || 99,
          brand: mostRecentNewCard.brand || "VISA",
          cardNumber: mostRecentNewCard.card_number,
          cvv: mostRecentNewCard.cvv,
          created_at: mostRecentNewCard.created_at,
          updated_at: mostRecentNewCard.updated_at,
        };

        return { found: true, card: cardData };
      }

      this.logger.log("🚫 NO NEW CARDS FOUND FOR CUSTOMER", {
        customerId,
        mapleradCustomerId,
        mapleradCardsCount: mapleradCards.length,
        localCardsCount: localCards.length,
        reference,
        timestamp: new Date().toISOString(),
      });

      return { found: false };
    } catch (error: any) {
      this.logger.error("❌ ERROR CHECKING FOR NEW CUSTOMER CARDS", {
        customerId,
        mapleradCustomerId,
        reference,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return { found: false };
    }
  }

  /**
   * Refund reserved funds
   */
  private async refundReservedFunds(
    companyId: string,
    amount: number
  ): Promise<void> {
    const usdWalletResult = await WalletModel.getOne({
      company_id: companyId,
      currency: "USD",
      is_active: true,
    });

    if (usdWalletResult.output) {
      const currentBalance = usdWalletResult.output.balance.toNumber();
      const newBalance = currentBalance + amount;

      await WalletModel.update(usdWalletResult.output.id, {
        balance: newBalance,
      });

      this.logger.debug("Funds refunded", {
        companyId,
        amount,
        previousBalance: currentBalance,
        newBalance,
      });
    }
  }
}
