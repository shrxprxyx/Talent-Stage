import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateProposalDto {
  @IsString() @MinLength(30) @MaxLength(4000) coverLetter!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) bidAmount!: number;
  @IsInt() @Min(1) @Max(730) estimatedDays!: number;
}

export class UpdateProposalDto {
  @IsOptional() @IsString() @MinLength(30) @MaxLength(4000) coverLetter?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) bidAmount?: number;
  @IsOptional() @IsInt() @Min(1) @Max(730) estimatedDays?: number;
}
