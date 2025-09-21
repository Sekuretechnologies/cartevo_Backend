# Transfer Fees Implementation

## Overview

This implementation adds support for transfer fees and currency conversion in wallet-to-wallet transfers. The system supports different fee structures based on currency pairs and includes real-time fee calculation.

## Features

- **Dynamic Fee Calculation**: Fees are calculated based on currency pairs (XAF→XAF: 2%, XAF→XOF: 8%, XAF→USD: 0% + exchange rate)
- **Currency Conversion**: Automatic conversion between different currencies using configurable exchange rates
- **Real-time Fee Display**: Frontend shows fees and conversion rates before transfer
- **Administrative Control**: Fees can be modified by administrators through the existing TransactionFee system
- **Audit Trail**: Complete transaction history with fee details

## Architecture

### Backend Components

1. **TransferFeeCalculationService** (`src/services/wallet/transferFeeCalculation.service.ts`)
   - Calculates transfer fees based on currency pairs
   - Handles currency conversion using exchange rates
   - Returns detailed fee information

2. **WalletTransferBetweenService** (Modified)
   - Integrated fee calculation into transfer process
   - Supports different currencies with conversion
   - Updates transaction records with fee details

3. **API Endpoints**
   - `POST /api/wallets/calculate-transfer-fees` - Calculate fees without executing transfer
   - `POST /api/wallets/transfer-between` - Execute transfer with fees
   - `GET /api/wallets/:id/available-for-transfer` - Get available wallets (supports different currencies)

### Frontend Components

1. **TransferBetweenWalletsModal** (Modified)
   - Real-time fee calculation and display
   - Shows exchange rates and converted amounts
   - Validates sufficient balance including fees

2. **API Integration**
   - New service method for fee calculation
   - Updated transfer service with fee information

## Database Schema

### Transaction Fees
Uses existing `transaction_fees` table with:
- `transaction_type`: 'WALLET_TO_WALLET'
- `transaction_category`: 'WALLET'
- `currency`: Source currency
- `fee_percentage`: Fee percentage (e.g., 2.0000 for 2%)
- `type`: 'PERCENTAGE' or 'FIXED'

### Exchange Rates
Uses existing `exchange_rates` table with:
- `from_currency` and `to_currency`: Currency pair
- `rate`: Exchange rate
- `is_active`: Whether rate is currently active

## Configuration

### Setting Up Transfer Fees

1. **Run the setup script**:
   ```sql
   -- Replace 'your-company-id' with actual company ID
   \i scripts/setup-transfer-fees.sql
   ```

2. **Configure fees for your company**:
   ```sql
   INSERT INTO transaction_fees (
       company_id, transaction_type, transaction_category,
       country_iso_code, currency, fee_percentage, type, value, description
   ) VALUES (
       'your-company-id', 'WALLET_TO_WALLET', 'WALLET',
       'CM', 'XAF', 2.0000, 'PERCENTAGE', 2.00, 'XAF to XAF transfer fee'
   );
   ```

3. **Configure exchange rates**:
   ```sql
   INSERT INTO exchange_rates (
       company_id, from_currency, to_currency, rate, description
   ) VALUES (
       'your-company-id', 'XAF', 'USD', 0.001538, 'XAF to USD - 1 USD = 650 XAF'
   );
   ```

### Fee Structure Examples

| From Currency | To Currency | Fee Percentage | Description |
|---------------|-------------|----------------|-------------|
| XAF | XAF | 2% | Same currency transfer |
| XAF | XOF | 8% | Regional currency transfer |
| XAF | USD | 0% | International transfer (exchange rate only) |
| USD | XAF | 0% | International transfer (exchange rate only) |
| XOF | XOF | 2% | Same currency transfer |

## API Usage

### Calculate Transfer Fees

```javascript
const response = await fetch('/api/wallets/calculate-transfer-fees', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from_currency: 'XAF',
    to_currency: 'USD',
    amount: 1000,
    country_iso_code: 'CM'
  })
});

const data = await response.json();
// Returns: { feeAmount, exchangeRate, convertedAmount, totalAmount, ... }
```

### Execute Transfer

```javascript
const response = await fetch('/api/wallets/transfer-between', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from_wallet_id: 'wallet-id-1',
    to_wallet_id: 'wallet-id-2',
    amount: 1000,
    reason: 'Transfer between wallets'
  })
});

const data = await response.json();
// Returns: { transaction_id, fee_amount, exchange_rate, converted_amount, ... }
```

## Testing

### Run Test Script

1. **Update configuration** in `scripts/test-transfer-fees.js`:
   - Replace `your-company-id` with actual company ID
   - Replace `your-auth-token` with actual auth token
   - Replace `your-wallet-id` with actual wallet ID

2. **Run the test**:
   ```bash
   node scripts/test-transfer-fees.js
   ```

### Expected Test Results

- XAF → XAF: 2% fee (20 XAF for 1000 XAF)
- XAF → XOF: 8% fee (80 XAF for 1000 XAF) + 1:1 conversion
- XAF → USD: 0% fee + exchange rate (1000 XAF = 1.54 USD)
- USD → XAF: 0% fee + exchange rate (10 USD = 6500 XAF)

## Frontend Integration

### TransferBetweenWalletsModal Props

```typescript
interface TransferBetweenWalletsModalProps {
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: TransferBetweenWalletsSubmitProps) => void;
  onLoadWallets: () => Promise<any[]>;
  isLoading: boolean;
  sourceWallet: {
    id: string;
    currency: string;
    balance: number;
    country_iso_code?: string;
  };
  token: string; // Required for fee calculation
}
```

### Fee Display

The modal automatically displays:
- Transfer amount
- Transfer fees (if any)
- Exchange rate (if different currencies)
- Converted amount (if different currencies)
- Total amount to deduct (including fees)

## Administrative Control

### Modifying Fees

Administrators can modify fees through the existing TransactionFee system:

```sql
-- Update XAF to XAF fee from 2% to 3%
UPDATE transaction_fees 
SET fee_percentage = 3.0000, 
    value = 3.00,
    updated_at = NOW()
WHERE company_id = 'your-company-id'
  AND transaction_type = 'WALLET_TO_WALLET'
  AND currency = 'XAF';
```

### Modifying Exchange Rates

```sql
-- Update XAF to USD rate from 650 to 700
UPDATE exchange_rates 
SET rate = 0.001429, -- 1/700
    updated_at = NOW()
WHERE company_id = 'your-company-id'
  AND from_currency = 'XAF'
  AND to_currency = 'USD';
```

## Error Handling

The system handles various error scenarios:

- **No fee configured**: Returns 0% fee
- **No exchange rate**: Returns error for currency conversion
- **Insufficient balance**: Validates total amount (including fees)
- **Invalid currencies**: Validates currency pairs

## Security Considerations

- All fee calculations are server-side
- Exchange rates are validated before use
- Transaction atomicity ensures data consistency
- Audit trail for all fee applications

## Performance

- Fee calculations are cached when possible
- Exchange rates are fetched efficiently
- Database queries are optimized
- Frontend shows loading states during calculations

## Future Enhancements

- **Dynamic Exchange Rates**: Integration with external rate providers
- **Fee Tiers**: Different fees based on transfer amounts
- **Promotional Rates**: Temporary fee reductions
- **Multi-currency Wallets**: Support for multiple currencies in one wallet
- **Fee Analytics**: Detailed reporting on fee collection

