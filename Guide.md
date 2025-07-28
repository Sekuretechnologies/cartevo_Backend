# Virtual Card API Platform Guide

Welcome to the Virtual Card API Platform! This guide will help you understand how to use the API, authenticate, manage companies, customers, cards, and transactions, and leverage all the features provided by the platform.

---

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Company Management](#company-management)
- [Customer Management](#customer-management)
- [Card Operations](#card-operations)
- [Transaction Tracking](#transaction-tracking)
- [Error Handling](#error-handling)
- [OpenAPI/Swagger](#openapiswagger)
- [Usage Examples](#usage-examples)
- [FAQ](#faq)

---

## Overview
This API enables:
- Company onboarding and management
- Customer registration and KYC
- Virtual card issuance, funding, freezing, and termination
- Transaction tracking with before/after balances
- Secure, role-based access

The API is documented with OpenAPI (Swagger) and supports JWT authentication.

---

## Authentication
All endpoints (except `/auth/token`) require a Bearer token.

### Obtain Access Token
```
POST /api/v1/auth/token
Content-Type: application/json
{
  "client_id": "<your-client-id>",
  "client_key": "<your-client-key>"
}
```
**Response:**
```
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

Include the token in the `Authorization` header for all subsequent requests:
```
Authorization: Bearer <access_token>
```

---

## Company Management
- **Register Company & Owner:**
  - `POST /api/v1/company/register`
  - Registers a new company and its first user (owner role), generates credentials, and creates default wallets.
- **Get Company Wallets:**
  - `GET /api/v1/company/wallets`
  - Returns all active wallets for the authenticated company.

---

## Customer Management
- **Register Customer:**
  - `POST /api/v1/customers`
  - Registers a new customer under the business account.
- **List Customers:**
  - `GET /api/v1/customers`
- **Get Customer Details:**
  - `GET /api/v1/customers/{id}`

---

## Card Operations
- **Create Card:**
  - `POST /api/v1/cards`
  - Issues a new virtual card for a customer. Card creation costs the company the configured card price from their USD wallet.
- **List Cards:**
  - `GET /api/v1/cards`
- **Get Card Details:**
  - `GET /api/v1/cards/{id}`
- **Fund Card:**
  - `POST /api/v1/cards/{id}/fund`
  - Adds funds to a card from the company USD wallet (applies fund rate).
- **Withdraw from Card:**
  - `POST /api/v1/cards/{id}/withdraw`
- **Freeze/Unfreeze Card:**
  - `POST /api/v1/cards/{id}/freeze`
  - `POST /api/v1/cards/{id}/unfreeze`
- **Terminate Card:**
  - `POST /api/v1/cards/{id}/terminate`

---

## Transaction Tracking
- **Get Card Transactions:**
  - `GET /api/v1/cards/{id}/transactions`
- **Get All Company Transactions:**
  - `GET /api/v1/transactions`

Each transaction tracks before/after balances for both cards and wallets, and includes a reference for audit.

---

## Error Handling
- All error responses follow a consistent structure:
```
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error info"
}
```
- Common error codes: 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict)

---

## OpenAPI/Swagger
- The API is fully documented with OpenAPI (Swagger).
- Access the live docs at: `http://localhost:3000/docs`
- You can also use the `openapi-spec.yaml` or `openapi.json` file for client generation and integration.

---

## Usage Examples
### Register a Company
```
POST /api/v1/company/register
{
  "full_name_user": "John Doe",
  "email_user": "john.doe@company.com",
  "password_user": "SecurePass123!",
  "name_company": "Acme Corporation",
  "country_company": "Cameroon",
  "email_company": "company@acme.com"
}
```

### Register a Customer
```
POST /api/v1/customers
Authorization: Bearer <token>
{
  "first_name": "Alice",
  "last_name": "Smith",
  "country": "Nigeria",
  "email": "alice.smith@example.com",
  ...
}
```

### Create a Card
```
POST /api/v1/cards
Authorization: Bearer <token>
{
  "customer_id": "<customer-id>",
  "amount": 10,
  "name_on_card": "Alice Smith",
  "brand": "VISA"
}
```

### Fund a Card
```
POST /api/v1/cards/<card-id>/fund
Authorization: Bearer <token>
{
  "amount": 100
}
```

---

## FAQ
**Q: How do I get my client credentials?**
A: When you register a company, the API returns your `client_id` and `client_key`.

**Q: How do I see all API endpoints?**
A: Visit `/docs` in your running API or use the OpenAPI spec file.

**Q: How do I test the API?**
A: Use the included test script or tools like Postman, Insomnia, or Swagger UI.

**Q: What if I get a 401 error?**
A: Make sure your Bearer token is valid and included in the `Authorization` header.

---

For more details, see the OpenAPI spec or contact the development team.
