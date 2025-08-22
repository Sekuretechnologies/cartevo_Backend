# WAVLET API - Project Summary

## Overview

**WAVLET API** is a comprehensive Virtual Card Issuance Platform built with NestJS, Prisma, and PostgreSQL. This enterprise-grade platform enables complete company onboarding, detailed customer management, and sophisticated virtual card operations with advanced pricing models, fund rates, and comprehensive transaction tracking.

## Technology Stack

- **Backend Framework**: NestJS (Node.js)
- **Database ORM**: Prisma
- **Database**: PostgreSQL (Neon Cloud)
- **Authentication**: JWT with Passport
- **Validation**: class-validator & class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Package Manager**: npm

## Key Features

### 🏢 Complete Company Onboarding

- Full company registration with owner user creation
- Automatic role assignment and client credential generation
- Multi-currency wallet setup (XAF, USD) with configurable starting balances
- Company-specific card pricing and fund rate configuration

### 👥 Comprehensive Customer Management

- Detailed customer profiles with full KYC information
- Address verification with street, city, state, postal code
- Multiple identification types (NIN, Passport, Voter's Card, Driver's License)
- Photo and document upload capabilities
- Phone number with country code validation

### 💳 Advanced Card Operations

- Card creation with configurable pricing fees
- Fund rate system with configurable rates (e.g., 2% fee)
- Automatic 16-digit card number generation with proper masking
- Complete lifecycle: Create, fund, freeze, unfreeze, terminate with balance return

### 📊 Sophisticated Transaction Tracking

- Complete before/after balance tracking for both cards and wallets
- Transaction types: CREATE, FUND, WITHDRAW, FREEZE, TERMINATE
- Reference ID generation for audit trails
- Real-time balance updates across all operations

## API Endpoints Documentation

### Base URL

- **Development**: `http://localhost:3001/api/v1`
- **Documentation**: `http://localhost:3001/docs`

### Authentication Required

All endpoints except `/auth/token`, `/auth/login`, `/auth/verify-otp`, `/users/register`, and `/company/register` require Bearer token authentication.

---

## 🔐 Authentication Endpoints

### Generate Access Token (Business API)

- **Endpoint**: `POST /api/v1/auth/token`
- **Description**: Generate a Bearer token using business client credentials for API access
- **Authentication**: None required
- **Request Body**:
  ```json
  {
    "client_id": "demo_client_001",
    "client_key": "demo_client_key_123"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 86400
  }
  ```

### User Login

- **Endpoint**: `POST /api/v1/auth/login`
- **Description**: Authenticate user with email and password, then send OTP for verification
- **Authentication**: None required
- **Request Body**:
  ```json
  {
    "email": "user@company.com",
    "password": "SecurePass123!"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "OTP sent to user email",
    "requires_otp": true
  }
  ```

### Verify OTP

- **Endpoint**: `POST /api/v1/auth/verify-otp`
- **Description**: Verify OTP and complete login process
- **Authentication**: None required
- **Request Body**:
  ```json
  {
    "email": "user@company.com",
    "otp": "123456"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      /* user object */
    },
    "company": {
      /* company object */
    }
  }
  ```

---

## 🏢 Company Management Endpoints

### Step 1: Register Personal Information

- **Endpoint**: `POST /api/v1/company/register/step1`
- **Description**: Register personal information and create company with basic details. This is the first step of the 2-step registration process
- **Authentication**: None required
- **Content-Type**: `multipart/form-data`
- **Request Body** (Form Data):

  ```
  company_name: "Acme Corporation"
  first_name: "John"
  last_name: "Doe"
  role: "CEO"
  phone_number: "+237123456789"
  gender: "Male"
  nationality: "Cameroonian"
  id_document_type: "NIN"
  id_number: "123456789"
  country_of_residence: "Cameroon"
  state: "Centre"
  city: "Yaoundé"
  street: "123 Main Street"
  postal_code: "12345"
  email: "john.doe@example.com"
  password: "SecurePass123!"
  confirm_password: "SecurePass123!"

  // File uploads (optional)
  id_document_front: [File] // ID document front image
  id_document_back: [File]  // ID document back image
  proof_of_address: [File]  // Proof of address document
  ```

- **Response**:
  ```json
  {
    "success": true,
    "message": "Informations personnelles enregistrées avec succès. Veuillez procéder à l'étape 2.",
    "company_id": "company-uuid",
    "company_name": "Acme Corporation",
    "user_id": "user-uuid",
    "user_name": "John Doe",
    "user_email": "john.doe@example.com",
    "next_step": 2
  }
  ```
