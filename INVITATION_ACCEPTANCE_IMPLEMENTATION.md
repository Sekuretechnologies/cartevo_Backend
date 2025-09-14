# Invitation Acceptance Implementation Plan

## Overview

This document outlines the implementation plan for enhancing the WAVLET platform's invitation system to support both new users and existing users from other companies accepting invitations.

## Current System Analysis

### Existing Invitation Flow

1. **Company Owner** creates user via `POST /users`
2. **System** creates PENDING user with unique `invitation_code`
3. **Email Service** sends invitation email with code
4. **User** registers via `POST /users/register` with code + credentials
5. **User** becomes ACTIVE and can login

### Current Limitations

- Assumes users belong to only one company
- No support for existing users joining new companies
- Invitation codes are single-use and tied to pending user records

## Enhanced Invitation System Requirements

### Case 1: New User Registration

**Current implementation already supports this:**

- User receives invitation → registers with code → account created

### Case 2: Existing User Joining New Company

**New requirement - needs implementation:**

- Existing user receives invitation → authenticates → gets added to new company
- No duplicate account creation
- Leverages existing multi-company authentication system

## Implementation Architecture

### Database Schema (No Changes Required)

The existing schema already supports multi-company users:

```prisma
model User {
  id                String   @id @default(cuid())
  email             String
  company_id        String
  invitation_token  String?  @unique  // Changed from invitation_code
  status            UserStatus @default(PENDING)
  // ... other fields
}

model UserCompanyRole {
  user_id    String
  company_id String
  role_id    String
  // Junction table for multi-company support
}
```

### Invitation Link Structure

Instead of invitation codes, we'll use JWT tokens embedded in URLs:

```
https://app.carstvo.com/invitation/accept?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Payload:**

```json
{
  "invitation_id": "user-uuid",
  "email": "user@example.com",
  "company_id": "company-uuid",
  "role": "admin",
  "exp": 1638360000, // 7 days expiry
  "iat": 1637755200
}
```

### New API Endpoints

#### 1. Accept Invitation (Direct Link Handler)

```typescript
GET /invitations/accept?token=:token
// Frontend route that validates token and shows appropriate UI
```

#### 2. Process Invitation Acceptance

```typescript
POST / users / invitations / accept;
Body: AcceptInvitationDto;
Response: AcceptInvitationResponseDto;
```

### Enhanced Existing Endpoints

#### Modified: Register User

```typescript
POST / users / register;
// Enhanced to detect existing users and route to appropriate flow
```

## Implementation Details

### 1. Invitation Token Generation

```typescript
// Generate invitation JWT token
generateInvitationToken(invitationData: {
  invitation_id: string;
  email: string;
  company_id: string;
  role: string;
}): string {
  const payload = {
    invitation_id: invitationData.invitation_id,
    email: invitationData.email,
    company_id: invitationData.company_id,
    role: invitationData.role,
  };

  return this.jwtService.sign(payload, {
    expiresIn: '7d', // 7 days expiry
  });
}
```

### 2. Frontend Invitation Link Handler

```typescript
// Frontend route: /invitation/accept?token=:token
export class InvitationAcceptComponent {
  async ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get("token");

    if (!token) {
      this.showError("Invalid invitation link");
      return;
    }

    try {
      // Validate token and get invitation details
      const invitationData = await this.validateInvitationToken(token);

      if (invitationData.user_exists) {
        // Show login form for existing user
        this.showExistingUserFlow(invitationData);
      } else {
        // Show registration form for new user
        this.showNewUserFlow(invitationData);
      }
    } catch (error) {
      this.showError("Invalid or expired invitation");
    }
  }
}
```

### 3. Invitation Validation Endpoint

```typescript
export class ValidateInvitationTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ValidateInvitationResponseDto {
  @ApiProperty()
  valid: boolean;

  @ApiProperty()
  invitation_id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  company: {
    id: string;
    name: string;
    country: string;
  };

  @ApiProperty()
  role: string;

  @ApiProperty()
  user_exists: boolean;

