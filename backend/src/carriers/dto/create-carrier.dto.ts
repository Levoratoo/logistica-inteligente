import { IsEmail, IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { carrierStatuses } from '../../common/constants/logistics.constants';

export class CreateCarrierDto {
  @IsString()
  name!: string;

  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/)
  cnpj!: string;

  @IsString()
  driverName!: string;

  @IsString()
  truckPlate!: string;

  @IsString()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn(carrierStatuses)
  status?: (typeof carrierStatuses)[number];
}
