import { PrismaClient } from "@prisma/client";
import { afribapayCountries } from "../src/utils/wallet/afribapay/data";

const prisma = new PrismaClient();

async function seedWalletPhoneOperators() {
  console.log("Seeding wallet phone operators...");

  const operatorsToCreate: any[] = [];

  // Process each country
  for (const [countryCode, countryData] of Object.entries(afribapayCountries)) {
    const countryIsoCode = countryData.country_code;
    const countryPhoneCode = countryData.prefix.toString();

    // Process each currency in the country
    for (const [currency, currencyData] of Object.entries(
      countryData.currencies
    )) {
      // Process each operator
      for (const operator of currencyData.operators) {
        operatorsToCreate.push({
          country_iso_code: countryIsoCode,
          country_phone_code: countryPhoneCode,
          currency: currency,
          operator_code: operator.operator_code,
          operator_name: operator.operator_name,
          otp_required: operator.otp_required === 1,
          ussd_code: operator.ussd_code || null,
        });
      }
    }
  }

  console.log(`Found ${operatorsToCreate.length} operators to create`);

  // Clear existing data
  await prisma.walletPhoneOperator.deleteMany({});
  console.log("Cleared existing wallet phone operators");

  // Create new operators
  for (const operator of operatorsToCreate) {
    try {
      await prisma.walletPhoneOperator.create({
        data: operator,
      });
    } catch (error) {
      console.error("Error creating operator:", operator, error);
    }
  }

  console.log("Seeding completed successfully");
}

async function main() {
  try {
    await seedWalletPhoneOperators();
  } catch (error) {
    console.error("Error seeding operators:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