- **Error Response (User Exists)**:
  ```json
  {
    "success": false,
    "message": "Cet utilisateur existe déjà et appartient à une entreprise en cours d'enregistrement. Veuillez compléter les informations de l'entreprise existante.",
    "user_exists": true,
    "company_id": "existing-company-uuid",
    "company_name": "Existing Company",
    "company_step": 1,
    "action_required": "complete_step_2"
  }
  ```

### Step 2: Complete Business Information

- **Endpoint**: `POST /api/v1/company/register/step2`
- **Description**: Complete the company registration by providing business information. This is the second step of the 2-step registration process
- **Authentication**: None required
- **Content-Type**: `multipart/form-data`
- **Request Body** (Form Data):

  ```
  company_id: "company-uuid"
  business_name: "Acme Corporation Ltd"
  business_phone_number: "+237123456789"
  business_address: "123 Business Street, Yaoundé"
  business_type: "Technology"
  country_of_operation: "Cameroon"
  tax_id_number: "TAX123456789"
  business_website: "https://acme.com"
  business_description: "Technology company providing software solutions"
  source_of_funds: "Investment"

  // File uploads (optional)
  share_holding_document: [File]    // Share holding document
  incorporation_certificate: [File] // Incorporation certificate
  proof_of_address: [File]         // Business proof of address
  memart: [File]                   // MEMART document
  ```

- **Response**:
  ```json
  {
    "success": true,
    "message": "Informations de l'entreprise complétées avec succès. Vous pouvez maintenant vous connecter.",
    "company_id": "company-uuid",
    "company_name": "Acme Corporation Ltd",
    "user_id": "user-uuid",
    "user_name": "John Doe",
    "user_email": "john.doe@example.com",
    "next_step": "login"
  }
  ```

### Register Company and Owner User (Legacy)

- **Endpoint**: `POST /api/v1/company/register`
- **Description**: Register a new company and its first user (assigned the "owner" role), generate client credentials, and create default wallets. This is the legacy single-step registration
- **Authentication**: None required
- **Request Body**:
  ```json
  {
    "full_name_user": "John Doe",
    "email_user": "john.doe@company.com",
    "password_user": "SecurePass123!",
    "name_company": "Acme Corporation",
    "country_company": "Cameroon",
    "email_company": "company@acme.com"
  }
  ```
- **Response**:
  ```json
  {
    "status": true,
    "message": "Company and owner user created successfully",
    "user": {
      /* user object */
    },
    "company": {
      /* company object with client credentials */
    },
    "wallets": [
      /* array of created wallets */
    ]
  }
  ```

### Get Company Wallets

- **Endpoint**: `GET /api/v1/company/wallets`
- **Description**: Get all active wallets for the authenticated company
- **Authentication**: Bearer token required
- **Response**:
  ```json
  [
    {
      "id": "wallet_id",
      "balance": 50000.0,
      "active": true,
      "currency": "USD",
      "country": "USA",
      "country_iso_code": "US",
      "company_id": "company_id",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
  ```

---

## 👥 Customer Management Endpoints

### Register New Customer

- **Endpoint**: `POST /api/v1/customers`
- **Description**: Register a new customer under the business account with full KYC information
- **Authentication**: Bearer token required
- **Request Body**:
  ```json
  {
    "first_name": "John",
    "last_name": "Doe",
    "country": "Nigeria",
    "email": "john.doe@example.com",
    "street": "123 Main Street",
    "city": "Lagos",
    "state": "Lagos State",
    "postal_code": "100001",
    "country_iso_code": "+234",
    "phone_number": "8012345678",
    "identification_number": "12345678901",
    "id_document_type": "NIN",
    "image": "https://example.com/images/id.jpg",
    "photo": "https://example.com/images/photo.jpg",
    "number": "ABC123456",
    "date_of_birth": "1990-01-15"
  }
  ```
- **Response**: Customer object with all provided information

### List All Customers

- **Endpoint**: `GET /api/v1/customers`
- **Description**: Retrieve all customers registered under the business
- **Authentication**: Bearer token required
- **Response**: Array of customer objects

### Get Customer Details

- **Endpoint**: `GET /api/v1/customers/{id}`
- **Description**: Retrieve details of a specific customer
- **Authentication**: Bearer token required
- **Parameters**:
  - `id` (path): Customer ID
- **Response**: Customer object with full details

---

## 💳 Card Management Endpoints

### Create Virtual Card