  @ApiProperty({ required: false })
  existing_companies?: number;
}
```

**Implementation:**

```typescript
async validateInvitationToken(dto: ValidateInvitationTokenDto) {
  try {
    // Verify JWT token
    const decoded = this.jwtService.verify(dto.token) as {
      invitation_id: string;
      email: string;
      company_id: string;
      role: string;
    };

    // Check if invitation still exists and is pending
    const invitation = await UserModel.getOne({
      id: decoded.invitation_id,
      status: UserStatus.PENDING,
    });

    if (!invitation.output) {
      return { valid: false };
    }

    // Check if user already exists
    const existingUsers = await UserModel.get({
      email: decoded.email,
      status: UserStatus.ACTIVE,
    });

    const userExists = existingUsers.output.length > 0;

    // Get company details
    const company = await CompanyModel.getOne({
      id: decoded.company_id,
    });

    return {
      valid: true,
      invitation_id: decoded.invitation_id,
      email: decoded.email,
      company: {
        id: company.output.id,
        name: company.output.name,
        country: company.output.country,
      },
      role: decoded.role,
      user_exists: userExists,
      existing_companies: userExists ? existingUsers.output.length : 0,
    };
  } catch (error) {
    return { valid: false };
  }
}
```

### 4. Accept Invitation Process

```typescript
export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string; // JWT invitation token

  @IsString()
  @IsNotEmpty()
  password?: string; // Only required for existing users
}

export class AcceptInvitationResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  access_token?: string; // For existing users after login

  @ApiProperty({ required: false })
  user?: object; // User data for existing users

  @ApiProperty()
  company: {
    id: string;
    name: string;
    country: string;
  };

  @ApiProperty({ required: false })
  redirect_to?: string;
}
```

**Implementation:**

```typescript
async acceptInvitation(dto: AcceptInvitationDto) {
  // Validate invitation token
  const validation = await this.validateInvitationToken({ token: dto.token });

  if (!validation.valid) {
    throw new BadRequestException("Invalid or expired invitation");
  }

  const { invitation_id, email, company, role, user_exists } = validation;

  if (user_exists) {
    // Case 2: Existing user - require authentication
    if (!dto.password) {
      throw new BadRequestException("Password required for existing users");
    }

    const user = await UserModel.getOne({
      email: email,
      status: UserStatus.ACTIVE,
    });

    if (!user.output) {
      throw new BadRequestException("User account not found");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      dto.password,
      user.output.password
    );

    if (!isValidPassword) {
      throw new BadRequestException("Invalid password");
    }

    // Check if user already belongs to this company
    const existingMembership = await UserCompanyRoleModel.getOne({
      user_id: user.output.id,
      company_id: company.id,
    });

    if (existingMembership.output) {
      throw new BadRequestException("User already belongs to this company");
    }

    // Add user to new company
    const roleRecord = await RoleModel.getOne({ name: role });
    await UserCompanyRoleModel.create({
      user_id: user.output.id,
      company_id: company.id,
      role_id: roleRecord.output.id,
    });

    // Mark invitation as used
    await UserModel.update(invitation_id, {
      status: UserStatus.INACTIVE
    });

    // Generate access token for the new company
    const payload = {
      sub: user.output.id,
      email: user.output.email,
      companyId: company.id,
      roles: [role],
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: "1h",
    });

    return {
      success: true,
      message: `Successfully joined ${company.name}`,
      access_token: accessToken,
      user: await this.mapToResponseDto(user.output),
      company: company,
      redirect_to: "dashboard",
    };

  } else {
    // Case 1: New user - redirect to registration
    return {
      success: true,
      message: "Please complete your registration",
      company: company,
      redirect_to: "register",
    };
  }
}
```

### 5. New User Registration with Token

```typescript
export class RegisterWithInvitationDto extends RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  invitation_token: string;
}

