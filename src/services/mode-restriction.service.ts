import { Injectable, ForbiddenException } from "@nestjs/common";

@Injectable()
export class ModeRestrictionsService {
  // Limites max par devise en préprod
  private readonly PREPROD_WALLET_LIMITS: Record<string, number> = {
    USD: 100,
    NGN: 50000,
    GHS: 500,
    XAF: 50000,
    XOF: 50000,
    GNF: 500000,
    HTG: 5000,
  };

  // Nombre max de clients autorisés en préprod
  private readonly PREPROD_MAX_CUSTOMERS = 3;

  // Montant max par transaction en préprod
  private readonly PREPROD_MAX_TRANSACTION: Record<string, number> = {
    USD: 50,
    NGN: 20000,
    GHS: 250,
    XAF: 20000,
    XOF: 20000,
  };

  /**
   * Verifier si le user peut creer un wallet
   */
  checkWalletCreation(mode: "prod" | "preprod") {
    if (mode === "preprod") {
      throw new ForbiddenException(
        "Wallet creation is not allowed in preproduction mode"
      );
    }

    return true;
  }

  /**
   * Verifie le solde max autorise
   */
  checkWalletBalance(
    mode: "prod" | "preprod",
    currency: string,
    futureBalance: number
  ) {
    console.log("currency", currency)
    console.log("mode", mode)
    console.log("futureBa")
    if (mode === "preprod") {
      const maxAllowed = this.PREPROD_WALLET_LIMITS[currency];
      if (maxAllowed === undefined) {
        throw new ForbiddenException(
          `No wallet limit defined for currency '${currency}' in preproduction mode`
        );
      }
      if (futureBalance > maxAllowed) {
        throw new ForbiddenException(
          `Wallet balance for ${currency} cannot exceed ${maxAllowed} in preproduction mode`
        );
      }
    }
    return true;
  }

  /**
   * Vérifie le montant maximum par transaction
   */
  checkMaxTransactionAmount(
    mode: "prod" | "preprod",
    amount: number,
    currency: string
  ) {
    if (mode === "preprod") {
      const maxTx = this.PREPROD_MAX_TRANSACTION[currency];
      if (maxTx === undefined) {
        throw new ForbiddenException(
          `No transaction limit defined for currency '${currency}' in preproduction mode`
        );
      }
      if (amount > maxTx) {
        throw new ForbiddenException(
          `Transaction amount for ${currency} cannot exceed ${maxTx} in preproduction mode`
        );
      }
    }
    return true;
  }

  /**
   * Vérifie si le nombre de clients dépasse la limite en préprod
   */
  checkMaxCustomers(mode: "prod" | "preprod", currentCount: number) {
    if (mode === "preprod" && currentCount >= this.PREPROD_MAX_CUSTOMERS) {
      throw new ForbiddenException(
        `Cannot create more than ${this.PREPROD_MAX_CUSTOMERS} customers in preproduction mode`
      );
    }
    return true;
  }
}