- **Endpoint**: `POST /api/v1/cards`
- **Description**: Issue a new virtual card for a registered customer. Card creation costs the company the card_price from their USD wallet
- **Authentication**: Bearer token required
- **Request Body**:
  ```json
  {
    "customer_id": "customer_id",
    "amount": 100.0,
    "name_on_card": "John Doe",
    "brand": "VISA"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "message": "Card created successfully",
    "card": {
      "id": "card_id",
      "customer_id": "customer_id",
      "status": "ACTIVE",
      "balance": 0.0,
      "number": "4***-****-****-1234",
      "created_at": "2024-01-01T00:00:00Z",
      "customer": {
        /* customer object */
      }
    }
  }
  ```

### List All Cards

- **Endpoint**: `GET /api/v1/cards`
- **Description**: Retrieve all cards issued by the company
- **Authentication**: Bearer token required
- **Response**: Array of card objects

### Get Card Details

- **Endpoint**: `GET /api/v1/cards/{id}`
- **Description**: Get detailed info for a single card including CVV and full card number
- **Authentication**: Bearer token required
- **Parameters**:
  - `id` (path): Card ID
- **Response**: Complete card object with sensitive information

### Fund Card

- **Endpoint**: `POST /api/v1/cards/{id}/fund`
- **Description**: Add funds to a card from the company USD wallet. The actual cost is amount × card_fund_rate
- **Authentication**: Bearer token required
- **Parameters**:
  - `id` (path): Card ID
- **Request Body**:
  ```json
  {
    "amount": 100.5
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "status": "success",
    "message": "Card funded successfully",
    "data": {
      /* transaction details */
    }
  }
  ```

### Withdraw from Card

- **Endpoint**: `POST /api/v1/cards/{id}/withdraw`
- **Description**: Withdraw funds from a card back to company USD wallet
- **Authentication**: Bearer token required
- **Parameters**:
  - `id` (path): Card ID
- **Request Body**:
  ```json
  {
    "amount": 50.25
  }
  ```
- **Response**: Success response with transaction details

### Freeze Card

- **Endpoint**: `POST /api/v1/cards/{id}/freeze`
- **Description**: Freeze a card to prevent transactions
- **Authentication**: Bearer token required
- **Parameters**:
  - `id` (path): Card ID
- **Response**: Success response

### Unfreeze Card

- **Endpoint**: `POST /api/v1/cards/{id}/unfreeze`
- **Description**: Unfreeze a card to allow transactions
- **Authentication**: Bearer token required
- **Parameters**:
  - `id` (path): Card ID
- **Response**: Success response

### Get Card Transactions

- **Endpoint**: `GET /api/v1/cards/{id}/transactions`
- **Description**: Get all transactions for a specific card with complete audit trail
- **Authentication**: Bearer token required
- **Parameters**:
  - `id` (path): Card ID
- **Response**:
  ```json
  [
    {
      "id": "transaction_id",
      "category": "CARD",
      "type": "FUND",
      "id_card": "card_id",
      "card_balance_before": 0.0,
      "card_balance_after": 100.0,
      "wallet_balance_before": 50000.0,
      "wallet_balance_after": 49898.0,
      "amount": 100.0,
      "currency": "USD",
      "status": "COMPLETED",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
  ```

---

## 👤 User Management Endpoints

### Create User (Owner Only)

- **Endpoint**: `POST /api/v1/users`
- **Description**: Create a new user and send invitation email. Only company owners can create users
- **Authentication**: Bearer token required (Owner role)
- **Request Body**:
  ```json
  {
    "email": "user@company.com",
    "role": "admin"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "User invitation sent successfully",
    "user": {
      /* user object */
    },
    "invitation_code": "INV_1234567890"
  }
  ```

### Complete User Registration

- **Endpoint**: `POST /api/v1/users/register`
- **Description**: Complete user registration using invitation code and set password
- **Authentication**: None required
- **Request Body**:
  ```json
  {
    "email": "user@company.com",
    "invitation_code": "INV_1234567890",
    "full_name": "John Doe",
    "password": "SecurePass123!"
  }
  ```
- **Response**: Success response

### Get Company Users

- **Endpoint**: `GET /api/v1/users`
- **Description**: Get all users in the authenticated user's company
- **Authentication**: Bearer token required
- **Response**: Array of user objects

### Update User (Owner Only)

- **Endpoint**: `PUT /api/v1/users/{id}`
- **Description**: Update user details and role. Only company owners can update users
- **Authentication**: Bearer token required (Owner role)
- **Parameters**:
  - `id` (path): User ID
