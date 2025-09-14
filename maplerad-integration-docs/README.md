# Maplerad Integration Documentation

## Overview

This documentation provides comprehensive details about the Maplerad card integration in the WAVLET API system. Maplerad is a financial technology platform that enables businesses to issue virtual USD cards for their customers.

## Architecture Overview

The Maplerad integration follows a modular architecture with clear separation of concerns:

```
src/
├── modules/maplerad/           # NestJS module for Maplerad
│   ├── maplerad.controller.ts  # REST API endpoints
│   ├── maplerad.service.ts     # Business logic
│   └── maplerad.module.ts      # Module configuration
└── utils/cards/maplerad/       # Core integration utilities
    ├── index.ts               # Main exports
    ├── card.ts               # Card and customer operations
    ├── card-transaction.ts   # Transaction operations
    ├── tools.ts              # Utility functions
    └── types.ts              # TypeScript interfaces
```

## Key Features

- **Virtual Card Issuance**: Create USD virtual cards (Visa/Mastercard)
- **Customer Management**: KYC-compliant customer enrollment
- **Card Management**: Freeze, unfreeze, and terminate cards
- **Fund Management**: Load and withdraw funds from cards
- **Transaction Tracking**: Real-time transaction monitoring
- **Webhook Integration**: Event-driven updates for transactions
- **Multi-Currency Support**: USD primary with conversion capabilities

## Quick Start

### Environment Setup

Add the following environment variables to your `.env` file:

```env
# Maplerad API Configuration
MAPLERAD_BASE_URL=https://api.maplerad.com/v1
MAPLERAD_SECRET_KEY=your_maplerad_secret_key

# Maplerad Fees (USD)
MAPLERAD_CARD_CREATION_FEE=2
MAPLERAD_CARD_FUNDING_FEE=0
MAPLERAD_CARD_WITHDRAWAL_FEE=0
```

### Basic Usage

```typescript
// Create a card
const card = await mapleradService.createCard(createCardDto);

// Fund a card
const result = await mapleradService.fundCard(
  companyId,
  cardId,
  amount,
  customerId
);

// Get card details
const cardDetails = await mapleradService.findOne(companyId, cardId, reveal);
```

## API Endpoints

| Method | Endpoint                               | Description             |
| ------ | -------------------------------------- | ----------------------- |
| POST   | `/maplerad/cards`                      | Create new virtual card |
| POST   | `/maplerad/cards/:cardId/fund`         | Fund existing card      |
| POST   | `/maplerad/cards/:cardId/withdraw`     | Withdraw from card      |
| PUT    | `/maplerad/cards/:cardId/freeze`       | Freeze card             |
| PUT    | `/maplerad/cards/:cardId/unfreeze`     | Unfreeze card           |
| GET    | `/maplerad/cards`                      | List company cards      |
| GET    | `/maplerad/cards/:cardId`              | Get specific card       |
| GET    | `/maplerad/cards/:cardId/transactions` | Get card transactions   |

## Documentation Sections

- **[Controller](./controller.md)**: REST API endpoints and request/response formats
- **[Service](./service.md)**: Business logic and core functionality
- **[Webhook](./webhook.md)**: Event handling and webhook processing
- **[Models](./models.md)**: Data structures and database integration
- **[Integration Flow](./integration-flow.md)**: Complete workflow from creation to transaction
- **[API Reference](./api-endpoints.md)**: Detailed endpoint documentation
- **[Error Handling](./error-handling.md)**: Error types and handling strategies
- **[Configuration](./configuration.md)**: Environment setup and configuration options

## Security Considerations

- All sensitive card data (PAN, CVV) is encrypted using JWT tokens
- API keys are stored as environment variables
- Request/response logging for audit trails
- Rate limiting and request validation
- PCI DSS compliance considerations

## Testing

The integration includes comprehensive testing:

- Unit tests for utility functions
- Integration tests for API endpoints
- Error scenario testing
- Webhook event processing tests

## Monitoring and Logging

- Structured logging for all API interactions
- Error tracking and alerting
- Performance monitoring
- Transaction audit trails

## Support

For technical support or questions about the Maplerad integration:

- Check the [Integration Plan](../MAPLERAD_INTEGRATION_PLAN.md)
- Review the [Troubleshooting Guide](./troubleshooting.md)
- Contact the development team

## Version History

- **v1.0.0**: Initial Maplerad integration
- **v1.1.0**: Enhanced error handling and webhook support
- **v1.2.0**: Multi-currency support and advanced transaction features