async registerWithInvitation(dto: RegisterWithInvitationDto) {
  // Validate invitation token
  const validation = await this.validateInvitationToken({
    token: dto.invitation_token
  });

  if (!validation.valid || validation.user_exists) {
    throw new BadRequestException("Invalid invitation");
  }

  // Create new user account
  const hashedPassword = await bcrypt.hash(dto.password, 12);

  const newUser = await UserModel.create({
    email: validation.email,
    full_name: dto.full_name,
    password: hashedPassword,
    company_id: validation.company.id,
    status: UserStatus.ACTIVE,
  });

  // Assign role
  const roleRecord = await RoleModel.getOne({ name: validation.role });
  await UserCompanyRoleModel.create({
    user_id: newUser.output.id,
    company_id: validation.company.id,
    role_id: roleRecord.output.id,
  });

  // Mark invitation as used
  await UserModel.update(validation.invitation_id, {
    status: UserStatus.INACTIVE
  });

  // Generate access token
  const payload = {
    sub: newUser.output.id,
    email: newUser.output.email,
    companyId: validation.company.id,
    roles: [validation.role],
  };

  const accessToken = this.jwtService.sign(payload, {
    expiresIn: "1h",
  });

  return {
    success: true,
    message: "Account created successfully",
    access_token: accessToken,
    user: await this.mapToResponseDto(newUser.output),
    company: validation.company,
    redirect_to: "dashboard",
  };
}
```

## Frontend Implementation

### Invitation Link Handling

```typescript
// Route: /invitation/accept?token=:token
@Component({
  selector: "app-invitation-accept",
  template: `
    <div class="invitation-container">
      <div *ngIf="loading" class="loading-spinner">
        <p>Validating invitation...</p>
      </div>

      <div *ngIf="error" class="error-message">
        <h3>Invalid Invitation</h3>
        <p>{{ error }}</p>
        <button (click)="goHome()">Go to Homepage</button>
      </div>

      <!-- Existing User Flow -->
      <div *ngIf="userExists && !loading && !error" class="existing-user-flow">
        <h2>Welcome back!</h2>
        <p>
          You've been invited to join
          <strong>{{ invitationData?.company?.name }}</strong>
        </p>
        <p>Please sign in to accept the invitation:</p>

        <form (ngSubmit)="acceptInvitation()" #loginForm="ngForm">
          <div class="form-group">
            <label>Email:</label>
            <input
              type="email"
              [value]="invitationData?.email"
              readonly
              class="readonly-input"
            />
          </div>

          <div class="form-group">
            <label>Password:</label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              #passwordInput="ngModel"
            />
          </div>

          <button
            type="submit"
            [disabled]="!loginForm.valid || submitting"
            class="primary-button"
          >
            {{ submitting ? "Accepting..." : "Accept Invitation" }}
          </button>
        </form>
      </div>

      <!-- New User Flow -->
      <div *ngIf="!userExists && !loading && !error" class="new-user-flow">
        <h2>Join {{ invitationData?.company?.name }}!</h2>
        <p>Create your CARTEVO account to get started:</p>

        <form (ngSubmit)="registerWithInvitation()" #registerForm="ngForm">
          <div class="form-group">
            <label>Email:</label>
            <input
              type="email"
              [value]="invitationData?.email"
              readonly
              class="readonly-input"
            />
          </div>

          <div class="form-group">
            <label>Full Name:</label>
            <input
              type="text"
              [(ngModel)]="fullName"
              name="fullName"
              required
              minlength="2"
              #fullNameInput="ngModel"
            />
          </div>

          <div class="form-group">
            <label>Password:</label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              minlength="8"
              #passwordInput="ngModel"
            />
            <small
              >Minimum 8 characters with uppercase, lowercase, number, and
              special character</small
            >
          </div>

          <div class="form-group">
            <label>Confirm Password:</label>
            <input
              type="password"
              [(ngModel)]="confirmPassword"
              name="confirmPassword"
              required
              #confirmPasswordInput="ngModel"
            />
          </div>

          <button
            type="submit"
            [disabled]="
              !registerForm.valid || passwordsDontMatch() || submitting
            "
            class="primary-button"
          >
            {{ submitting ? "Creating Account..." : "Create Account" }}
          </button>
        </form>
      </div>

      <!-- Success Message -->
      <div *ngIf="success" class="success-message">
        <h2>Success!</h2>
        <p>{{ successMessage }}</p>
        <button (click)="goToDashboard()">Go to Dashboard</button>
      </div>
    </div>
  `,
})
export class InvitationAcceptComponent implements OnInit {
  token: string;
  invitationData: any = null;
  userExists = false;
  loading = true;
  error: string = null;
  submitting = false;
  success = false;
  successMessage = "";

  // Form fields
  password = "";
  fullName = "";
  confirmPassword = "";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invitationService: InvitationService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get("token");

    if (!this.token) {
      this.error = "Invalid invitation link - no token provided";
      this.loading = false;
      return;
    }

