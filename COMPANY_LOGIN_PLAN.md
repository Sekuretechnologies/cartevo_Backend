# Multi-Company Login Implementation Plan

## Overview

With the recent database schema change allowing users to have the same email across different companies, we need to implement a company selection mechanism during the login process. This ensures users can specify which company they want to log into when multiple companies have users with identical email addresses.

## Current Login Flow Analysis

### Existing Process

1. User enters email and password
2. System finds user by email + ACTIVE status
3. System verifies password
4. System generates OTP and sends to email
5. User verifies OTP
6. System generates JWT with user info including company_id
7. User is logged into their company

### Problem

- If a user exists in multiple companies with the same email, the current system will find the first match
- No way for user to choose which company to log into
- Potential security risk of logging into wrong company

## Proposed Solution: Company Selection Flow

### Phase 1: Email Verification

1. User enters email only (no password yet)
2. System checks if email exists in any company
3. If email doesn't exist → Return "User not found"
4. If email exists in only one company → Proceed to password entry
5. If email exists in multiple companies → Show company selection

### Phase 2: Company Selection (when multiple companies found)

1. System returns list of companies where user exists
2. User selects desired company
3. System remembers selected company for this session
4. Proceed to password verification for that specific company

### Phase 3: Authentication

1. Verify password against selected company
2. Generate OTP and send to email
3. User verifies OTP
4. Generate JWT with selected company_id
5. User logged into chosen company

## Technical Implementation Plan

### 1. Database Changes

- ✅ Already completed: User email unique per company
- No additional schema changes needed

### 2. API Changes

#### New Endpoints

```typescript
// Check if email exists and get companies
POST /auth/check-email
{
  "email": "user@example.com"
}
Response:
{
  "exists": true,
  "companies": [
    {
      "id": "company-1-id",
      "name": "Company One",
      "country": "Nigeria"
    },
    {
      "id": "company-2-id",
      "name": "Company Two",
      "country": "Ghana"
    }
  ]
}

// Login with company selection
POST /auth/login-with-company
{
  "email": "user@example.com",
  "password": "password123",
  "company_id": "selected-company-id"
}
```

#### Modified Endpoints

```typescript
// Existing login endpoint - modify to handle single company case
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
// If multiple companies → return companies list
// If single company → proceed as normal
```

### 3. Service Layer Changes

#### AuthService Updates

```typescript
// New method to check email existence
async checkEmailExistence(email: string): Promise<{
  exists: boolean;
  companies: Array<{id: string, name: string, country: string}>;
}> {
  // Find all active users with this email across companies
  const users = await this.prisma.user.findMany({
    where: {
      email,
      status: UserStatus.ACTIVE
    },
    include: {
      company: {
        select: { id: true, name: true, country: true }
      }
    }
  });

  if (users.length === 0) {
    return { exists: false, companies: [] };
  }

  return {
    exists: true,
    companies: users.map(user => user.company)
  };
}

// Modified login method
async loginWithCompanySelection(
  email: string,
  password: string,
  companyId?: string
): Promise<LoginResponseDto> {
  // If companyId provided, login to specific company
  // If not provided, check if user exists in multiple companies
  // Handle accordingly
}
```

### 4. Frontend Implementation Plan

#### Login Page Flow

```jsx
// Step 1: Email Input
const [step, setStep] = useState("email");
const [email, setEmail] = useState("");
const [companies, setCompanies] = useState([]);

const handleEmailSubmit = async () => {
  const response = await fetch("/auth/check-email", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!data.exists) {
    setError("User not found");
    return;
  }

  if (data.companies.length === 1) {
    setSelectedCompany(data.companies[0]);
    setStep("password");
  } else {
    setCompanies(data.companies);
    setStep("company-selection");
  }
};

// Step 2: Company Selection (if multiple)
const handleCompanySelect = (company) => {
  setSelectedCompany(company);
  setStep("password");
};

// Step 3: Password Input
const handleLogin = async () => {
  const response = await fetch("/auth/login-with-company", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      company_id: selectedCompany.id,
    }),
  });
  // Handle OTP flow...
};
```

