# Enhanced Virtual Card Platform

A comprehensive Virtual Card Issuance Platform built with NestJS, Prisma, and PostgreSQL. This platform enables complete company onboarding, detailed customer management, and sophisticated virtual card operations with pricing models, fund rates, and comprehensive transaction tracking.

## 🚀 Enhanced Features

### 🏢 **Complete Company Onboarding**
- Full company registration with owner user creation
- Automatic role assignment and client credential generation
- Multi-currency wallet setup (XAF, USD) with configurable starting balances
- Company-specific card pricing and fund rate configuration

### 👥 **Comprehensive Customer Management**
- Detailed customer profiles with full KYC information
- Address verification with street, city, state, postal code
- Multiple identification types (NIN, Passport, Voter's Card, Driver's License)
- Photo and document upload capabilities
- Phone number with country code validation

### 💳 **Advanced Card Operations**
- **Card Creation with Pricing**: Each card creation costs the company a configurable fee
- **Fund Rate System**: Card funding applies a configurable rate (e.g., 2% fee)
- **Automatic Card Number Generation**: 16-digit card numbers with proper masking
- **Comprehensive Lifecycle**: Create, fund, freeze, unfreeze, terminate with balance return

### 📊 **Sophisticated Transaction Tracking**
- Complete before/after balance tracking for both cards and wallets
- Transaction types: CREATE, FUND, WITHDRAW, FREEZE, TERMINATE
- Reference ID generation for audit trails
- Real-time balance updates across all operations

### 🔐 **Security & Authentication**
- Bearer token-based authentication with JWT
- Role-based access control (owner, admin, user)
- Password complexity validation
- Client credential management

### 💰 **Financial Management**
- Multi-currency wallet support
- Real-time balance tracking
- Transaction cost calculation
- Automatic fund return on card termination

## 🛠️ Technology Stack

- **Backend Framework**: NestJS
- **Database ORM**: Prisma
- **Database**: PostgreSQL (Neon Cloud)
- **Authentication**: JWT with Passport
- **Validation**: class-validator & class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Package Manager**: npm

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

## ⚡ Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd virtual-card-api

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment variables
cp .env.example .env

# Edit .env file with your configuration
```

Required environment variables:

```env
DATABASE_URL="postgresql://neondb_owner:npg_XD2IYLhRK1rj@ep-flat-thunder-abe97lbu-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="24h"
PORT=3000
NODE_ENV="development"
```

> **Note**: The API is currently configured to use a Neon PostgreSQL cloud database. For local development, replace the DATABASE_URL with your own PostgreSQL instance.

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database with sample data
npm run prisma:seed
```

### 4. Start the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`

API Documentation: `http://localhost:3000/docs`

## 🔐 Authentication

All API endpoints (except `/auth/token`) require Bearer token authentication.

### Get Access Token

```bash
POST /api/v1/auth/token
Content-Type: application/json

{
  "client_id": "demo_client_001",
  "client_key": "demo_client_key_123"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

### Using the Token

Include the token in the Authorization header:

```bash
Authorization: Bearer <your-access-token>
```

## 📚 API Endpoints

### Company Registration
- `POST /api/v1/company/register` - Register new company with owner user

### Authentication
- `POST /api/v1/auth/token` - Generate access token

### Company Management
- `GET /api/v1/company/wallets` - Get company wallets

### Customers
- `POST /api/v1/customers` - Register new customer
- `GET /api/v1/customers` - List all customers
- `GET /api/v1/customers/:id` - Get customer details

### Cards
- `POST /api/v1/cards` - Create virtual card
- `GET /api/v1/cards` - List all cards
- `GET /api/v1/cards/:id` - Get card details
- `POST /api/v1/cards/:id/fund` - Fund card
- `POST /api/v1/cards/:id/withdraw` - Withdraw from card
- `POST /api/v1/cards/:id/freeze` - Freeze/unfreeze card
- `POST /api/v1/cards/:id/terminate` - Terminate card

### Transactions
- `GET /api/v1/cards/:cardId/transactions` - List card transactions
- `GET /api/v1/transactions` - List all company transactions

## 💡 Usage Examples

### 1. Register a Company and Owner User

```bash
POST /api/v1/company/register
Content-Type: application/json

