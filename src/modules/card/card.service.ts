import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CardStatus, TransactionType } from "@prisma/client";
import {
  CreateCardDto,
  FundCardDto,
  WithdrawCardDto,
  CardResponseDto,
  CreateCardResponseDto,
  TransactionResponseDto,
} from "./dto/card.dto";
import CardModel from "@/models/prisma/cardModel";
import CompanyModel from "@/models/prisma/companyModel";
import CustomerModel from "@/models/prisma/customerModel";
import UserModel from "@/models/prisma/userModel";
import TransactionModel from "@/models/prisma/transactionModel";
import WalletModel from "@/models/prisma/walletModel";
import getCardFees from "@/utils/cards/cardFees";
import sudoUtils from "@/utils/cards/sudo";
import CustomerLogsModel from "@/models/prisma/customerLogsModel";
import { wordsInSentence } from "@/utils/shared/common";
import { v4 as uuidv4 } from "uuid";
import {
  InputJsonObject,
  InputJsonValue,
} from "@prisma/client/runtime/library";
import {
  decodeText,
  decodeToken,
  encodeText,
  signToken,
} from "@/utils/shared/encryption";
import { utcToLocalTime } from "@/utils/date";

@Injectable()
export class CardService {
  constructor(private prisma: PrismaService) {}

