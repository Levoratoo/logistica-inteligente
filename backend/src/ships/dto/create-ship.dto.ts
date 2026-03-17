import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { shipStatuses } from '../../common/constants/logistics.constants';

export class CreateShipDto {
  @IsString()
  name!: string;

  @IsString()
  company!: string;

  @IsDateString()
  eta!: string;

  @IsOptional()
  @IsDateString()
  etd?: string;

  @IsString()
  origin!: string;

  @IsString()
  destination!: string;

  @IsOptional()
  @IsIn(shipStatuses)
  status?: (typeof shipStatuses)[number];

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  expectedContainers!: number;
}
