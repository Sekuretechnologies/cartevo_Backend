import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CardStatus, TransactionType } from '@prisma/client';
import {
  CreateCardDto,
  FundCardDto,
  WithdrawCardDto,
  CardResponseDto,
  CreateCardResponseDto,
  TransactionResponseDto
} from './dto/card.dto';

@Injectable()
export class CardService {
  constructor(private prisma: PrismaService) {}

  async createCard(companyId: string, createCardDto: CreateCardDto): Promise<CreateCardResponseDto> {
    return this.prisma.$transaction(async (prisma) => {
      // Verify customer belongs to company
      const customer = await prisma.customer.findFirst({
        where: {
          id: createCardDto.customer_id,
          companyId,
          isActive: true,
        },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      // Get company details including card price
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      // Get USD wallet for funding
      const usdWallet = await prisma.wallet.findFirst({
        where: {
          companyId,
          currency: 'USD',
          active: true,
        },
      });

      if (!usdWallet) {
        throw new BadRequestException('USD wallet not found');
      }

      const cardPrice = company.cardPrice.toNumber();
      const walletBalanceBefore = usdWallet.balance.toNumber();

      // Check if company has sufficient balance for card creation
      if (walletBalanceBefore < cardPrice) {
        throw new BadRequestException('Insufficient wallet balance to create card');
      }

      // Generate card number
      const cardNumber = this.generateCardNumber();

      // Create the card
      const card = await prisma.card.create({
        data: {
          companyId,
          customerId: createCardDto.customer_id,
          status: CardStatus.ACTIVE,
          balance: 0, // Card starts with 0 balance
          number: cardNumber,
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Deduct card price from USD wallet
      const walletBalanceAfter = walletBalanceBefore - cardPrice;
      await prisma.wallet.update({
        where: { id: usdWallet.id },
        data: { balance: walletBalanceAfter },
      });

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          type: TransactionType.CREATE,
          idCard: card.id,
          cardBalanceBefore: 0,
          cardBalanceAfter: 0,
          walletBalanceBefore,
          walletBalanceAfter,
          amount: cardPrice,
          reference: `CARD_CREATE_${card.id}`,
        },
      });

      return {
        success: true,
        message: 'Card created successfully',
        card: this.mapToResponseDto(card),
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount.toNumber(),
          card_balance_before: transaction.cardBalanceBefore.toNumber(),
          card_balance_after: transaction.cardBalanceAfter.toNumber(),
          wallet_balance_before: transaction.walletBalanceBefore.toNumber(),
          wallet_balance_after: transaction.walletBalanceAfter.toNumber(),
        },
      };
    });
  }

  async fundCard(companyId: string, cardId: string, fundDto: FundCardDto): Promise<{ success: boolean; message: string }> {
    return this.prisma.$transaction(async (prisma) => {
      // Get card and verify ownership
      const card = await prisma.card.findFirst({
        where: {
          id: cardId,
          companyId,
          status: { not: CardStatus.TERMINATED },
        },
      });

      if (!card) {
        throw new NotFoundException('Card not found or terminated');
      }

      if (card.status === CardStatus.FROZEN) {
        throw new BadRequestException('Cannot fund a frozen card');
      }

      // Get company details including fund rate
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      // Get USD wallet for funding
      const usdWallet = await prisma.wallet.findFirst({
        where: {
          companyId,
          currency: 'USD',
          active: true,
        },
      });

      if (!usdWallet) {
        throw new BadRequestException('USD wallet not found');
      }

      const fundRate = company.cardFundRate.toNumber();
      const totalCost = fundDto.amount * fundRate; // Apply fund rate
      const walletBalanceBefore = usdWallet.balance.toNumber();
      const cardBalanceBefore = card.balance.toNumber();

      if (walletBalanceBefore < totalCost) {
        throw new BadRequestException('Insufficient wallet balance for funding');
      }

      const cardBalanceAfter = cardBalanceBefore + fundDto.amount;
      const walletBalanceAfter = walletBalanceBefore - totalCost;

      // Update card balance
      await prisma.card.update({
        where: { id: cardId },
        data: { balance: cardBalanceAfter },
      });

      // Deduct cost from USD wallet
      await prisma.wallet.update({
        where: { id: usdWallet.id },
        data: { balance: walletBalanceAfter },
      });

      // Create transaction record
      await prisma.transaction.create({
        data: {
          type: TransactionType.FUND,
          idCard: cardId,
          cardBalanceBefore,
          cardBalanceAfter,
          walletBalanceBefore,
          walletBalanceAfter,
          amount: fundDto.amount,
          reference: `FUND_${cardId}_${Date.now()}`,
        },
      });

      return {
        success: true,
        message: `Card funded successfully with $${fundDto.amount} (Cost: $${totalCost.toFixed(2)})`,
      };
    });
  }

  async withdrawFromCard(companyId: string, cardId: string, withdrawDto: WithdrawCardDto): Promise<{ success: boolean; message: string }> {
    return this.prisma.$transaction(async (prisma) => {
      // Get card and verify ownership
      const card = await prisma.card.findFirst({
        where: {
          id: cardId,
          companyId,
          status: { not: CardStatus.TERMINATED },
        },
      });

      if (!card) {
        throw new NotFoundException('Card not found or terminated');
      }

      if (card.status === CardStatus.FROZEN) {
        throw new BadRequestException('Cannot withdraw from a frozen card');
      }

      const cardBalanceBefore = card.balance.toNumber();

      if (cardBalanceBefore < withdrawDto.amount) {
        throw new BadRequestException('Insufficient card balance');
      }

      // Get USD wallet to add funds back
      const usdWallet = await prisma.wallet.findFirst({
        where: {
          companyId,
          currency: 'USD',
          active: true,
        },
      });

      if (!usdWallet) {
        throw new BadRequestException('USD wallet not found');
      }

      const walletBalanceBefore = usdWallet.balance.toNumber();
      const cardBalanceAfter = cardBalanceBefore - withdrawDto.amount;
      const walletBalanceAfter = walletBalanceBefore + withdrawDto.amount;

      // Update card balance
      await prisma.card.update({
        where: { id: cardId },
        data: { balance: cardBalanceAfter },
      });

      // Add funds back to USD wallet
      await prisma.wallet.update({
        where: { id: usdWallet.id },
        data: { balance: walletBalanceAfter },
      });

      // Create transaction record
      await prisma.transaction.create({
        data: {
          type: TransactionType.WITHDRAW,
          idCard: cardId,
          cardBalanceBefore,
          cardBalanceAfter,
          walletBalanceBefore,
          walletBalanceAfter,
          amount: withdrawDto.amount,
          reference: `WITHDRAW_${cardId}_${Date.now()}`,
        },
      });

      return {
        success: true,
        message: `Successfully withdrawn $${withdrawDto.amount} from card`,
      };
    });
  }

  async freezeCard(companyId: string, cardId: string): Promise<{ success: boolean; message: string }> {
    const card = await this.prisma.card.findFirst({
      where: {
        id: cardId,
        companyId,
        status: { not: CardStatus.TERMINATED },
      },
    });

    if (!card) {
      throw new NotFoundException('Card not found or terminated');
    }

    if (card.status === CardStatus.FROZEN) {
      throw new BadRequestException('Card is already frozen');
    }

    await this.prisma.card.update({
      where: { id: cardId },
      data: { status: CardStatus.FROZEN },
    });

    return {
      success: true,
      message: 'Card frozen successfully',
    };
  }

  async unfreezeCard(companyId: string, cardId: string): Promise<{ success: boolean; message: string }> {
    const card = await this.prisma.card.findFirst({
      where: {
        id: cardId,
        companyId,
        status: { not: CardStatus.TERMINATED },
      },
    });

    if (!card) {
      throw new NotFoundException('Card not found or terminated');
    }

    if (card.status !== CardStatus.FROZEN) {
      throw new BadRequestException('Card is not frozen');
    }

    await this.prisma.card.update({
      where: { id: cardId },
      data: { status: CardStatus.ACTIVE },
    });

    return {
      success: true,
      message: 'Card unfrozen successfully',
    };
  }

  async terminateCard(companyId: string, cardId: string): Promise<{ success: boolean; message: string }> {
    return this.prisma.$transaction(async (prisma) => {
      const card = await prisma.card.findFirst({
        where: {
          id: cardId,
          companyId,
          status: { not: CardStatus.TERMINATED },
        },
      });

      if (!card) {
        throw new NotFoundException('Card not found or already terminated');
      }

      const cardBalanceBefore = card.balance.toNumber();

      // Get USD wallet to return remaining balance
      const usdWallet = await prisma.wallet.findFirst({
        where: {
          companyId,
          currency: 'USD',
          active: true,
        },
      });

      if (!usdWallet) {
        throw new BadRequestException('USD wallet not found');
      }

      const walletBalanceBefore = usdWallet.balance.toNumber();
      const walletBalanceAfter = walletBalanceBefore + cardBalanceBefore;

      // Set card status to terminated and balance to 0
      await prisma.card.update({
        where: { id: cardId },
        data: {
          status: CardStatus.TERMINATED,
          balance: 0,
        },
      });

      // Return remaining balance to USD wallet
      if (cardBalanceBefore > 0) {
        await prisma.wallet.update({
          where: { id: usdWallet.id },
          data: { balance: walletBalanceAfter },
        });
      }

      // Create transaction record
      await prisma.transaction.create({
        data: {
          type: TransactionType.TERMINATE,
          idCard: cardId,
          cardBalanceBefore,
          cardBalanceAfter: 0,
          walletBalanceBefore,
          walletBalanceAfter,
          amount: cardBalanceBefore,
          reference: `TERMINATE_${cardId}_${Date.now()}`,
        },
      });

      return {
        success: true,
        message: `Card terminated successfully. Remaining balance of $${cardBalanceBefore} returned to wallet.`,
      };
    });
  }

  async findAllByCompany(companyId: string): Promise<CardResponseDto[]> {
    const cards = await this.prisma.card.findMany({
      where: { companyId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return cards.map(card => this.mapToResponseDto(card));
  }

  async findOne(companyId: string, cardId: string): Promise<CardResponseDto> {
    const card = await this.prisma.card.findFirst({
      where: {
        id: cardId,
        companyId,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return this.mapToResponseDto(card);
  }

  async getTransactions(companyId: string, cardId: string): Promise<TransactionResponseDto[]> {
    // Verify card belongs to company
    const card = await this.prisma.card.findFirst({
      where: {
        id: cardId,
        companyId,
      },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    const transactions = await this.prisma.transaction.findMany({
      where: { idCard: cardId },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      id_card: transaction.idCard,
      card_balance_before: transaction.cardBalanceBefore.toNumber(),
      card_balance_after: transaction.cardBalanceAfter.toNumber(),
      wallet_balance_before: transaction.walletBalanceBefore.toNumber(),
      wallet_balance_after: transaction.walletBalanceAfter.toNumber(),
      amount: transaction.amount.toNumber(),
      reference: transaction.reference,
      created_at: transaction.createdAt,
    }));
  }

  private generateCardNumber(): string {
    // Generate a 16-digit card number (starting with 4 for Visa-like format)
    const prefix = '4';
    const randomDigits = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join('');
    return prefix + randomDigits;
  }

  private mapToResponseDto(card: any): CardResponseDto {
    return {
      id: card.id,
      customer_id: card.customerId,
      status: card.status,
      balance: parseFloat(card.balance.toString()),
      number: this.maskCardNumber(card.number),
      created_at: card.createdAt,
      customer: card.customer ? {
        id: card.customer.id,
        first_name: card.customer.firstName,
        last_name: card.customer.lastName,
        email: card.customer.email,
      } : undefined,
    };
  }

  private maskCardNumber(cardNumber: string): string {
    return cardNumber.substring(0, 4) + '*'.repeat(8) + cardNumber.substring(12);
  }
}