{
  "full_name_user": "John Doe",
  "email_user": "john.doe@company.com",
  "password_user": "SecurePass123!",
  "name_company": "Acme Corporation",
  "country_company": "Cameroon",
  "email_company": "company@acme.com"
}
```

### 2. Register a Customer

```bash
POST /api/v1/customers
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "external_id": "CUST_001"
}
```

### 2. Create a Virtual Card

```bash
POST /api/v1/cards
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer_id": "<customer-id>",
  "card_type": "VIRTUAL",
  "currency": "USD"
}
```

### 3. Fund a Card

```bash
POST /api/v1/cards/<card-id>/fund
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100.50
}
```

### 4. Freeze a Card

```bash
POST /api/v1/cards/<card-id>/freeze
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "freeze"
}
```

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Live API functionality test
npm run test:api
```

### Test Coverage

The API includes comprehensive test coverage for:
- Authentication service and strategies
- All CRUD operations
- Error handling and validation
- End-to-end API workflows

## 📊 Database Schema

The application uses the following main entities:

- **Company**: Companies using the API platform with multi-currency support
- **User**: Company users with role-based access control
- **Role**: System roles (owner, admin, user)
- **UserCompanyRole**: Association between users, companies, and roles
- **Wallet**: Multi-currency wallets for each company (XAF, USD, etc.)
- **Customer**: End users registered under a company
- **Card**: Virtual cards issued to customers
- **Transaction**: Transaction history for all card operations

## 🔒 Security Features

- JWT-based authentication with configurable expiration
- Rate limiting with Throttler
- Input validation on all endpoints
- Secure password hashing with bcrypt
- Database transaction safety for fund operations

## 📈 Monitoring and Logging

- Structured error responses
- Request/response logging
- Database query optimization
- Performance monitoring ready

## 🚀 Deployment

### Production Build

```bash
npm run build
npm run start:prod
```

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL="<production-database-url>"
JWT_SECRET="<strong-production-secret>"
PORT=3000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions, please open an issue in the repository or contact the development team.

---

**Demo Credentials for Testing:**
- **Company Client ID**: `demo_client_001`
- **Company Client Key**: `demo_client_key_123`
- **Demo User Email**: `owner@demo.com`
- **Demo User Password**: `DemoPassword123!`

**Demo Company Features:**
- Multi-currency wallets: XAF (Cameroon) and USD (USA)
- Role-based access control (owner, admin, user)
- Pre-seeded customers for testing

Visit the API documentation at `/docs` for interactive testing and detailed endpoint information.

## 🔥 **Live Test Results**

The enhanced platform has been successfully tested with the following capabilities:

### **Company Registration**
- ✅ Created "Test Company Ltd" in Nigeria
- ✅ Generated client credentials automatically
- ✅ Set card price: $5.00, fund rate: 1.02 (2% fee)
- ✅ Auto-created XAF and USD wallets

### **Detailed Customer Management**
- ✅ Created customer "Olumide Adebayo" with full KYC data
- ✅ Nigerian address, NIN identification, phone validation
- ✅ Complete profile with DOB and identification numbers

### **Advanced Card Operations**
- ✅ Card creation deducted $5 from company USD wallet
- ✅ Funding $1,000 cost $1,020 (2% fee applied)
- ✅ Real-time balance tracking: Wallet $50,000 → $48,975
- ✅ Card balance: $0 → $1,000

### **Transaction Audit Trail**
- ✅ Complete transaction history with before/after balances
- ✅ Transaction types: CREATE ($5), FUND ($1,000)
- ✅ Wallet and card balance tracking in every transaction

The platform successfully demonstrates enterprise-grade virtual card issuance with sophisticated pricing models, comprehensive customer management, and complete financial audit trails!

## 🧪 Live API Testing

A comprehensive test script `test-api.js` is included to demonstrate all API functionality:

```bash
# Make sure the API server is running first
npm run start:dev

# In another terminal, run the complete API test suite
npm run test:api
# OR
node test-api.js
```

The test script will:
- Register a new company with owner user (Test Company Ltd)
- Authenticate with demo credentials
- Check company wallets (XAF and USD currencies)
- List existing customers (2 demo customers)
- Create a new customer (Alice Johnson)
- Issue a virtual card with auto-generated number
- Fund the card with $750 from USD wallet
- Retrieve full card details including CVV
- Freeze and unfreeze the card
- Withdraw $200 from the card back to USD wallet
- Show complete transaction history
- List all company cards

This demonstrates the complete company registration, wallet management, and card lifecycle capabilities.
