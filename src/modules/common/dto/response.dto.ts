import { ApiProperty } from "@nestjs/swagger";

export class SuccessResponseDto {
  @ApiProperty({ example: false })
  success?: boolean;

  @ApiProperty({ example: "success" })
  status?: string;

  @ApiProperty({ example: "Operation completed successfully" })
  message: string;

  @ApiProperty()
  data?: any;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success?: boolean;

  @ApiProperty({ example: "error" })
  status?: string;

  @ApiProperty({ example: "Error message" })
  message: string;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty()
  error?: string;
}

export class PaginatedResponseDto<T> {
  @ApiProperty()
  data: T[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