- **Request Body**:
  ```json
  {
    "full_name": "John Doe",
    "role": "admin"
  }
  ```
- **Response**: Updated user object

### Delete User (Owner Only)

- **Endpoint**: `DELETE /api/v1/users/{id}`
- **Description**: Delete a user from the company. Only company owners can delete users
- **Authentication**: Bearer token required (Owner role)
- **Parameters**:
  - `id` (path): User ID
- **Response**: Success response

### Update User KYC Status

- **Endpoint**: `PATCH /api/v1/users/{userId}/kyc-status`
- **Description**: Update the KYC (Know Your Customer) status for a user
- **Authentication**: Bearer token required
- **Parameters**:
  - `userId` (path): User ID
- **Request Body**:
  ```json
  {
    "kyc_status": "APPROVED"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "KYC status updated to APPROVED successfully",
    "user_id": "user-uuid",
    "kyc_status": "APPROVED",
    "updated_at": "2024-01-01T00:00:00Z"
  }
  ```

---

## 🏢 Company Status Management Endpoints

### Update Company KYB Status

- **Endpoint**: `PATCH /api/v1/company/{companyId}/kyb-status`
- **Description**: Update the KYB (Know Your Business) status for a company
- **Authentication**: Bearer token required
- **Parameters**:
  - `companyId` (path): Company ID
- **Request Body**:
  ```json
  {
    "kyb_status": "APPROVED"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "KYB status updated to APPROVED successfully",
    "company_id": "company-uuid",
    "kyb_status": "APPROVED",
    "updated_at": "2024-01-01T00:00:00Z"
  }
  ```

---

## 🔗 Webhook Endpoints

### Sudo Webhook Handler

- **Endpoint**: `POST /webhook/sudo`
- **Description**: Handle webhooks from Sudo payment processor for card transactions and events
- **Authentication**: Webhook signature verification (internal)
- **Request Body**: Webhook payload from Sudo
- **Response**: Webhook processing confirmation

---

## Database Schema

### Core Entities

- **Company**: Companies using the API platform with multi-currency support
- **User**: Company users with role-based access control
- **Role**: System roles (owner, admin, user)
- **UserCompanyRole**: Association between users, companies, and roles
- **Wallet**: Multi-currency wallets for each company (XAF, USD, etc.)
- **Customer**: End users registered under a company
- **Card**: Virtual cards issued to customers
- **Transaction**: Transaction history for all card operations
- **Notification**: System notifications
- **SyncMetadata**: Synchronization metadata for external services

## Security Features

- **JWT Authentication**: Bearer token-based authentication with configurable expiration
- **Role-Based Access Control**: Owner, admin, and user roles with specific permissions
- **Password Security**: Complex password requirements and bcrypt hashing
- **Input Validation**: Comprehensive validation on all endpoints
- **Rate Limiting**: Built-in throttling protection
- **CORS**: Configurable cross-origin resource sharing

## Financial Operations

### Pricing Model

- **Card Creation Fee**: Configurable fee deducted from company USD wallet
- **Fund Rate**: Configurable rate applied when funding cards (e.g., 2% fee)
- **Multi-Currency Support**: XAF and USD wallets with real-time balance tracking
- **Transaction Audit**: Complete before/after balance tracking for all operations

### Transaction Types

- **CREATE**: Card creation with associated fee
- **FUND**: Adding money to card with fund rate applied
- **WITHDRAW**: Removing money from card back to wallet
- **FREEZE**: Freezing card (no balance change)
- **TERMINATE**: Card termination with balance return

## Development & Testing

### Available Scripts

- `npm run start:dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:api` - Run live API functionality test
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database with sample data

### Demo Credentials

- **Client ID**: `demo_client_001`
- **Client Key**: `demo_client_key_123`
- **Demo User Email**: `owner@demo.com`
- **Demo User Password**: `DemoPassword123!`

## Deployment

The application is configured for deployment with:

- **Docker**: Dockerfile and docker-compose.yml included
- **Fly.io**: fly.toml configuration for cloud deployment
- **GitHub Actions**: Automated deployment workflow
- **Environment Variables**: Comprehensive environment configuration

## API Documentation

Interactive API documentation is available at:

- **Swagger UI**: `/docs`
- **Alternative**: `/api-docs`

The OpenAPI specification includes complete request/response schemas, authentication requirements, and example payloads for all endpoints.

---

_This project represents an enterprise-grade virtual card issuance platform with sophisticated financial operations, comprehensive audit trails, and robust security features suitable for production use._
