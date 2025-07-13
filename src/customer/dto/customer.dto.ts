import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsIn, IsDateString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Customer first name',
    example: 'John',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  first_name: string;

  @ApiProperty({
    description: 'Customer last name',
    example: 'Doe',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  last_name: string;

  @ApiProperty({
    description: 'Customer country',
    example: 'Nigeria',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  country: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Street address',
    example: '123 Main Street',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  street: string;

  @ApiProperty({
    description: 'City',
    example: 'Lagos',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  city: string;

  @ApiProperty({
    description: 'State or province',
    example: 'Lagos State',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  state: string;

  @ApiProperty({
    description: 'Postal code',
    example: '100001',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  postal_code: string;

  @ApiProperty({
    description: 'Phone country code',
    example: '+234',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  phone_country_code: string;

  @ApiProperty({
    description: 'Phone number',
    example: '8012345678',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  phone_number: string;

  @ApiProperty({
    description: 'Identification number',
    example: '12345678901',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  identification_number: string;

  @ApiProperty({
    description: 'Type of identification',
    example: 'NIN',
    enum: ['NIN', 'PASSPORT', 'VOTERS_CARD', 'DRIVERS_LICENSE'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['NIN', 'PASSPORT', 'VOTERS_CARD', 'DRIVERS_LICENSE'])
  type: string;

  @ApiProperty({
    description: 'URL or path to identification document image',
    example: 'https://example.com/images/id.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty({
    description: 'URL or path to customer photo',
    example: 'https://example.com/images/photo.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiProperty({
    description: 'Additional identification number',
    example: 'ABC123456',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  number: string;

  @ApiProperty({
    description: 'Date of birth (YYYY-MM-DD)',
    example: '1990-01-15',
  })
  @IsDateString()
  @IsNotEmpty()
  dob: string;
}

export class CustomerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  first_name: string;

  @ApiProperty()
  last_name: string;

  @ApiProperty()
  country: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  street: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  state: string;

  @ApiProperty()
  postal_code: string;

  @ApiProperty()
  phone_country_code: string;

  @ApiProperty()
  phone_number: string;

  @ApiProperty()
  identification_number: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  image?: string;

  @ApiProperty()
  photo?: string;

  @ApiProperty()
  number: string;

  @ApiProperty()
  dob: Date;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
