import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional,
  IsString, Max, MaxLength, Min, MinLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsString() @MinLength(5) @MaxLength(140) title!: string;
  @IsString() @MinLength(20) @MaxLength(5000) description!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) budgetMin!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) budgetMax!: number;
  @IsOptional() @IsDateString() deadline?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(15) @IsString({ each: true }) skillIds!: string[];
  // true = go live immediately, false/omitted = save as DRAFT
  @IsOptional() @IsBoolean() publish?: boolean;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() @MinLength(5) @MaxLength(140) title?: string;
  @IsOptional() @IsString() @MinLength(20) @MaxLength(5000) description?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) budgetMin?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) budgetMax?: number;
  @IsOptional() @IsDateString() deadline?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(15) @IsString({ each: true }) skillIds?: string[];
}

export class BrowseProjectsDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() skillId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minBudget?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxBudget?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
  @IsOptional() @IsIn(['newest', 'budget']) sort?: 'newest' | 'budget';
}
