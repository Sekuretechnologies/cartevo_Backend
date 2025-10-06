import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class ContactDto {
  @IsNotEmpty({ message: "Name is required" })
  @IsString()
  name: string;

  @IsNotEmpty({ message: "Company name is required" })
  @IsString()
  entrepriseName: string;

  @IsNotEmpty({ message: "WhatsApp number is required" })
  @IsString()
  whatsapp: string;

  @IsNotEmpty({ message: "Country code is required" })
  @IsString()
  country_code: string;

  @IsNotEmpty({ message: "Activity is required" })
  @IsString()
  activity: string;

  @IsNotEmpty({ message: "Service is required" })
  @IsString()
  service: string;

  @IsNotEmpty({ message: "Subject is required" })
  @IsString()
  subject: string;

  @IsNotEmpty({ message: "Message is required" })
  @IsString()
  message: string;

  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Invalid email address" })
  email: string;
}
