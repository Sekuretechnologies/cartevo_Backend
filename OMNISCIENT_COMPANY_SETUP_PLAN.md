# Omniscient Company Setup Plan

## Project Analysis Summary

This is a NestJS-based financial services API ("wavlet") that manages companies, users, cards, transactions, and wallets. The system uses Prisma ORM with PostgreSQL and implements multi-tenant architecture where users are typically scoped to their company.

### Current Access Control Architecture

- **Database Schema**: Companies have an `access_level` field (string, optional)
- **Authentication**: JWT tokens include `companyId` for user-company binding
- **Authorization**: Guards and services enforce company-scoped data access
- **User-Company Relationship**: Managed through `UserCompanyRole` table
- **Data Models**: Cards, transactions, wallets, customers are company-scoped

### Key Components to Modify

1. **Authentication Service** (`src/modules/auth/auth.service.ts`)
2. **JWT Guards** (`src/modules/auth/guards/jwt-auth.guard.ts`)
3. **Company Service** (`src/modules/company/company.service.ts`)
4. **Data Access Models** (various Prisma models)
5. **Controllers** (company, card, transaction, wallet endpoints)

## Implementation Plan

### Phase 1: Database and Model Updates

#### 1.1 Update Company Creation Logic

- Modify `CompanyService.createCompanyUser()` to accept `access_level` parameter
- Add validation for "omniscient" access level
- Update company creation DTOs to include access_level

#### 1.2 Create Omniscient Company Seeder

- Create a database seeder script to create the omniscient company
- Generate unique client credentials for the omniscient company
- Set up default wallets and configurations

### Phase 2: Authentication & Authorization Updates

#### 2.1 Keep JWT Payload Structure Unchanged

- JWT tokens retain current structure with `companyId`
- No changes needed to token generation or verification
- Access level checking handled by OmniGuard from database

#### 2.2 Create OmniGuard for Omniscient Access

**Create a dedicated OmniGuard that checks company access level from database**

The OmniGuard will:

- Validate JWT tokens using existing JWT strategy
- Extract `companyId` from JWT payload
- Query the Company model to check `access_level`
- Grant access if `access_level === "omniscient"`
- Can be applied to specific routes requiring omniscient permissions

**Benefits:**

- Separation of concerns (regular auth vs omniscient auth)
- Real-time access level checking from database
- No need to modify JWT payload structure
- More secure - access level verified per request

**Implementation:**

```typescript
@Injectable()
export class OmniGuard implements CanActivate {
  constructor(
    private companyModel: CompanyModel,
    private tokenBlacklistService: TokenBlacklistService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Validate JWT token
    // 2. Check token blacklisting
    // 3. Extract companyId from payload
    // 4. Query company access_level from database
    // 5. Return true if access_level === 'omniscient'
  }
}
```

**Usage:**

```typescript
@UseGuards(OmniGuard)
@Get('all-companies-data')
getAllCompaniesData() {
  // Only accessible to omniscient company users
}
```

#### 2.3 Update Authentication Service

- Modify `verifyOtp()` and `selectCompany()` methods
- Update token generation to include access level information
- Handle omniscient company login flows

### Phase 3: Service Layer Modifications

#### 3.1 Update Data Access Models

- Modify Prisma models to conditionally apply company filters
- Add access level checks in query builders
- Update methods like `get()`, `getOne()`, `create()`, `update()`

#### 3.2 Update Business Logic Services

- **Company Service**: Allow omniscient users to access all company data
- **Card Service**: Enable cross-company card management
- **Transaction Service**: Allow viewing transactions across companies
- **Wallet Service**: Enable wallet operations across companies
- **Customer Service**: Allow customer data access across companies

#### 3.3 Add Access Control Helpers

- Create utility functions to check access levels
- Implement permission-based data filtering
- Add audit logging for omniscient operations

### Phase 4: Controller Updates

#### 4.1 Update Route Guards

- Modify controller decorators to use updated guards
- Add conditional access based on company access level

#### 4.2 Update Response Filtering

- Ensure API responses respect access levels
- Add metadata about accessed company in responses

### Phase 5: Security & Audit Implementation

#### 5.1 Add Security Measures

- Implement rate limiting for omniscient operations
- Add comprehensive audit logging
- Create access monitoring and alerts

#### 5.2 Update Validation

- Add server-side validation for access level changes
- Prevent unauthorized access level modifications
- Implement approval workflows for omniscient access

### Phase 6: Testing & Deployment

#### 6.1 Unit Tests

- Test access level validation
- Test data filtering logic
- Test authentication flows

#### 6.2 Integration Tests

- Test cross-company data access
- Test omniscient user workflows
- Test security boundaries

#### 6.3 Deployment Checklist

- Database migration for access_level field
- Environment configuration updates
- Documentation updates

## Implementation Steps

### Step 1: Create Omniscient Company

```bash
# Run database migration if needed
npx prisma migrate dev

# Create omniscient company via API or seeder
# POST /company/create-omniscient
{
  "name": "Omniscient Company",
  "access_level": "omniscient",
  "country": "Global",
  // ... other required fields
}
```

### Step 2: Update Authentication Logic

- Modify JWT token structure to include access level
- Update guards to handle omniscient access
- Test login flow for omniscient users

### Step 3: Update Data Access Layer

- Modify Prisma queries to conditionally filter by company
- Update all service methods to respect access levels
- Test data access across companies

### Step 4: Security Implementation

- Add audit logging for omniscient operations
- Implement access monitoring
- Test security boundaries

### Step 5: Testing & Validation

- Comprehensive testing of all modified components
- Performance testing for cross-company queries
- Security audit and penetration testing

## Risk Assessment

### High Risk Areas

1. **Data Security**: Potential for data leakage across companies
2. **Performance**: Cross-company queries may impact performance
3. **Audit Trail**: Need comprehensive logging for compliance

### Mitigation Strategies

1. **Access Control**: Implement strict permission checks
2. **Query Optimization**: Use database indexing and query optimization
3. **Monitoring**: Real-time monitoring and alerting
4. **Gradual Rollout**: Phase implementation with feature flags

## Success Criteria

1. Omniscient company users can access data from all companies
2. Regular company users maintain their scoped access
3. All operations are properly audited and logged
4. Performance remains acceptable under load
5. Security boundaries are maintained
6. System remains stable and reliable

## Timeline Estimate

- **Phase 1**: 2-3 days (Database and model updates)
- **Phase 2**: 3-4 days (Authentication updates)
- **Phase 3**: 5-7 days (Service layer modifications)
- **Phase 4**: 2-3 days (Controller updates)
- **Phase 5**: 3-4 days (Security implementation)
- **Phase 6**: 4-5 days (Testing and deployment)

**Total Estimate**: 19-26 days for complete implementation

## Dependencies

- Prisma ORM updates
- Database schema modifications
- JWT library compatibility
- Testing framework updates
- Monitoring and logging infrastructure

## Rollback Plan

1. Feature flags to disable omniscient access
2. Database backup before schema changes
3. Gradual rollout with monitoring
4. Quick rollback scripts for critical issues
5. Documentation for reverting changes
