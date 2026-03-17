import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  containerStatuses,
  containerTypes,
} from '../../common/constants/logistics.constants';

export class CreateContainerDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  containerCode!: string;

  @IsIn(containerTypes)
  type!: (typeof containerTypes)[number];

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  weight!: number;

  @IsString()
  cargoDescription!: string;

  @IsString()
  clientName!: string;

  @IsString()
  origin!: string;

  @IsString()
  destination!: string;

  @IsOptional()
  @IsIn(containerStatuses)
  status?: (typeof containerStatuses)[number];

  @IsOptional()
  @IsString()
  shipId?: string;

  @IsOptional()
  @IsString()
  carrierId?: string;

  @IsOptional()
  @IsDateString()
  eta?: string;

  @IsOptional()
  @IsDateString()
  bookingDate?: string;

  @IsOptional()
  @IsDateString()
  portEntryAt?: string;

  @IsOptional()
  @IsDateString()
  unloadedAt?: string;

  @IsOptional()
  @IsDateString()
  inspectionStartedAt?: string;

  @IsOptional()
  @IsDateString()
  customsReleasedAt?: string;

  @IsOptional()
  @IsDateString()
  transportStartedAt?: string;

  @IsOptional()
  @IsDateString()
  deliveredAt?: string;

  @IsOptional()
  @IsString()
  sealNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
