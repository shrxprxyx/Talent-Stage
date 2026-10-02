import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUrl,
  Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

export class UpdateFreelancerDto {
  @IsOptional() @IsString() @MaxLength(120) headline?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100000) hourlyRate?: number;
  @IsOptional() @IsString() @MaxLength(120) location?: string;
  @IsOptional() @IsBoolean() available?: boolean;
}

export class UpdateClientDto {
  @IsOptional() @IsString() @MaxLength(120) companyName?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
}

export class SkillEntryDto {
  @IsString() skillId!: string;
  @IsOptional() @IsInt() @Min(0) @Max(60) yearsExp?: number;
}

export class SetSkillsDto {
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => SkillEntryDto)
  skills!: SkillEntryDto[];
}

export class PortfolioDto {
  @IsString() @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsUrl() link?: string;
}

export class UpdatePortfolioDto {
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsUrl() link?: string;
}