    try {
      // Validate the invitation token
      const validation = await this.invitationService.validateInvitationToken({
        token: this.token,
      });

      if (!validation.valid) {
        this.error = "This invitation link is invalid or has expired";
        this.loading = false;
        return;
      }

      this.invitationData = validation;
      this.userExists = validation.user_exists;
      this.loading = false;
    } catch (error) {
      this.error = "Failed to validate invitation. Please try again.";
      this.loading = false;
    }
  }

  async acceptInvitation() {
    if (!this.password) return;

    this.submitting = true;

    try {
      const result = await this.invitationService.acceptInvitation({
        token: this.token,
        password: this.password,
      });

      if (result.success && result.access_token) {
        // Store auth data and redirect
        this.authService.setAuthData(result);
        this.success = true;
        this.successMessage = `Welcome to ${result.company.name}! You now have access to this company.`;

        // Redirect after a short delay
        setTimeout(() => {
          this.router.navigate(["/dashboard"]);
        }, 2000);
      }
    } catch (error) {
      this.error = error.message || "Failed to accept invitation";
    } finally {
      this.submitting = false;
    }
  }

  async registerWithInvitation() {
    if (!this.passwordsMatch() || !this.fullName) return;

    this.submitting = true;

    try {
      const result = await this.invitationService.registerWithInvitation({
        invitation_token: this.token,
        email: this.invitationData.email,
        full_name: this.fullName,
        password: this.password,
      });

      if (result.success && result.access_token) {
        // Store auth data and redirect
        this.authService.setAuthData(result);
        this.success = true;
        this.successMessage =
          "Account created successfully! Welcome to CARTEVO.";

        // Redirect after a short delay
        setTimeout(() => {
          this.router.navigate(["/dashboard"]);
        }, 2000);
      }
    } catch (error) {
      this.error = error.message || "Failed to create account";
    } finally {
      this.submitting = false;
    }
  }

  passwordsMatch(): boolean {
    return this.password === this.confirmPassword;
  }

  passwordsDontMatch(): boolean {
    return this.password && this.confirmPassword && !this.passwordsMatch();
  }

  goHome() {
    this.router.navigate(["/"]);
  }

  goToDashboard() {
    this.router.navigate(["/dashboard"]);
  }
}
```

### Invitation Service

```typescript
@Injectable({
  providedIn: "root",
})
export class InvitationService {
  constructor(private http: HttpClient) {}

  validateInvitationToken(
    dto: ValidateInvitationTokenDto
  ): Promise<ValidateInvitationResponseDto> {
    return this.http
      .post<ValidateInvitationResponseDto>(
        "/api/users/invitations/validate-token",
        dto
      )
      .toPromise();
  }

  acceptInvitation(
    dto: AcceptInvitationDto
  ): Promise<AcceptInvitationResponseDto> {
    return this.http
      .post<AcceptInvitationResponseDto>("/api/users/invitations/accept", dto)
      .toPromise();
  }

  registerWithInvitation(
    dto: RegisterWithInvitationDto
  ): Promise<LoginSuccessResponseDto> {
    return this.http
      .post<LoginSuccessResponseDto>("/api/users/register-with-invitation", dto)
      .toPromise();
  }
}
```

### User Flows

#### Existing User Flow

```
1. User clicks invitation link in email
2. Browser navigates to /invitation/accept?token=...
3. Frontend validates token with backend
4. Shows login form with pre-filled email
5. User enters password and submits
6. Backend authenticates and adds user to company
7. Returns access token for new company
8. User redirected to dashboard with company switcher
```

#### New User Flow

```
1. User clicks invitation link in email
2. Browser navigates to /invitation/accept?token=...
3. Frontend validates token with backend
4. Shows registration form with pre-filled email
5. User completes registration and submits
6. Backend creates account and assigns to company
7. Returns access token
8. User redirected to dashboard
```

## Email Template Updates

### Enhanced Invitation Email with Direct Links

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Invitation to join {{companyName}}</title>
    <style>
      .invitation-link {
        display: inline-block;
        background-color: #007bff;
        color: white;
        padding: 15px 30px;
        text-decoration: none;
        border-radius: 5px;
        margin: 20px 0;
        font-weight: bold;
        text-align: center;
      }
      .invitation-link:hover {
        background-color: #0056b3;
      }
      .secondary-text {
        color: #666;
        font-size: 14px;
        margin: 15px 0;
      }
    </style>
  </head>
  <body>
    <h2>You're invited to join {{companyName}}!</h2>

    <p>Hi there,</p>

    <p>
      <strong>{{inviterName}}</strong> has invited you to join
      <strong>{{companyName}}</strong> on CARTEVO.
    </p>

    {{#if userExists}}
    <p>
      You already have a CARTEVO account. Click the button below to accept the
      invitation and get access to {{companyName}}:
    </p>
    <a href="{{acceptInvitationUrl}}" class="invitation-link">
      Accept Invitation & Sign In
    </a>
    <p class="secondary-text">
      You'll be asked to sign in with your existing account to confirm.
    </p>
    {{else}}
    <p>
      Welcome to CARTEVO! Click the button below to create your account and join
      {{companyName}}:
    </p>
    <a href="{{registerUrl}}" class="invitation-link">
      Create Account & Join {{companyName}}
    </a>
    <p class="secondary-text">
      No account yet? We'll help you create one quickly and securely.
    </p>
    {{/if}}

    <p><strong>What happens next?</strong></p>
    <ul>
      <li>You'll be redirected to CARTEVO</li>
      {{#if userExists}}
      <li>Sign in with your existing credentials</li>
      <li>Get immediate access to {{companyName}}</li>
      {{else}}
      <li>Complete a quick registration</li>
      <li>Start using CARTEVO right away</li>
      {{/if}}
    </ul>

    <p>This invitation link expires in 7 days for security reasons.</p>

    <p>
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p><small>{{invitationUrl}}</small></p>

    <p>Best regards,<br />The CARTEVO Team</p>
  </body>
</html>
```

