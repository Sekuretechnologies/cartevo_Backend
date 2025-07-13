import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create default roles
  const ownerRole = await prisma.role.upsert({
    where: { name: 'owner' },
    update: {},
    create: { name: 'owner' },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: { name: 'user' },
  });

  console.log('✅ Created default roles: owner, admin, user');

  // Create sample company
  const hashedClientKey = await bcrypt.hash('demo_client_key_123', 12);

  const company = await prisma.company.upsert({
    where: { clientId: 'demo_client_001' },
    update: {},
    create: {
      name: 'Demo Company Corp',
      country: 'Cameroon',
      email: 'demo@company.com',
      clientId: 'demo_client_001',
      clientKey: hashedClientKey,
      cardPrice: 5.00, // $5 per card
      cardFundRate: 1.02, // 2% fee on funding
    },
  });

  console.log(`✅ Created company: ${company.name}`);

  // Create sample user
  const hashedPassword = await bcrypt.hash('DemoPassword123!', 12);

  const user = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: {
      fullName: 'Demo Owner',
      email: 'owner@demo.com',
      password: hashedPassword,
      companyId: company.id,
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Created user: ${user.fullName}`);

  // Assign owner role to user
  await prisma.userCompanyRole.upsert({
    where: {
      userId_companyId_roleId: {
        userId: user.id,
        companyId: company.id,
        roleId: ownerRole.id,
      }
    },
    update: {},
    create: {
      userId: user.id,
      companyId: company.id,
      roleId: ownerRole.id,
    },
  });

  console.log('✅ Assigned owner role to user');

  // Create default wallets
  const xafWallet = await prisma.wallet.create({
    data: {
      balance: 0,
      active: true,
      currency: 'XAF',
      country: 'Cameroon',
      countryIsoCode: 'CM',
      companyId: company.id,
    },
  });

  const usdWallet = await prisma.wallet.create({
    data: {
      balance: 50000, // $50,000 starting balance
      active: true,
      currency: 'USD',
      country: 'USA',
      countryIsoCode: 'USA',
      companyId: company.id,
    },
  });

  console.log(`✅ Created wallets: XAF (${xafWallet.balance}) and USD ($${usdWallet.balance})`);

  // Create sample customers
  const customer1 = await prisma.customer.upsert({
    where: {
      companyId_email: {
        companyId: company.id,
        email: 'john.doe@example.com'
      }
    },
    update: {},
    create: {
      companyId: company.id,
      firstName: 'John',
      lastName: 'Doe',
      country: 'Nigeria',
      email: 'john.doe@example.com',
      street: '123 Main Street',
      city: 'Lagos',
      state: 'Lagos State',
      postalCode: '100001',
      phoneCountryCode: '+234',
      phoneNumber: '8012345678',
      identificationNumber: '12345678901',
      type: 'NIN',
      number: 'ID001',
      dob: new Date('1990-01-15'),
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: {
      companyId_email: {
        companyId: company.id,
        email: 'jane.smith@example.com'
      }
    },
    update: {},
    create: {
      companyId: company.id,
      firstName: 'Jane',
      lastName: 'Smith',
      country: 'Nigeria',
      email: 'jane.smith@example.com',
      street: '456 Oak Avenue',
      city: 'Abuja',
      state: 'FCT',
      postalCode: '900001',
      phoneCountryCode: '+234',
      phoneNumber: '8087654321',
      identificationNumber: '98765432109',
      type: 'PASSPORT',
      number: 'ID002',
      dob: new Date('1985-05-20'),
    },
  });

  console.log(`✅ Created customers: ${customer1.firstName} ${customer1.lastName}, ${customer2.firstName} ${customer2.lastName}`);

  console.log('🎉 Database seeding completed!');
  console.log('\n📋 Demo Credentials:');
  console.log('Client ID: demo_client_001');
  console.log('Client Key: demo_client_key_123');
  console.log('\n🔗 Use these credentials to get a Bearer token from /api/v1/auth/token');
  console.log('\n👤 Demo User Login:');
  console.log('Email: owner@demo.com');
  console.log('Password: DemoPassword123!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
