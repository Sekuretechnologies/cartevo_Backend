"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let CardService = class CardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCard(companyId, createCardDto) {
        return this.prisma.$transaction(async (prisma) => {
            const customer = await prisma.customer.findFirst({
                where: {
                    id: createCardDto.customer_id,
                    companyId,
                    isActive: true,
                },
            });
            if (!customer) {
                throw new common_1.NotFoundException('Customer not found');
            }
            const company = await prisma.company.findUnique({
                where: { id: companyId },
            });
            if (!company) {
                throw new common_1.NotFoundException('Company not found');
            }
            const usdWallet = await prisma.wallet.findFirst({
                where: {
                    companyId,
                    currency: 'USD',
                    active: true,
                },
            });
            if (!usdWallet) {
                throw new common_1.BadRequestException('USD wallet not found');
            }
            const cardPrice = company.cardPrice.toNumber();
            const walletBalanceBefore = usdWallet.balance.toNumber();
            if (walletBalanceBefore < cardPrice) {
                throw new common_1.BadRequestException('Insufficient wallet balance to create card');
            }
            const cardNumber = this.generateCardNumber();
            const card = await prisma.card.create({
                data: {
                    companyId,
                    customerId: createCardDto.customer_id,
                    status: client_1.CardStatus.ACTIVE,
                    balance: 0,
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
            const walletBalanceAfter = walletBalanceBefore - cardPrice;
            await prisma.wallet.update({
                where: { id: usdWallet.id },
                data: { balance: walletBalanceAfter },
            });
            const transaction = await prisma.transaction.create({
                data: {
                    type: client_1.TransactionType.CREATE,
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
    async fundCard(companyId, cardId, fundDto) {
        return this.prisma.$transaction(async (prisma) => {
            const card = await prisma.card.findFirst({
                where: {
                    id: cardId,
                    companyId,
                    status: { not: client_1.CardStatus.TERMINATED },
                },
            });
            if (!card) {
                throw new common_1.NotFoundException('Card not found or terminated');
            }
            if (card.status === client_1.CardStatus.FROZEN) {
                throw new common_1.BadRequestException('Cannot fund a frozen card');
            }
            const company = await prisma.company.findUnique({
                where: { id: companyId },
            });
            if (!company) {
                throw new common_1.NotFoundException('Company not found');
            }
            const usdWallet = await prisma.wallet.findFirst({
                where: {
                    companyId,
                    currency: 'USD',
                    active: true,
                },
            });
            if (!usdWallet) {
                throw new common_1.BadRequestException('USD wallet not found');
            }
            const fundRate = company.cardFundRate.toNumber();
            const totalCost = fundDto.amount * fundRate;
            const walletBalanceBefore = usdWallet.balance.toNumber();
            const cardBalanceBefore = card.balance.toNumber();
            if (walletBalanceBefore < totalCost) {
                throw new common_1.BadRequestException('Insufficient wallet balance for funding');
            }
            const cardBalanceAfter = cardBalanceBefore + fundDto.amount;
            const walletBalanceAfter = walletBalanceBefore - totalCost;
            await prisma.card.update({
                where: { id: cardId },
                data: { balance: cardBalanceAfter },
            });
            await prisma.wallet.update({
                where: { id: usdWallet.id },
                data: { balance: walletBalanceAfter },
            });
            await prisma.transaction.create({
                data: {
                    type: client_1.TransactionType.FUND,
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
    async withdrawFromCard(companyId, cardId, withdrawDto) {
        return this.prisma.$transaction(async (prisma) => {
            const card = await prisma.card.findFirst({
                where: {
                    id: cardId,
                    companyId,
                    status: { not: client_1.CardStatus.TERMINATED },
                },
            });
            if (!card) {
                throw new common_1.NotFoundException('Card not found or terminated');
            }
            if (card.status === client_1.CardStatus.FROZEN) {
                throw new common_1.BadRequestException('Cannot withdraw from a frozen card');
            }
            const cardBalanceBefore = card.balance.toNumber();
            if (cardBalanceBefore < withdrawDto.amount) {
                throw new common_1.BadRequestException('Insufficient card balance');
            }
            const usdWallet = await prisma.wallet.findFirst({
                where: {
                    companyId,
                    currency: 'USD',
                    active: true,
                },
            });
            if (!usdWallet) {
                throw new common_1.BadRequestException('USD wallet not found');
            }
            const walletBalanceBefore = usdWallet.balance.toNumber();
            const cardBalanceAfter = cardBalanceBefore - withdrawDto.amount;
            const walletBalanceAfter = walletBalanceBefore + withdrawDto.amount;
            await prisma.card.update({
                where: { id: cardId },
                data: { balance: cardBalanceAfter },
            });
            await prisma.wallet.update({
                where: { id: usdWallet.id },
                data: { balance: walletBalanceAfter },
            });
            await prisma.transaction.create({
                data: {
                    type: client_1.TransactionType.WITHDRAW,
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
    async freezeCard(companyId, cardId) {
        const card = await this.prisma.card.findFirst({
            where: {
                id: cardId,
                companyId,
                status: { not: client_1.CardStatus.TERMINATED },
            },
        });
        if (!card) {
            throw new common_1.NotFoundException('Card not found or terminated');
        }
        if (card.status === client_1.CardStatus.FROZEN) {
            throw new common_1.BadRequestException('Card is already frozen');
        }
        await this.prisma.card.update({
            where: { id: cardId },
            data: { status: client_1.CardStatus.FROZEN },
        });
        return {
            success: true,
            message: 'Card frozen successfully',
        };
    }
    async unfreezeCard(companyId, cardId) {
        const card = await this.prisma.card.findFirst({
            where: {
                id: cardId,
                companyId,
                status: { not: client_1.CardStatus.TERMINATED },
            },
        });
        if (!card) {
            throw new common_1.NotFoundException('Card not found or terminated');
        }
        if (card.status !== client_1.CardStatus.FROZEN) {
            throw new common_1.BadRequestException('Card is not frozen');
        }
        await this.prisma.card.update({
            where: { id: cardId },
            data: { status: client_1.CardStatus.ACTIVE },
        });
        return {
            success: true,
            message: 'Card unfrozen successfully',
        };
    }
    async terminateCard(companyId, cardId) {
        return this.prisma.$transaction(async (prisma) => {
            const card = await prisma.card.findFirst({
                where: {
                    id: cardId,
                    companyId,
                    status: { not: client_1.CardStatus.TERMINATED },
                },
            });
            if (!card) {
                throw new common_1.NotFoundException('Card not found or already terminated');
            }
            const cardBalanceBefore = card.balance.toNumber();
            const usdWallet = await prisma.wallet.findFirst({
                where: {
                    companyId,
                    currency: 'USD',
                    active: true,
                },
            });
            if (!usdWallet) {
                throw new common_1.BadRequestException('USD wallet not found');
            }
            const walletBalanceBefore = usdWallet.balance.toNumber();
            const walletBalanceAfter = walletBalanceBefore + cardBalanceBefore;
            await prisma.card.update({
                where: { id: cardId },
                data: {
                    status: client_1.CardStatus.TERMINATED,
                    balance: 0,
                },
            });
            if (cardBalanceBefore > 0) {
                await prisma.wallet.update({
                    where: { id: usdWallet.id },
                    data: { balance: walletBalanceAfter },
                });
            }
            await prisma.transaction.create({
                data: {
                    type: client_1.TransactionType.TERMINATE,
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
    async findAllByCompany(companyId) {
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
    async findOne(companyId, cardId) {
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
            throw new common_1.NotFoundException('Card not found');
        }
        return this.mapToResponseDto(card);
    }
    async getTransactions(companyId, cardId) {
        const card = await this.prisma.card.findFirst({
            where: {
                id: cardId,
                companyId,
            },
        });
        if (!card) {
            throw new common_1.NotFoundException('Card not found');
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
    generateCardNumber() {
        const prefix = '4';
        const randomDigits = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join('');
        return prefix + randomDigits;
    }
    mapToResponseDto(card) {
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
    maskCardNumber(cardNumber) {
        return cardNumber.substring(0, 4) + '*'.repeat(8) + cardNumber.substring(12);
    }
};
exports.CardService = CardService;
exports.CardService = CardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CardService);
//# sourceMappingURL=card.service.js.map