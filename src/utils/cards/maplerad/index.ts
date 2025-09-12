import mapleradCardUtils from "./card";
import mapleradCardTransactionUtils from "./card-transaction";

const mapleradUtils = {
  // Customer operations
  createCustomer: mapleradCardUtils.createCustomer,

  // Card operations
  createCard: mapleradCardUtils.createCard,
  createCardSimple: mapleradCardUtils.createCardSimple,
  getCard: mapleradCardUtils.getCard,
  getCardDetailsFromMaplerad: mapleradCardUtils.getCardDetailsFromMaplerad,
  getRealCardBalance: mapleradCardUtils.getRealCardBalance,
  getCardStatus: mapleradCardUtils.getCardStatus,
  terminateCard: mapleradCardUtils.terminateCard,
  disableCard: mapleradCardUtils.disableCard,
  enableCard: mapleradCardUtils.enableCard,
  freezeCard: mapleradCardUtils.freezeCard,
  unfreezeCard: mapleradCardUtils.unfreezeCard,
  getCustomerCards: mapleradCardUtils.getCustomerCards,

  // Card decline charges
  getCardDeclineCharges: mapleradCardUtils.getCardDeclineCharges,

  // Card details mapping
  mapMapleradCardDetailsToResponse:
    mapleradCardUtils.mapMapleradCardDetailsToResponse,

  // Transaction operations
  fundCard: mapleradCardTransactionUtils.fundCard,
  withdrawFromCard: mapleradCardTransactionUtils.withdrawFromCard,
  getCardTransactions: mapleradCardTransactionUtils.getCardTransactions,
  getOneTransaction: mapleradCardTransactionUtils.getOneTransaction,
  getCardTransactionsFromMaplerad:
    mapleradCardTransactionUtils.getCardTransactionsFromMaplerad,
};

export default mapleradUtils;