#### UI Components Needed

1. **EmailInput Component**: Clean email input with validation
2. **CompanySelector Component**: List/Grid of companies with logos/countries
3. **PasswordInput Component**: Secure password field
4. **OTPVerification Component**: Handle 2FA verification

### 5. Security Considerations

#### Session Management

- Store selected company in session during login flow
- Clear session data after successful login or timeout
- Implement session timeout (e.g., 5 minutes for company selection)

#### JWT Token Security

- Include selected company_id in JWT payload
- Validate company_id matches user's actual company membership
- Implement token refresh with company validation

#### Rate Limiting

- Implement rate limiting on email check endpoint
- Prevent brute force attacks on company enumeration
- Add CAPTCHA for suspicious login attempts

### 6. Error Handling

#### Common Scenarios

1. **Email not found**: "No account found with this email address"
2. **Wrong password**: "Invalid password for selected company"
3. **Company access denied**: "You don't have access to this company"
4. **Account suspended**: "Your account in this company is suspended"
5. **Session expired**: "Login session expired, please start again"

#### Error Responses

```typescript
{
  "error": "MULTIPLE_COMPANIES",
  "message": "This email is associated with multiple companies",
  "companies": [...]
}

{
  "error": "INVALID_COMPANY_SELECTION",
  "message": "Selected company is not valid for this user"
}
```

### 7. Migration Strategy

#### Backward Compatibility

- Existing single-company users continue to work without changes
- API maintains backward compatibility for simple login
- Gradual rollout to avoid breaking existing integrations

#### Data Migration

- No data migration needed (schema already updated)
- Existing users remain functional
- New multi-company users can be created immediately

### 8. Testing Strategy

#### Unit Tests

- Test email existence checking
- Test company selection logic
- Test JWT generation with company_id
- Test error scenarios

#### Integration Tests

- Test full login flow with single company
- Test full login flow with multiple companies
- Test session management
- Test security scenarios

#### E2E Tests

- Complete user journey from email to dashboard
- Test company switching scenarios
- Test error recovery flows

### 9. Rollout Plan

#### Phase 1: Backend Implementation (Week 1-2)

- Implement new endpoints
- Update existing login logic
- Add comprehensive error handling
- Write unit and integration tests

#### Phase 2: Frontend Implementation (Week 3-4)

- Update login UI components
- Implement company selection flow
- Add responsive design
- Test user experience

#### Phase 3: Security & Performance (Week 5)

- Implement rate limiting
- Add security headers
- Performance optimization
- Security audit

#### Phase 4: Testing & Deployment (Week 6)

- End-to-end testing
- User acceptance testing
- Production deployment
- Monitoring setup

### 10. Monitoring & Analytics

#### Key Metrics to Track

- Login success rate by company count (single vs multiple)
- Company selection abandonment rate
- Average time to complete login
- Error rates by scenario
- Security incident monitoring

#### Logging Requirements

- Log all company selection events
- Track login attempts by company
- Monitor for suspicious patterns
- Audit trail for compliance

## Benefits of This Implementation

1. **Enhanced Security**: Users explicitly choose their company
2. **Better UX**: Clear company selection for multi-company users
3. **Scalability**: Supports unlimited companies per user
4. **Backward Compatibility**: Existing users unaffected
5. **Audit Trail**: Complete logging of company selections

## Potential Challenges & Mitigations

1. **User Confusion**: Clear UI/UX design with helpful guidance
2. **Session Management**: Robust session handling with timeouts
3. **Performance**: Efficient database queries with proper indexing
4. **Mobile Experience**: Responsive design for all devices
5. **Accessibility**: WCAG compliance for all users

## Conclusion

This implementation provides a robust, secure, and user-friendly solution for multi-company login scenarios. The phased approach ensures minimal disruption while delivering enhanced functionality for users who belong to multiple companies.

The plan balances security, usability, and technical feasibility while maintaining backward compatibility with existing systems.