**Email Variables:**

- `{{companyName}}` - Name of the inviting company
- `{{inviterName}}` - Name of the person who sent the invitation
- `{{acceptInvitationUrl}}` - Direct link for existing users: `https://app.carstvo.com/invitation/accept?token=...`
- `{{registerUrl}}` - Direct link for new users: `https://app.carstvo.com/invitation/accept?token=...`
- `{{invitationUrl}}` - Fallback URL for manual entry

## Security Considerations

### Invitation Security

- **Expiration**: Invitations expire after 7 days
- **Single Use**: Each invitation code can only be used once
- **Rate Limiting**: Limit validation attempts per IP
- **Audit Trail**: Log all invitation activities

### Authentication Security

- **Password Verification**: Existing users must authenticate
- **Company Validation**: Prevent unauthorized company access
- **Role Assignment**: Maintain proper role-based access control

## Error Handling

### New Error Codes

- `INVITATION_EXPIRED`: Invitation code has expired
- `INVITATION_INVALID`: Invalid invitation code
- `USER_ALREADY_MEMBER`: User already belongs to company
- `ACCOUNT_NOT_FOUND`: Existing user account not found
- `INVALID_CREDENTIALS`: Wrong password for existing user

### Error Responses

```json
{
  "statusCode": 400,
  "message": "User already belongs to this company",
  "error": "USER_ALREADY_MEMBER"
}
```

## Testing Scenarios

### Case 1: New User

1. Owner invites new email
2. User receives invitation email
3. User clicks registration link
4. User completes registration
5. Account created successfully

### Case 2: Existing User

1. Owner invites existing user email
2. User receives invitation email
3. User clicks accept invitation link
4. User logs in with existing credentials
5. User gets added to new company
6. User can switch between companies

### Edge Cases

1. **Expired Invitation**: Should show clear error message
2. **Already Member**: Should inform user they're already in company
3. **Invalid Credentials**: Should prompt user to try again
4. **Multiple Invitations**: Should handle gracefully

## Migration and Deployment

### Backward Compatibility

- Existing single-company invitations continue to work
- No breaking changes to current API
- New endpoints are additive

### Database Migration

- No schema changes required
- Existing data remains compatible
- New functionality leverages existing multi-company support

### Rollout Strategy

1. Deploy new endpoints
2. Update email templates
3. Update frontend to handle new flows
4. Monitor invitation acceptance rates
5. Gradually phase out old invitation system

## Benefits

### User Experience

- **Seamless Onboarding**: Existing users can easily join new companies
- **No Account Duplication**: Prevents email conflicts
- **Clear Communication**: Email tells user exactly what to do

### Business Benefits

- **Faster Team Growth**: Easier to add existing users to new companies
- **Reduced Support**: Clear invitation flow reduces confusion
- **Scalable**: Supports unlimited company memberships per user

### Technical Benefits

- **Leverages Existing Code**: Uses current multi-company authentication
- **Maintainable**: Clean separation of concerns
- **Secure**: Maintains all existing security measures

## Implementation Checklist

### Backend Tasks

- [ ] Add invitation validation endpoint
- [ ] Enhance registerUser method for existing users
- [ ] Implement handleExistingUserInvitation method
- [ ] Add accept invitation endpoint (optional)
- [ ] Update email templates
- [ ] Add comprehensive error handling
- [ ] Update API documentation

### Frontend Tasks

- [ ] Add invitation link handling
- [ ] Create login-required page for existing users
- [ ] Update registration flow
- [ ] Add company switcher UI
- [ ] Update invitation email links

### Testing Tasks

- [ ] Unit tests for new methods
- [ ] Integration tests for invitation flows
- [ ] End-to-end testing for both user types
- [ ] Security testing for edge cases

### Documentation Tasks

- [ ] Update API documentation
- [ ] Create user-facing help articles
- [ ] Update developer guides

This implementation provides a robust, user-friendly invitation system that supports both new and existing users while maintaining security and leveraging the existing multi-company architecture.
