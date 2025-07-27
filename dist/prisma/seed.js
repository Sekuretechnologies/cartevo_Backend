"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Starting database seeding...");
    const ownerRole = await prisma.role.upsert({
        where: { name: "owner" },
        update: {},
        create: { name: "owner" },
    });
    const adminRole = await prisma.role.upsert({
        where: { name: "admin" },
        update: {},
        create: { name: "admin" },
    });
    const userRole = await prisma.role.upsert({
        where: { name: "user" },
        update: {},
        create: { name: "user" },
    });
    console.log("✅ Created default roles: owner, admin, user");
    const hashedclient_key = await bcrypt.hash("demo_client_key_123", 12);
    const company = await prisma.company.upsert({
        where: { client_id: "demo_client_001" },
        update: {},
        create: {
            name: "Demo Company Corp",
            country: "Cameroon",
            email: "demo@company.com",
            client_id: "demo_client_001",
            client_key: hashedclient_key,
            card_price: 5.0,
            card_fund_rate: 1.02,
        },
    });
    console.log(`✅ Created company: ${company.name}`);
    const hashedPassword = await bcrypt.hash("DemoPassword123!", 12);
    const user = await prisma.user.upsert({
        where: { email: "owner@demo.com" },
        update: {},
        create: {
            full_name: "Demo Owner",
            email: "owner@demo.com",
            password: hashedPassword,
            company_id: company.id,
            status: "ACTIVE",
        },
    });
    console.log(`✅ Created user: ${user.full_name}`);
    await prisma.userCompanyRole.upsert({
        where: {
            user_id_company_id_role_id: {
                user_id: user.id,
                company_id: company.id,
                role_id: ownerRole.id,
            },
        },
        update: {},
        create: {
            user_id: user.id,
            company_id: company.id,
            role_id: ownerRole.id,
        },
    });
    console.log("✅ Assigned owner role to user");
    const xafWallet = await prisma.wallet.create({
        data: {
            balance: 0,
            active: true,
            currency: "XAF",
            country: "Cameroon",
            country_iso_code: "CM",
            company_id: company.id,
        },
    });
    const usdWallet = await prisma.wallet.create({
        data: {
            balance: 50000,
            active: true,
            currency: "USD",
            country: "USA",
            country_iso_code: "USA",
            company_id: company.id,
        },
    });
    console.log(`✅ Created wallets: XAF (${xafWallet.balance}) and USD ($${usdWallet.balance})`);
    const customerA = await prisma.customer.upsert({
        where: {
            company_id_email: {
                company_id: company.id,
                email: "alice.brown@example.com",
            },
        },
        update: {},
        create: {
            company_id: company.id,
            first_name: "Alice",
            last_name: "Brown",
            country: "Ghana",
            email: "alice.brown@example.com",
            street: "789 Pine Road",
            city: "Accra",
            state: "Greater Accra",
            postal_code: "00233",
            country_iso_code: "GH",
            country_phone_code: "+233",
            phone_number: "241234567",
            identification_number: "GH1234567",
            id_document_type: "VOTER_ID",
            id_document_front: "alice_voter_front.png",
            id_document_back: "alice_voter_back.png",
            date_of_birth: new Date("1992-03-10"),
        },
    });
    const customerB = await prisma.customer.upsert({
        where: {
            company_id_email: {
                company_id: company.id,
                email: "bob.martin@example.com",
            },
        },
        update: {},
        create: {
            company_id: company.id,
            first_name: "Bob",
            last_name: "Martin",
            country: "Kenya",
            email: "bob.martin@example.com",
            street: "321 Cedar Lane",
            city: "Nairobi",
            state: "Nairobi County",
            postal_code: "00100",
            country_iso_code: "KE",
            country_phone_code: "+254",
            phone_number: "701234567",
            identification_number: "KE7654321",
            id_document_type: "NATIONAL_ID",
            id_document_front: "bob_national_front.png",
            id_document_back: "bob_national_back.png",
            date_of_birth: new Date("1988-07-25"),
        },
    });
    console.log(`✅ Created additional customers: ${customerA.first_name} ${customerA.last_name}, ${customerB.first_name} ${customerB.last_name}`);
    console.log("🎉 Database seeding completed!");
    console.log("\n📋 Demo Credentials:");
    console.log("Client ID: demo_client_001");
    console.log("Client Key: demo_client_key_123");
    console.log("\n🔗 Use these credentials to get a Bearer token from /api/v1/auth/token");
    console.log("\n👤 Demo User Login:");
    console.log("Email: owner@demo.com");
    console.log("Password: DemoPassword123!");
}
main()
    .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map