  async createCard(
    // companyId: string,
    createCardDto: CreateCardDto
  ): Promise<CreateCardResponseDto> {
    return CardModel.operation(async (prisma) => {
      //--------------------------------------------
      const nameOnCard = createCardDto.name_on_card;
      const currencyAmount = Number(createCardDto.amount);
      // Validation des paramètres
      if (!createCardDto.brand) {
        throw new BadRequestException("La marque de la carte est requise");
      }
      if (isNaN(currencyAmount) || currencyAmount < 2) {
        throw new BadRequestException("Le montant doit être au minimum 2 USD");
      }
      const brand = createCardDto.brand.toUpperCase();
      const validBrands = ["MASTERCARD", "VISA"];
      if (!validBrands.includes(brand)) {
        throw new BadRequestException("La marque doit être MASTERCARD ou VISA");
      }

      //--------------------------------------------

      // Verify customer belongs to company
      const customerResult = await CustomerModel.getOne({
        id: createCardDto.customer_id,
      });
      if (customerResult.error || !customerResult.output) {
        throw new NotFoundException("Customer not found");
      }
      const customer = customerResult.output;

      const companyId = customer.company_id;

      //--------------------------------------------
      // Check if customer is old enough (18+)
      const actualDate = new Date(Date.now() + 3600 * 1000);
      const birthdate: any = customer.date_of_birth;

      // Calcul de l'âge de l'utilisateur (même logique que Miden)
      const differenceEnMilliseconds =
        actualDate.getTime() - new Date(birthdate).getTime();
      const age = Math.floor(
        differenceEnMilliseconds / (365.25 * 24 * 60 * 60 * 1000)
      );

      // Vérification de l'âge
      if (age < 18) {
        throw new BadRequestException(
          "Vous n'avez pas l'âge requis pour pouvoir effectuer cette opération."
        );
      }
      //--------------------------------------------
      // Vérification du nombre de cartes existantes
      const cardSizeResult = await CardModel.count({
        customer_id: createCardDto.customer_id,
        status: { not: CardStatus.TERMINATED },
        company_id: companyId,
      });
      const cardSize = Number(cardSizeResult.output || 0);

      if (cardSize >= 5) {
        throw new BadRequestException(
          "Vous ne pouvez pas créer plus de 5 cartes !"
        );
      }
      //--------------------------------------------

      // Get company details including card price
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException("Company not found");
      }
      const company = companyResult.output;

      // Get USD wallet for funding
      const usdWalletResult = await WalletModel.getOne({
        company_id: companyId,
        currency: "USD",
        active: true,
      });
      if (usdWalletResult.error || !usdWalletResult.output) {
        throw new BadRequestException("USD wallet not found");
      }
      const usdWallet = usdWalletResult.output;

      const cardCreationFee = company.cardPrice.toNumber();
      const cardFundingAmount = Number(createCardDto.amount);
      const walletBalanceBefore = usdWallet.balance.toNumber();

      // Check if company has sufficient balance for card creation
      if (walletBalanceBefore < cardCreationFee + cardFundingAmount) {
        throw new BadRequestException(
          "Insufficient wallet balance to create card"
        );
      }

      // 1. Ensure user has a Sudo customer
      let sudoCustomerId = customer.sudo_customer_id;
      let newCustomer: any;
      if (!sudoUtils.hasCustomer(customer)) {
        // Create customer first
        const customerData = sudoUtils.prepareCustomerData(customer);
        const customerResult = await sudoUtils.createCustomer(customerData);

        if (customerResult.error) {
          console.error("Error creating Sudo customer:", customerResult.error);
          throw new BadRequestException(
            "Error creating PVD customer: " + customerResult.error.message
          );
        }

        newCustomer = customerResult.output?.data || customerResult.output;
        sudoCustomerId = newCustomer?._id || newCustomer?.id;

        if (!sudoCustomerId) {
          throw new Error("PVD Customer created but ID not returned");
        }

        // Update user with customer ID
        await CustomerModel.update(String(customer.id), {
          sudo_customer_id: sudoCustomerId,
        });
      }

      // 2. Create the card with Sudo
      const sudoBrand =
        brand.toUpperCase() === "MASTERCARD" ? "MasterCard" : "Visa";

      console.log(`🚀 Creating Sudo card for user ${customer.phone_number}:`, {
        sudoCustomerId,
        sudoBrand,
        currencyAmount,
        cardCreationFee,
        walletBalanceBefore,
      });

      const cardSudoResult = await sudoUtils.createCard(
        sudoCustomerId!,
        sudoBrand,
        currencyAmount
      );

      console.log(`📥 Sudo API Response for user ${customer.phone_number}:`, {
        success: !cardSudoResult.error,
        error: cardSudoResult.error,
        output: cardSudoResult.output,
        fullResponse: JSON.stringify(cardSudoResult, null, 2),
      });

      if (cardSudoResult.error) {
        console.error("❌ Error creating Sudo card:", cardSudoResult.error);

        const customerData = sudoUtils.prepareCustomerData(customer);

        // Logging detaillé des erreurs (même logique que Miden)
        const err = cardSudoResult.error;
        const CustomerLogsResult = await CustomerLogsModel.create({
          customer_id: String(customer?.id),
          customer_phone_number: String(customer?.phone_number),
          action: "card-purchase",
          status: "FAILED",
          log_json: {
            sudoCustomerId,
            customer,
            isUpdateCustomerDetailsError: wordsInSentence(
              cardSudoResult.error.message,
              ["update", "customer", "details"]
            ),
            customerDataForUpdate: customerData,
            payload: err?.payload,
            error_message: err?.message,
            error_response_data: err?.details,
            error_response_data_error: err?.details?.error,
            error_response_data_errors: err?.details?.errors,
          } as any,
          log_txt: `createCard : Error creating Sudo card : ${
            customer?.phone_number
          } :: ${
            err.details
              ? JSON.stringify(err.details)
              : JSON.stringify(err.message)
          }`,
          created_at: new Date(),
        });

        // Handle specific Sudo insufficient funds error (same as Miden)
        if (cardSudoResult.error.message === "No sufficient funds") {
          throw new BadRequestException("No sufficient funds.");
        }

        if (
          wordsInSentence(cardSudoResult.error.message, [
            "update",
            "customer",
            "details",
          ])
        ) {
          const updateResult = await sudoUtils.updateCustomer(
            customer.sudo_customer_id!,
            customerData
          );

          if (updateResult.error) {
            const CustomerLogsResult = await CustomerLogsModel.create({
              customer_id: String(customer?.id),
              customer_phone_number: String(customer?.phone_number),
              action: "card-purchase-updateCustomer",
              status: "FAILED",
              log_json: {
                customerId: customer?.sudo_customer_id,
                customerData,
                payload: updateResult.error?.payload,
                error_message: updateResult.error?.message,
                error_response_data: updateResult.error?.details,
                error_response_data_error: updateResult.error?.details?.error,
                error_response_data_errors: updateResult.error?.details?.errors,
              } as any,
              log_txt: `createCard : updateCustomer : Erreur lors de la mise à jour du customer : ${
                customer?.phone_number
              } :: ${
                updateResult.error?.details
                  ? JSON.stringify(updateResult.error.details)
                  : JSON.stringify(updateResult.error.message)
              }`,
              created_at: new Date(),
            });
            // return next(
            //   new AppError(
            //     'Erreur lors de la mise à jour du customer: ' +
            //       updateResult.error.message,
            //     500
            //   )
            // );
          }
        }

        throw new BadRequestException(
          "Error creating card: " + cardSudoResult.error.message
        );
      }

      const cardData = cardSudoResult.output?.data || cardSudoResult.output;

      console.log(
        `💳 Extracted card data for user ${customer?.phone_number}:`,
        {
          cardData,
          hasCardData: !!cardData,
          cardId: cardData?._id || cardData?.id,
          brand: cardData?.brand,
          status: cardData?.status,
          cardNumber: cardData?.cardNumber ? "PRESENT" : "MISSING",
        }
      );

      // Verify that we have valid card data (not just an error object)
      console.log("🔍 Card data validation:", {
        hasCardData: !!cardData,
        hasId: !!cardData?._id,
        statusCode: cardData?.statusCode,
        validCondition: cardData && cardData._id && !cardData.statusCode,
      });

      // if (!cardData || !cardData._id || cardData.statusCode) {
      //   console.error(
      //     `❌ Invalid card data for user ${newUser.phone}:`,
      //     cardData
      //   );
      //   return next(
      //     new AppError(
      //       'Erreur lors de la création de la carte: données invalides',
      //       500
      //     )
      //   );
      // }

      //----------------------------------------------------------

      if (cardData && cardData._id && !cardData.statusCode) {
        // 3. Mise à jour du solde de l'utilisateur (même logique que Miden)
        const balanceAfterCreatedCard =
          Math.round(
            (walletBalanceBefore - cardCreationFee + Number.EPSILON) * 100
          ) / 100;

        const balanceAfterFirstFundingCard =
          Math.round(
            (balanceAfterCreatedCard - cardFundingAmount + Number.EPSILON) * 100
          ) / 100;

        // Mise à jour du solde wallet
        const walletUpdateResult = await WalletModel.update(usdWallet.id, {
          balance: balanceAfterFirstFundingCard,
        });
        if (walletUpdateResult.error) {
          console.error(
            "❌ Erreur lors de la mise à jour du solde du wallet:",
            walletUpdateResult.error
          );
          throw new BadRequestException(
            "Error updating wallet balance: " + walletUpdateResult.error.message
          );
        }

        // 4. Création de la carte dans la DB locale (même structure que Miden)
        const cardId = uuidv4();
        const transactionId = uuidv4();
        const cardName = nameOnCard
          ? nameOnCard
          : `${customer.first_name} ${customer.last_name}`;

        // Extract Sudo card details properly
        const sudoBalance =
          cardData.balance ??
          cardData.account?.availableBalance ??
          cardData.account?.currentBalance ??
          0;
        // const sudoExpiredAt =
        //   cardData.expiryMonth && cardData.expiryYear
        //     ? `${cardData.expiryMonth}/${cardData.expiryYear}`
        //     : "12/99";

        /** --------------------------------------- */
        let tokenCardNumber = cardData.cardNumber || "***";
        let tokenCardCvv = cardData.cvv || "***";

        const cardSudoResult = await sudoUtils.getCard(
          cardData?._id || cardData?.id,
          true
        );
        const cardSudo = cardSudoResult.output?.data || cardSudoResult.output;

        console.log(
          "Created Card [cvv, number] :: Card Sudo details:",
          cardSudo
        );

        if (cardSudo?.cvv) {
          tokenCardNumber = `tkSkr_${signToken(cardSudo?.number)}`;
          tokenCardCvv = `tkSkr_${signToken(cardSudo?.cvv)}`;
        }
        /** --------------------------------------- */

        const newCardResult = await CardModel.create({
          id: cardId,
          status: cardData.status?.toUpperCase() || "ACTIVE",
          customer_id: customer.id,
          company_id: customer.company_id,
          country: customer.country_iso_code,
          brand: (cardData.brand || sudoBrand).toUpperCase(), // Always uppercase
          provider: encodeText("sudo"),
          currency: "USD",
          name: cardName.toUpperCase(),
          balance: sudoBalance,
          reference: cardData.account?._id, // Use account._id
          provider_card_id: cardData._id || cardData.id, // Use cardData._id
          // provider_card_account_number: cardData.account?.accountNumber, // New field
          number: tokenCardNumber, // cardData.cardNumber || '****',
          masked_number:
            cardData.maskedPan || `****-****-****-${cardData.last4 || "****"}`,
          last4: cardData.last4,
          cvv: tokenCardCvv, // cardData.cvv || '***',
          expiry_month: cardData.expiryMonth || 12, // Default to 12 if not provided
          expiry_year: cardData.expiryYear || 99, // Default to 99 if not provided
          postal_code: "05734", // || cardData.billingAddress?.postalCode,
          street: customer?.address || cardData.billingAddress?.line1 || "",
          city: customer?.city || cardData.billingAddress?.city || "",
          state_code: customer?.state || cardData.billingAddress?.state || "",
          country_iso_code:
            customer?.country_iso_code ||
            cardData.billingAddress?.country ||
            "",
          is_active: true,
          is_virtual: true,
        });

        console.log("🔍 CardModel.createCard result:", {
          success: !newCardResult.error,
          error: newCardResult.error,
          hasOutput: !!newCardResult.output,
          outputKeys: newCardResult.output
            ? Object.keys(newCardResult.output)
            : null,
        });

        const newCard = newCardResult.output;

        if (newCardResult.error) {
          console.error(
            "❌ Erreur création carte locale:",
            newCardResult.error
          );
          const err = newCardResult.error;
          const userLogsResult = await CustomerLogsModel.create({
            id: uuidv4(),
            customer_id: String(customer?.id),
            customer_phone_number: String(customer?.phone_number),
            action: "card-purchase",
            status: "FAILED",
            log_json: {
              payload: err?.payload,
              error_message: err?.message,
              error_response_data: err?.response?.data,
              error_response_data_error: err?.response?.data?.error,
              error_response_data_errors: err?.response?.data?.errors,
            },
            log_txt: `createCard error: ${customer?.phone_number} :: ${
              err.response
                ? JSON.stringify(err.response?.data)
                : JSON.stringify(err.message)
            }`,
            created_at: new Date(),
          });

          throw new BadRequestException(
            "Error creating db card: " + err.message
          );
        }

        if (!newCard) {
          console.error("❌ newCard est null/undefined après création");
          throw new BadRequestException("Card not saved in local DB");
        }

        // 5. Création des transactions (même logique que Miden)
        const transactionResult = await TransactionModel.create({
          id: transactionId,
          status: "SUCCESS",
          category: "card",
          type: "purchase",
          amount: cardCreationFee,
          currency: "USD",
          customer_id: String(customer.id),
          company_id: String(customer.company_id),
          card_id: String(cardId),
          card_balance_before: 0,
          card_balance_after: 0,
          wallet_balance_before: walletBalanceBefore,
          wallet_balance_after: balanceAfterCreatedCard,
          provider: encodeText("sudo"),
          created_at: utcToLocalTime(new Date())?.toISOString(),
        });

        console.log("🔍 TransactionModel.createTransaction result:", {
          success: !transactionResult.error,
          error: transactionResult.error,
          hasOutput: !!transactionResult.output,
        });

        const transaction = transactionResult.output;

        const topupTransactionResult = await TransactionModel.create({
          id: uuidv4(),
          amount: currencyAmount,
          currency: "USD",
          category: "card",
          type: "fund",
          description: "Card first funding",
          status: "SUCCESS",
          customer_id: String(customer.id),
          company_id: String(customer.company_id),
          card_id: String(cardId),
          card_balance_before: 0,
          card_balance_after: currencyAmount,
          wallet_balance_before: balanceAfterCreatedCard,
          wallet_balance_after: balanceAfterFirstFundingCard,
          provider: encodeText("sudo"),
          created_at: utcToLocalTime(new Date())?.toISOString(),
        });
        const topupTransaction = topupTransactionResult.output;

        // 8. Log user action
        try {
          await CustomerLogsModel.create({
            id: uuidv4(),
            customer_id: customer.id,
            customer_phone_number: String(customer.phone),
            action: "card-purchase",
            status: "SUCCESS",
            log_json: {
              card_data: cardData,
              transaction_id: transactionId,
              card_id: cardId,
              customer_id: customer.id,
              transaction_success: !!transaction,
              topup_transaction_success: !!topupTransaction,
              new_card_success: !!newCard,
            },
            log_txt: `createCard success: ${customer.phone} :: Sudo card created successfully`,
            created_at: new Date(),
          });
        } catch (logError) {
          console.error("Error logging user action:", logError);
        }

        // Réponse à la requête
        return {
          status: "success",
          message: "Card created successfully",
          card: newCard,
          // createCardTransaction: transaction || null,
          // topupTransaction: topupTransaction || null,
        };
      } else {
        console.log(`${customer.id} created card - FAILED`);
        throw new BadRequestException("Something went wrong");
      }

      //----------------------------------------------------------
    });
  }

  async fundCard(
    companyId: string,
    cardId: string,
    amount: number
  ): Promise<{ status: string; message: string }> {
    return CardModel.operation(async (prisma) => {
      // Get card and verify ownership
      const cardResult = await CardModel.getOne({
        id: cardId,
        company_id: companyId,
        status: { not: CardStatus.TERMINATED },
      });
      if (cardResult.error) {
        throw new NotFoundException(cardResult.error.message);
      }
      const card = cardResult.output;

      if (!card) {
        throw new NotFoundException("Card not found");
      }

      if (decodeText(card.provider) !== "sudo") {
        throw new BadRequestException("Incorrect card source");
      }

      if (card.status === CardStatus.FROZEN) {
        throw new BadRequestException("Cannot fund a frozen card");
      }

      if (amount < 1) {
        throw new BadRequestException("Minimum 1 USD required");
      }

      // Get company details including fund rate
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException("Company not found");
      }
      const company = companyResult.output;

      // Get USD wallet for funding
      const usdWalletResult = await WalletModel.getOne({
        company_id: companyId,
        currency: "USD",
        active: true,
      });
      if (usdWalletResult.error || !usdWalletResult.output) {
        throw new BadRequestException("USD wallet not found");
      }
      const usdWallet = usdWalletResult.output;

      const customerResult = await CardModel.getOne({
        id: cardId,
        company_id: companyId,
        status: { not: CardStatus.TERMINATED },
      });
      if (customerResult.error) {
        throw new NotFoundException(customerResult.error.message);
      }
      const customer = customerResult.output;

      //--------------------------------------------------------
      // Effectuer le transfert de fonds
      try {
        // 5. Récupérer l'ID du compte de la carte (creditAccountId)
        const creditAccountId = card.reference;
        if (!creditAccountId) {
          throw new BadRequestException("Card account ID not found");
        }

        // 6. Récupérer l'ID du compte de débit depuis la configuration
        const debitAccountId = sudoUtils.getDebitAccountId();

        console.log("🏦 Using debit account ID:", debitAccountId);

        // 7. Effectuer le transfert via Sudo API
        const transactionId = uuidv4();
        const payload = {
          debitAccountId: debitAccountId,
          creditAccountId: creditAccountId,
          amount: amount,
          narration: `Recharge carte ${
            card.masked_number || "XXXX"
          } - ${amount} USD`,
          paymentReference: transactionId,
        };
        const transferResult = await sudoUtils.transferFunds(payload);

        if (transferResult.error) {
          const err = transferResult.error;
          console.error("❌ Erreur transfert Sudo:", transferResult.error);

          const userLogsResult = await CustomerLogsModel.create({
            customer_id: String(customer?.id),
            customer_phone_number: String(customer?.phone),
            action: "fund-card-sudo",
            status: "FAILED",
            log_json: {
              payload,
              error_message: err?.message,
              error_response_data: err?.response?.data,
              error_response_data_details: err?.response?.details,
              error_response_data_error: err?.response?.data?.error,
              error_response_data_errors: err?.response?.data?.errors,
              error_response_data_error_errors:
                err?.response?.data?.error?.errors,
            },
            log_txt: `fund-card-sudo error: ${customer?.phone} :: ${
              err.response
                ? JSON.stringify(err.response.data)
                : JSON.stringify(err.message)
            }`,
          });

          throw new BadRequestException(
            "Error funding PVD Card: " + transferResult.error.message
          );
        }

        const transferData =
          transferResult.output?.data || transferResult.output;
        console.log("📋 Réponse transfert Sudo:", transferData);

        // Vérifier le statut du transfert
        const transferStatus = transferData.status;
        const transferId = transferData.id || transferData._id;

        if (transferStatus !== "completed") {
          console.error("❌ Transfert Sudo échoué:", {
            status: transferStatus,
            responseCode: transferData.responseCode,
            responseMessage: transferData.responseMessage,
            transferData,
          });

          throw new BadRequestException(
            `Card funding failed: ${
              transferData.responseMessage || "Status not completed"
            }`
          );
        }

        // Vérifier que l'ID du transfert est présent
        if (!transferId) {
          console.error("❌ ID du transfert manquant:", transferData);
          throw new BadRequestException(
            `No transfer ID found in response: operation aborted.`
          );
        }

        console.log(
          "✅ Transfert Sudo réussi et complété avec ID:",
          transferId
        );

        //--------------------------------------------------------

        // const fundRate = company.cardFundRate.toNumber();
        // const totalCost =amount * fundRate; // Apply fund rate
        const totalCost = amount;
        const walletBalanceBefore = usdWallet.balance.toNumber();
        const cardBalanceBefore = card.balance.toNumber();

        if (walletBalanceBefore < totalCost) {
          throw new BadRequestException(
            "Insufficient wallet balance for funding"
          );
        }

        const cardBalanceAfter = cardBalanceBefore + amount;
        const walletBalanceAfter = walletBalanceBefore - totalCost;

        // Update card balance
        const updateResult = await CardModel.update(cardId, {
          balance: cardBalanceAfter,
        });
        if (updateResult.error) {
          throw new BadRequestException(updateResult.error.message);
        }

        // Deduct cost from USD wallet
        const walletUpdateResult = await WalletModel.update(usdWallet.id, {
          balance: walletBalanceAfter,
        });
        if (walletUpdateResult.error) {
          throw new BadRequestException(walletUpdateResult.error.message);
        }

        // Create transaction record
        const transactionResult = await TransactionModel.create({
          category: "card",
          type: "fund",
          card_id: cardId,
          customer_id: customer.id,
          company_id: company.id,
          status: "SUCCESS",
          provider: encodeText("sudo"),
          id: transactionId,
          card_balance_before: cardBalanceBefore,
          card_balance_after: cardBalanceAfter,
          wallet_balance_before: walletBalanceBefore,
          wallet_balance_after: walletBalanceAfter,
          amount: amount,
          currency: "USD",
          order_id: transferData.id || transferData._id || transactionId,
          description: `Card funding: ${
            card.masked_number || "XXXX"
          } | Amount: ${amount} USD`,
          created_at: utcToLocalTime(new Date())?.toISOString(),
        });
        if (transactionResult.error) {
          throw new BadRequestException(transactionResult.error.message);
        }

        return {
          status: "success",
          message: `Card funded successfully with $${amount} (Cost: $${totalCost.toFixed(
            2
          )})`,
        };
      } catch (err: any) {
        console.error("Sudo fundCard error:", err);

        // Log de l'erreur
        try {
          await CustomerLogsModel.create({
            id: uuidv4(),
            customer_id: String(customer?.id),
            customer_phone_number: String(customer?.phone_number),
            action: "sudo_card_funding",
            status: "FAILED",
            log_json: {
              card_id: cardId,
              amount: amount,
              error_message: err.message,
              error_details: err,
            },
            log_txt: `Sudo card funding failed: ${err.message}`,
            created_at: new Date(),
          });
        } catch (logError) {
          console.error("Error logging card funding failure:", logError);
        }

        throw new BadRequestException(
          "An error occured while funding the card. Please try again later."
        );
      }
    });
  }

  async withdrawFromCard(
    companyId: string,
    cardId: string,
    amount: number
  ): Promise<{ status: string; message: string }> {
    return CardModel.operation(async (prisma) => {
      // Get card and verify ownership
      const cardResult = await CardModel.getOne({
        id: cardId,
        company_id: companyId,
        status: { not: CardStatus.TERMINATED },
      });
      if (cardResult.error) {
        throw new NotFoundException(cardResult.error.message);
      }
      const card = cardResult.output;

      if (!card) {
        throw new NotFoundException("Card not found");
      }

      if (decodeText(card.provider) !== "sudo") {
        throw new BadRequestException("Incorrect card source");
      }

      if (card.status === CardStatus.FROZEN) {
        throw new BadRequestException("Cannot withdraw from a frozen card");
      }

      if (amount < 1) {
        throw new BadRequestException("Minimum 1 USD required");
      }

      const cardBalanceBefore = card.balance.toNumber();

      if (cardBalanceBefore < amount) {
        throw new BadRequestException("Insufficient card balance");
      }

      // Get company details including fund rate
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException("Company not found");
      }
      const company = companyResult.output;

      // Get USD wallet for funding
      const usdWalletResult = await WalletModel.getOne({
        company_id: companyId,
        currency: "USD",
        active: true,
      });
      if (usdWalletResult.error || !usdWalletResult.output) {
        throw new BadRequestException("USD wallet not found");
      }
      const usdWallet = usdWalletResult.output;

      const customerResult = await CardModel.getOne({
        id: cardId,
        company_id: companyId,
        status: { not: CardStatus.TERMINATED },
      });
      if (customerResult.error) {
        throw new NotFoundException(customerResult.error.message);
      }
      const customer = customerResult.output;

      //--------------------------------------------------------
      const transactionId = uuidv4();

      try {
        // 5. Récupérer les IDs des comptes (INVERSE du funding)
        const debitAccountId = card.reference; // Compte de la carte (source)
        const creditAccountId = sudoUtils.getDebitAccountId(); // Compte principal (destination)

        if (!debitAccountId) {
          throw new BadRequestException("card account ID not found");
        }

        console.log("🏦 Retrait - Compte carte (débit):", debitAccountId);
        console.log("🏦 Retrait - Compte principal (crédit):", creditAccountId);

        // 6. Effectuer le transfert via Sudo API (INVERSE du funding)

        const transferResult = await sudoUtils.transferFunds({
          debitAccountId: debitAccountId, // De la carte
          creditAccountId: creditAccountId, // Vers le compte principal
          amount: amount, // Montant total (frais inclus côté carte)
          narration: `Retrait carte ${
            card.masked_number || "XXXX"
          } - ${amount} USD`,
          paymentReference: transactionId,
        });

        if (transferResult.error) {
          console.error(
            "❌ Erreur transfert retrait Sudo:",
            transferResult.error
          );
          throw new BadRequestException(
            "Withdrawal error: " + transferResult.error.message
          );
        }

        const transferData =
          transferResult.output?.data || transferResult.output;
        console.log("📋 Réponse transfert retrait Sudo:", transferData);

        // 7. Vérifier le succès du transfert (même vérifications que funding)
        const transferStatus = transferData.status;
        const transferId = transferData.id || transferData._id;

        if (transferStatus !== "completed" && transferStatus !== "pending") {
          console.error("❌ Transfert retrait Sudo échoué:", {
            status: transferStatus,
            responseCode: transferData.responseCode,
            responseMessage: transferData.responseMessage,
            transferData,
          });

          throw new BadRequestException(
            `Withdrawal failed: ${
              transferData.responseMessage || "Status not completed"
            }`
          );
        }

        // Vérifier que l'ID du transfert est présent
        if (!transferId) {
          console.error("❌ ID du transfert retrait manquant:", transferData);
          throw new BadRequestException(
            "transfer ID not found in response: operation aborted."
          );
        }

        console.log("✅ Transfert retrait Sudo réussi avec ID:", transferId);

        // --------------------------------------------------------

        const walletBalanceBefore = usdWallet.balance.toNumber();
        const cardBalanceAfter = cardBalanceBefore - amount;
        const walletBalanceAfter = walletBalanceBefore + amount;

        // Update card balance
        const updateResult = await CardModel.update(cardId, {
          balance: cardBalanceAfter,
        });
        if (updateResult.error) {
          throw new BadRequestException(updateResult.error.message);
        }

        // Add funds back to USD wallet
        const walletUpdateResult = await WalletModel.update(usdWallet.id, {
          balance: walletBalanceAfter,
        });
        if (walletUpdateResult.error) {
          throw new BadRequestException(walletUpdateResult.error.message);
        }

        // Create transaction record
        const transactionResult = await TransactionModel.create({
          category: "card",
          type: "withdraw",
          card_id: cardId,
          customer_id: customer.id,
          company_id: company.id,
          status: "SUCCESS",
          provider: encodeText("sudo"),
          id: transactionId,
          card_balance_before: cardBalanceBefore,
          card_balance_after: cardBalanceAfter,
          wallet_balance_before: walletBalanceBefore,
          wallet_balance_after: walletBalanceAfter,
          amount: amount,
          currency: "USD",
          order_id: transferData._id,
          description: `Withdraw from Card : ${
            card.masked_number || "XXXX"
          } | Amount: ${amount} USD`,
          created_at: utcToLocalTime(new Date())?.toISOString(),
        });
        if (transactionResult.error) {
          throw new BadRequestException(transactionResult.error.message);
        }

        return {
          status: "success",
          message: `Successfully withdrawn $${amount} from card`,
        };
      } catch (err: any) {
        console.error("Error during withdrawal:", err);
        try {
          await CustomerLogsModel.create({
            id: uuidv4(),
            customer_id: String(customer?.id),
            customer_phone_number: String(customer?.phone_number),
            action: "card_withdrawal",
            status: "FAILED",
            log_json: {
              card_id: cardId,
              amount: amount,
              error_message: err.message,
              error_details: err,
            },
            log_txt: `Sudo card withdrawal failed: ${err.message}`,
            created_at: new Date(),
          });
        } catch (logError) {
          console.error("Error logging card withdrawal failure:", logError);
        }

        throw new BadRequestException(
          "An error occurred while processing the withdrawal"
        );
      }
    });
  }

  async freezeCard(
    companyId: string,
    cardId: string
  ): Promise<{ success: boolean; message: string }> {
    const cardResult = await CardModel.getOne({
      id: cardId,
      company_id: companyId,
      status: { not: CardStatus.TERMINATED },
    });
    if (cardResult.error) {
      throw new NotFoundException(cardResult.error.message);
    }
    const card = cardResult.output;
    if (card.status === CardStatus.FROZEN) {
      throw new BadRequestException("Card is already frozen");
    }
    const updateResult = await CardModel.update(cardId, {
      status: CardStatus.FROZEN,
    });
    if (updateResult.error) {
      throw new BadRequestException(updateResult.error.message);
    }
    return {
      success: true,
      message: "Card frozen successfully",
    };
  }

  async unfreezeCard(
    companyId: string,
    cardId: string
  ): Promise<{ success: boolean; message: string }> {
    const cardResult = await CardModel.getOne({
      id: cardId,
      company_id: companyId,
      status: { not: CardStatus.TERMINATED },
    });
    if (cardResult.error) {
      throw new NotFoundException(cardResult.error.message);
    }
    const card = cardResult.output;
    if (card.status !== CardStatus.FROZEN) {
      throw new BadRequestException("Card is not frozen");
    }
    const updateResult = await CardModel.update(cardId, {
      status: CardStatus.ACTIVE,
    });
    if (updateResult.error) {
      throw new BadRequestException(updateResult.error.message);
    }
    return {
      success: true,
      message: "Card unfrozen successfully",
    };
  }

  // async terminateCard(
  //   companyId: string,
  //   cardId: string
  // ): Promise<{ success: boolean; message: string }> {
  //   return CardModel.operation(async (prisma) => {
  //     const cardResult = await CardModel.getOne({
  //       id: cardId,
  //       company_id: companyId,
  //       status: { not: CardStatus.TERMINATED },
  //     });
  //     if (cardResult.error) {
  //       throw new NotFoundException(cardResult.error.message);
  //     }
  //     const card = cardResult.output;

  //     const cardBalanceBefore = card.balance.toNumber();

  //     // Get USD wallet to return remaining balance
  //     const usdWalletResult = await WalletModel.getOne({
  //       company_id: companyId,
  //       currency: "USD",
  //       active: true,
  //     });
  //     if (usdWalletResult.error) {
  //       throw new BadRequestException("USD wallet not found");
  //     }
  //     const usdWallet = usdWalletResult.output;
  //     const walletBalanceBefore = usdWallet.balance.toNumber();
  //     const walletBalanceAfter = walletBalanceBefore + cardBalanceBefore;

  //     // Set card status to terminated and balance to 0
  //     const updateResult = await CardModel.update(cardId, {
  //       status: CardStatus.TERMINATED,
  //       balance: 0,
  //     });
  //     if (updateResult.error) {
  //       throw new BadRequestException(updateResult.error.message);
  //     }

  //     // Return remaining balance to USD wallet
  //     if (cardBalanceBefore > 0) {
  //       const walletUpdateResult = await WalletModel.update(usdWallet.id, {
  //         balance: walletBalanceAfter,
  //       });
  //       if (walletUpdateResult.error) {
  //         throw new BadRequestException(walletUpdateResult.error.message);
  //       }
  //     }

  //     // Create transaction record
  //     const transactionResult = await TransactionModel.create({
  //       type: TransactionType.TERMINATE,
  //       card_id: cardId,
  //       card_balance_before: cardBalanceBefore,
  //       card_balance_after: 0,
  //       wallet_balance_before: walletBalanceBefore,
  //       wallet_balance_after: walletBalanceAfter,
  //       amount: cardBalanceBefore,
  //       reference: `TERMINATE_${cardId}_${Date.now()}`,
  //     });
  //     if (transactionResult.error) {
  //       throw new BadRequestException(transactionResult.error.message);
  //     }

  //     return {
  //       success: true,
  //       message: `Card terminated successfully. Remaining balance of $${cardBalanceBefore} returned to wallet.`,
  //     };
  //   });
  // }

  async findAllByCompany(companyId: string): Promise<CardResponseDto[]> {
    const cardsResult = await CardModel.get({ company_id: companyId });
    if (cardsResult.error) {
      throw new BadRequestException(cardsResult.error.message);
    }
    const cards = cardsResult.output;
    return cards.map((card) => this.mapToResponseDto(card));
  }

  async findOne(
    companyId: string,
    cardId: string,
    reveal?: boolean
  ): Promise<CardResponseDto> {
    const cardResult = await CardModel.getOne({
      id: cardId,
      company_id: companyId,
    });
    if (cardResult.error) {
      throw new NotFoundException(cardResult.error.message);
    }
    const card = cardResult.output;
    //--------------------------------------------

    let cardSudoData: any;
    let cardData: any = card;

    if (String(reveal) === "true") {
      if (card.cvv?.startsWith("***")) {
        // Récupérer les détails de la carte depuis Sudo API
        const cardSudoResult = await sudoUtils.getCard(
          card.provider_card_id,
          String(reveal) === "true" ? true : false
        );

        if (cardSudoResult.error) {
          console.error(
            "❌ Erreur récupération carte Sudo:",
            cardSudoResult.error
          );
        }

        cardSudoData = cardSudoResult.output?.data || cardSudoResult.output;

        cardData = {
          ...cardData,
          number: cardSudoData?.number,
          cvv: cardSudoData?.cvv,
        };

        if (cardData?.cvv) {
          const tokenCardNumber = `tkSkr_${signToken(cardData?.number)}`;
          const tokenCardCvv = `tkSkr_${signToken(cardData?.cvv)}`;
          const updatedCardResult = await CardModel.update(card.id, {
            number: tokenCardNumber,
            cvv: tokenCardCvv,
          });
        }
      } else if (card.cvv?.startsWith("tkSkr_")) {
        const decodedTokenCardNumber = decodeToken(
          card.number.replace(/^tkSkr_/, "")
        )?.value;
        const decodedTokenCardCvv = decodeToken(
          card.cvv.replace(/^tkSkr_/, "")
        )?.value;

        cardData = {
          ...cardData,
          number: decodedTokenCardNumber,
          cvv: decodedTokenCardCvv,
        };
      }
    }

    //--------------------------------------------

    return this.mapToResponseDto(cardData);
  }

  async getTransactions(
    companyId: string,
    cardId: string
  ): Promise<TransactionResponseDto[]> {
    // Verify card belongs to company
    const cardResult = await CardModel.getOne({
      id: cardId,
      company_id: companyId,
    });
    if (cardResult.error) {
      throw new NotFoundException(cardResult.error.message);
    }
    const card = cardResult.output;
    const transactionsResult = await TransactionModel.get({ card_id: cardId });
    if (transactionsResult.error) {
      throw new BadRequestException(transactionsResult.error.message);
    }
    const transactions = transactionsResult.output;
    return transactions.map((transaction) => ({
      id: transaction.id,
      category: transaction.category,
      type: transaction.type,
      card_id: transaction.card_id,
      card_balance_before: transaction.card_balance_before.toNumber(),
      card_balance_after: transaction.card_balance_after.toNumber(),
      wallet_balance_before: transaction.wallet_balance_before.toNumber(),
      wallet_balance_after: transaction.wallet_balance_after.toNumber(),
      amount: transaction.amount.toNumber(),
      currency: transaction.currency,
      status: transaction.status,
      // reference: transaction.reference,
      created_at: transaction.createdAt,
    }));
  }

  private generateCardNumber(): string {
    // Generate a 16-digit card number (starting with 4 for Visa-like format)
    const prefix = "4";
    const randomDigits = Array.from({ length: 15 }, () =>
      Math.floor(Math.random() * 10)
    ).join("");
    return prefix + randomDigits;
  }

  private mapToResponseDto(card: any): CardResponseDto {
    return {
      id: card.id,
      customer_id: card.customer_id,
      status: card.status,
      balance: parseFloat(card.balance.toString()),
      number: this.maskCardNumber(card.number),
      created_at: card.created_at,
      customer: card.customer
        ? {
            id: card.customer.id,
            first_name: card.customer.first_name,
            last_name: card.customer.last_name,
            email: card.customer.email,
          }
        : undefined,
    };
  }

  private maskCardNumber(cardNumber: string): string {
    return (
      cardNumber.substring(0, 4) + "*".repeat(8) + cardNumber.substring(12)
    );
  }
}
