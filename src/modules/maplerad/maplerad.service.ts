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
} from "../card/dto/card.dto";
import CardModel from "@/models/prisma/cardModel";
import CompanyModel from "@/models/prisma/companyModel";
import CustomerModel from "@/models/prisma/customerModel";
import UserModel from "@/models/prisma/userModel";
import TransactionModel from "@/models/prisma/transactionModel";
import WalletModel from "@/models/prisma/walletModel";
// import getCardFees from "@/utils/cards/cardFees";
import mapleradUtils from "@/utils/cards/maplerad";
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
import { prepareMapleradCustomerData } from "@/utils/cards/maplerad/tools";

@Injectable()
export class MapleradService {
  constructor(private prisma: PrismaService) {}

  async createCard(
    createCardDto: CreateCardDto
  ): Promise<CreateCardResponseDto> {
    return CardModel.operation(async (prisma) => {
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

      // Vérifier que le customer appartient à la company
      const customerResult = await CustomerModel.getOne({
        id: createCardDto.customer_id,
      });
      if (customerResult.error || !customerResult.output) {
        throw new NotFoundException("Customer not found");
      }
      const customer = customerResult.output;
      const companyId = customer.company_id;

      // Vérifier que le customer a au moins 18 ans
      const actualDate = new Date(Date.now() + 3600 * 1000);
      const birthdate: any = customer.date_of_birth;

      const differenceEnMilliseconds =
        actualDate.getTime() - new Date(birthdate).getTime();
      const age = Math.floor(
        differenceEnMilliseconds / (365.25 * 24 * 60 * 60 * 1000)
      );

      if (age < 18) {
        throw new BadRequestException(
          "Vous n'avez pas l'âge requis pour pouvoir effectuer cette opération."
        );
      }

      // Vérifier le nombre de cartes existantes
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

      // Récupérer les détails de la company
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException("Company not found");
      }
      const company = companyResult.output;

      // Récupérer le wallet USD
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

      // Vérifier que la company a suffisamment de fonds
      if (walletBalanceBefore < cardCreationFee + cardFundingAmount) {
        throw new BadRequestException(
          "Insufficient wallet balance to create card"
        );
      }

      // 1. S'assurer que l'utilisateur a un customer Maplerad
      let mapleradCustomerId = customer.maplerad_customer_id;
      if (!mapleradCustomerId) {
        // Créer le customer d'abord
        const customerData = prepareMapleradCustomerData(customer);
        const customerResult = await mapleradUtils.createCustomer(customerData);

        if (customerResult.error) {
          console.error(
            "Error creating Maplerad customer:",
            customerResult.error
          );
          throw new BadRequestException(
            "Error creating Maplerad customer: " + customerResult.error.message
          );
        }

        const newCustomer =
          customerResult.output?.data || customerResult.output;
        mapleradCustomerId = newCustomer?.id || newCustomer?.customer_id;

        if (!mapleradCustomerId) {
          throw new Error("Maplerad customer created but ID not returned");
        }

        // Mettre à jour l'utilisateur avec l'ID du customer
        await CustomerModel.update(String(customer.id), {
          maplerad_customer_id: mapleradCustomerId,
        });
      }

      // 2. Créer la carte avec Maplerad
      const mapleradBrand =
        brand.toUpperCase() === "MASTERCARD" ? "MASTERCARD" : "VISA";

      console.log(
        `🚀 Creating Maplerad card for user ${customer.phone_number}:`,
        {
          mapleradCustomerId,
          mapleradBrand,
          currencyAmount,
          cardCreationFee,
          walletBalanceBefore,
        }
      );

      const cardMapleradResult = await mapleradUtils.createCardSimple(
        mapleradCustomerId,
        mapleradBrand,
        currencyAmount
      );

      console.log(
        `📥 Maplerad API Response for user ${customer.phone_number}:`,
        {
          success: !cardMapleradResult.error,
          error: cardMapleradResult.error,
          output: cardMapleradResult.output,
          fullResponse: JSON.stringify(cardMapleradResult, null, 2),
        }
      );

      if (cardMapleradResult.error) {
        console.error(
          "❌ Error creating Maplerad card:",
          cardMapleradResult.error
        );

        // Logging détaillé des erreurs
        const err = cardMapleradResult.error;
        const CustomerLogsResult = await CustomerLogsModel.create({
          customer_id: String(customer?.id),
          customer_phone_number: String(customer?.phone_number),
          action: "card-purchase",
          status: "FAILED",
          log_json: {
            mapleradCustomerId,
            customer,
            payload: err?.payload,
            error_message: err?.message,
            error_response_data: err?.details,
            error_response_data_error: err?.details?.error,
            error_response_data_errors: err?.details?.errors,
          } as any,
          log_txt: `createCard : Error creating Maplerad card : ${
            customer?.phone_number
          } :: ${
            err.details
              ? JSON.stringify(err.details)
              : JSON.stringify(err.message)
          }`,
          created_at: new Date(),
        });

        throw new BadRequestException(
          "Error creating card: " + cardMapleradResult.error.message
        );
      }

      const cardData =
        cardMapleradResult.output?.data || cardMapleradResult.output;

      console.log(
        `💳 Extracted card data for user ${customer?.phone_number}:`,
        {
          cardData,
          hasCardData: !!cardData,
          cardId: cardData?.id || cardData?.card_id,
          brand: cardData?.brand,
          status: cardData?.status,
          cardNumber: cardData?.cardNumber ? "PRESENT" : "MISSING",
        }
      );

      if (cardData && (cardData.id || cardData.card_id)) {
        // 3. Mise à jour du solde de l'utilisateur
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

        // 4. Création de la carte dans la DB locale
        const cardId = uuidv4();
        const transactionId = uuidv4();
        const cardName = nameOnCard
          ? nameOnCard
          : `${customer.first_name} ${customer.last_name}`;

        // Extraire les détails de la carte Maplerad
        const mapleradBalance =
          cardData.balance ??
          cardData.account?.availableBalance ??
          cardData.account?.currentBalance ??
          0;

        let tokenCardNumber = cardData.cardNumber || "***";
        let tokenCardCvv = cardData.cvv || "***";

        // Récupérer les détails sensibles de la carte
        const cardMapleradDetailsResult =
          await mapleradUtils.getCardDetailsFromMaplerad(
            cardData.id || cardData.card_id
          );
        const cardMapleradDetails =
          cardMapleradDetailsResult.output?.data ||
          cardMapleradDetailsResult.output;

        console.log(
          "Created Card [cvv, number] :: Maplerad card details:",
          cardMapleradDetails
        );

        if (cardMapleradDetails?.cvv) {
          tokenCardNumber = `tkMplr_${signToken(cardMapleradDetails?.number)}`;
          tokenCardCvv = `tkMplr_${signToken(cardMapleradDetails?.cvv)}`;
        }

        const newCardResult = await CardModel.create({
          id: cardId,
          status: cardData.status?.toUpperCase() || "ACTIVE",
          customer_id: customer.id,
          company_id: customer.company_id,
          country: customer.country_iso_code,
          brand: (cardData.brand || mapleradBrand).toUpperCase(),
          provider: encodeText("maplerad"),
          currency: "USD",
          name: cardName.toUpperCase(),
          balance: mapleradBalance,
          reference: cardData.account?.id || cardData.id,
          provider_card_id: cardData.id || cardData.card_id,
          number: tokenCardNumber,
          masked_number:
            cardData.masked_pan || `****-****-****-${cardData.last4 || "****"}`,
          last4: cardData.last4,
          cvv: tokenCardCvv,
          expiry_month: cardData.expiryMonth || cardData.expiry_month || 12,
          expiry_year: cardData.expiryYear || cardData.expiry_year || 99,
          postal_code: "05734",
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

        // 5. Création des transactions
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
          provider: encodeText("maplerad"),
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
          provider: encodeText("maplerad"),
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
            log_txt: `createCard success: ${customer.phone} :: Maplerad card created successfully`,
            created_at: new Date(),
          });
        } catch (logError) {
          console.error("Error logging user action:", logError);
        }

        return {
          status: "success",
          message: "Card created successfully",
          card: newCard,
        };
      } else {
        console.log(`${customer.id} created card - FAILED`);
        throw new BadRequestException("Something went wrong");
      }
    });
  }

  async fundCard(
    companyId: string,
    cardId: string,
    amount: number,
    customerId: string
  ): Promise<{ status: string; message: string }> {
    return CardModel.operation(async (prisma) => {
      // Fetch and validate the customer
      const customerResult = await CustomerModel.getOne({
        id: customerId,
        company_id: companyId,
      });
      if (customerResult.error || !customerResult.output) {
        throw new NotFoundException("Customer not found");
      }
      const customer = customerResult.output;

      // Verify that the card belongs to this customer
      const cardOwnershipResult = await CardModel.getOne({
        id: cardId,
        customer_id: customerId,
        company_id: companyId,
        status: { not: CardStatus.TERMINATED },
      });
      if (cardOwnershipResult.error) {
        throw new NotFoundException(
          "Card not found or does not belong to this customer"
        );
      }
      const card = cardOwnershipResult.output;

      if (!card) {
        throw new NotFoundException("Card not found");
      }

      if (decodeText(card.provider) !== "maplerad") {
        throw new BadRequestException("Incorrect card source");
      }

      if (card.status === CardStatus.FROZEN) {
        throw new BadRequestException("Cannot fund a frozen card");
      }

      if (amount < 1) {
        throw new BadRequestException("Minimum 1 USD required");
      }

      // Récupérer les détails de la company
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException("Company not found");
      }
      const company = companyResult.output;

      // Récupérer le wallet USD
      const usdWalletResult = await WalletModel.getOne({
        company_id: companyId,
        currency: "USD",
        active: true,
      });
      if (usdWalletResult.error || !usdWalletResult.output) {
        throw new BadRequestException("USD wallet not found");
      }
      const usdWallet = usdWalletResult.output;

      try {
        // Effectuer le transfert de fonds via Maplerad
        const transactionId = uuidv4();
        const fundResult = await mapleradUtils.fundCard(
          card.provider_card_id,
          amount
        );

        if (fundResult.error) {
          const err = fundResult.error;
          console.error("❌ Erreur funding Maplerad:", fundResult.error);

          const userLogsResult = await CustomerLogsModel.create({
            customer_id: String(customer?.id),
            customer_phone_number: String(customer?.phone),
            action: "fund-card-maplerad",
            status: "FAILED",
            log_json: {
              card_provider_id: card.provider_card_id,
              amount,
              error_message: err?.message,
              error_response_data: err?.details,
            },
            log_txt: `fund-card-maplerad error: ${customer?.phone} :: ${
              err.details
                ? JSON.stringify(err.details)
                : JSON.stringify(err.message)
            }`,
          });

          throw new BadRequestException(
            "Error funding Maplerad Card: " + fundResult.error.message
          );
        }

        const fundData = fundResult.output?.data || fundResult.output;
        console.log("📋 Réponse funding Maplerad:", fundData);

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

        // Mettre à jour le solde de la carte
        const updateResult = await CardModel.update(cardId, {
          balance: cardBalanceAfter,
        });
        if (updateResult.error) {
          throw new BadRequestException(updateResult.error.message);
        }

        // Déduire le coût du wallet USD
        const walletUpdateResult = await WalletModel.update(usdWallet.id, {
          balance: walletBalanceAfter,
        });
        if (walletUpdateResult.error) {
          throw new BadRequestException(walletUpdateResult.error.message);
        }

        // Créer l'enregistrement de transaction
        const transactionResult = await TransactionModel.create({
          category: "card",
          type: "fund",
          card_id: cardId,
          customer_id: customer.id,
          company_id: company.id,
          status: "SUCCESS",
          provider: encodeText("maplerad"),
          id: transactionId,
          card_balance_before: cardBalanceBefore,
          card_balance_after: cardBalanceAfter,
          wallet_balance_before: walletBalanceBefore,
          wallet_balance_after: walletBalanceAfter,
          amount: amount,
          currency: "USD",
          order_id: fundData?.id || fundData?._id || transactionId,
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
          message: `Card funded successfully with $${amount}`,
        };
      } catch (err: any) {
        console.error("Maplerad fundCard error:", err);

        try {
          await CustomerLogsModel.create({
            id: uuidv4(),
            customer_id: String(customer?.id),
            customer_phone_number: String(customer?.phone_number),
            action: "maplerad_card_funding",
            status: "FAILED",
            log_json: {
              card_id: cardId,
              amount: amount,
              error_message: err.message,
              error_details: err,
            },
            log_txt: `Maplerad card funding failed: ${err.message}`,
            created_at: new Date(),
          });
        } catch (logError) {
          console.error("Error logging card funding failure:", logError);
        }

        throw new BadRequestException(
          "An error occurred while funding the card. Please try again later."
        );
      }
    });
  }

  async withdrawFromCard(
    companyId: string,
    cardId: string,
    amount: number,
    customerId: string
  ): Promise<{ status: string; message: string }> {
    return CardModel.operation(async (prisma) => {
      // Fetch and validate the customer
      const customerResult = await CustomerModel.getOne({
        id: customerId,
        company_id: companyId,
      });
      if (customerResult.error || !customerResult.output) {
        throw new NotFoundException("Customer not found");
      }
      const customer = customerResult.output;

      // Verify that the card belongs to this customer
      const cardOwnershipResult = await CardModel.getOne({
        id: cardId,
        customer_id: customerId,
        company_id: companyId,
        status: { not: CardStatus.TERMINATED },
      });
      if (cardOwnershipResult.error) {
        throw new NotFoundException(
          "Card not found or does not belong to this customer"
        );
      }
      const card = cardOwnershipResult.output;

      if (!card) {
        throw new NotFoundException("Card not found");
      }

      if (decodeText(card.provider) !== "maplerad") {
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

      // Récupérer les détails de la company
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException("Company not found");
      }
      const company = companyResult.output;

      // Récupérer le wallet USD
      const usdWalletResult = await WalletModel.getOne({
        company_id: companyId,
        currency: "USD",
        active: true,
      });
      if (usdWalletResult.error || !usdWalletResult.output) {
        throw new BadRequestException("USD wallet not found");
      }
      const usdWallet = usdWalletResult.output;

      const transactionId = uuidv4();

      try {
        // Effectuer le retrait via Maplerad
        const withdrawResult = await mapleradUtils.withdrawFromCard(
          card.provider_card_id,
          amount
        );

        if (withdrawResult.error) {
          console.error("❌ Erreur retrait Maplerad:", withdrawResult.error);
          throw new BadRequestException(
            "Withdrawal error: " + withdrawResult.error.message
          );
        }

        const withdrawData =
          withdrawResult.output?.data || withdrawResult.output;
        console.log("📋 Réponse retrait Maplerad:", withdrawData);

        const walletBalanceBefore = usdWallet.balance.toNumber();
        const cardBalanceAfter = cardBalanceBefore - amount;
        const walletBalanceAfter = walletBalanceBefore + amount;

        // Mettre à jour le solde de la carte
        const updateResult = await CardModel.update(cardId, {
          balance: cardBalanceAfter,
        });
        if (updateResult.error) {
          throw new BadRequestException(updateResult.error.message);
        }

        // Ajouter les fonds au wallet USD
        const walletUpdateResult = await WalletModel.update(usdWallet.id, {
          balance: walletBalanceAfter,
        });
        if (walletUpdateResult.error) {
          throw new BadRequestException(walletUpdateResult.error.message);
        }

        // Créer l'enregistrement de transaction
        const transactionResult = await TransactionModel.create({
          category: "card",
          type: "withdraw",
          card_id: cardId,
          customer_id: customer.id,
          company_id: company.id,
          status: "SUCCESS",
          provider: encodeText("maplerad"),
          id: transactionId,
          card_balance_before: cardBalanceBefore,
          card_balance_after: cardBalanceAfter,
          wallet_balance_before: walletBalanceBefore,
          wallet_balance_after: walletBalanceAfter,
          amount: amount,
          currency: "USD",
          order_id: withdrawData?.id || withdrawData?._id || transactionId,
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
            log_txt: `Maplerad card withdrawal failed: ${err.message}`,
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
    cardId: string,
    customerId: string
  ): Promise<{ success: boolean; message: string }> {
    // Fetch and validate the customer
    const customerResult = await CustomerModel.getOne({
      id: customerId,
      company_id: companyId,
    });
    if (customerResult.error || !customerResult.output) {
      throw new NotFoundException("Customer not found");
    }
    const customer = customerResult.output;

    // Verify that the card belongs to this customer
    const cardOwnershipResult = await CardModel.getOne({
      id: cardId,
      customer_id: customerId,
      company_id: companyId,
      status: { not: CardStatus.TERMINATED },
    });
    if (cardOwnershipResult.error) {
      throw new NotFoundException(
        "Card not found or does not belong to this customer"
      );
    }
    const card = cardOwnershipResult.output;

    if (card.status === CardStatus.FROZEN) {
      throw new BadRequestException("Card is already frozen");
    }

    // Freeze the card in Maplerad
    const freezeResult = await mapleradUtils.freezeCard(card.provider_card_id);
    if (freezeResult.error) {
      throw new BadRequestException("Error freezing card in Maplerad");
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
    cardId: string,
    customerId: string
  ): Promise<{ success: boolean; message: string }> {
    // Fetch and validate the customer
    const customerResult = await CustomerModel.getOne({
      id: customerId,
      company_id: companyId,
    });
    if (customerResult.error || !customerResult.output) {
      throw new NotFoundException("Customer not found");
    }
    const customer = customerResult.output;

    // Verify that the card belongs to this customer
    const cardOwnershipResult = await CardModel.getOne({
      id: cardId,
      customer_id: customerId,
      company_id: companyId,
      status: { not: CardStatus.TERMINATED },
    });
    if (cardOwnershipResult.error) {
      throw new NotFoundException(
        "Card not found or does not belong to this customer"
      );
    }
    const card = cardOwnershipResult.output;

    if (card.status !== CardStatus.FROZEN) {
      throw new BadRequestException("Card is not frozen");
    }

    // Unfreeze the card in Maplerad
    const unfreezeResult = await mapleradUtils.unfreezeCard(
      card.provider_card_id
    );
    if (unfreezeResult.error) {
      throw new BadRequestException("Error unfreezing card in Maplerad");
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

  async findAllByCompany(companyId: string): Promise<CardResponseDto[]> {
    const cardsResult = await CardModel.get({
      company_id: companyId,
      provider: encodeText("maplerad"),
    });
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

    let cardMapleradData: any;
    let cardData: any = card;

    if (String(reveal) === "true") {
      if (card.cvv?.startsWith("***")) {
        // Récupérer les détails de la carte depuis Maplerad
        const cardMapleradResult =
          await mapleradUtils.getCardDetailsFromMaplerad(card.provider_card_id);

        if (cardMapleradResult.error) {
          console.error(
            "❌ Erreur récupération carte Maplerad:",
            cardMapleradResult.error
          );
        }

        cardMapleradData =
          cardMapleradResult.output?.data || cardMapleradResult.output;

        cardData = {
          ...cardData,
          number: cardMapleradData?.number,
          cvv: cardMapleradData?.cvv,
        };

        if (cardData?.cvv) {
          const tokenCardNumber = `tkMplr_${signToken(cardData?.number)}`;
          const tokenCardCvv = `tkMplr_${signToken(cardData?.cvv)}`;
          const updatedCardResult = await CardModel.update(card.id, {
            number: tokenCardNumber,
            cvv: tokenCardCvv,
          });
        }
      } else if (card.cvv?.startsWith("tkMplr_")) {
        const decodedTokenCardNumber = decodeToken(
          card.number.replace(/^tkMplr_/, "")
        )?.value;
        const decodedTokenCardCvv = decodeToken(
          card.cvv.replace(/^tkMplr_/, "")
        )?.value;

        cardData = {
          ...cardData,
          number: decodedTokenCardNumber,
          cvv: decodedTokenCardCvv,
        };
      }
    }

    return this.mapToResponseDto(cardData);
  }

  async getTransactions(
    companyId: string,
    cardId: string
  ): Promise<TransactionResponseDto[]> {
    // Vérifier que la carte appartient à la company
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
      created_at: transaction.createdAt,
    }));
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
