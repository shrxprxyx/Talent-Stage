import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';

export class MilestoneInputDto {
  @IsString() @MinLength(3) @MaxLength(120)
  title: string;

  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(1_000_000)
  amount: number;

  @IsOptional() @IsDateString()
  dueDate?: string;
}

export class SetMilestonesDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10)
  @ValidateNested({ each: true }) @Type(() => MilestoneInputDto)
  milestones: MilestoneInputDto[];
}

export class SubmitDeliverableDto {
  @IsOptional() @IsString() @MaxLength(2000)
  note?: string;

  // storage keys; the file upload module comes later, so for now these are just stored as given
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(300, { each: true })
  fileKeys?: string[];
}

export class RevisionDto {
  @IsString() @MinLength(5) @MaxLength(2000)
  feedback: string;
}
