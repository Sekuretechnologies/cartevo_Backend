import env from "@/env";

const getCardFees = () => {
  return {
    firstCard: Number(env.SUDO_FIRST_CARD_CREATION_FEES || 0) * 1,
    additionalCard: Number(env.SUDO_CARD_CREATION_FEES || 0) * 1,
    fundingFees: Number(env.SUDO_DOLLARS_FEES || 0) * 1,
    withdrawFees: Number(env.SUDO_CARD_WITHDRAW_FEES || 0) * 1,
  };
};

export default getCardFees;
