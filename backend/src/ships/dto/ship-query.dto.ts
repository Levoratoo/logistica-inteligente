import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { shipStatuses } from '../../common/constants/logistics.constants';

export class ShipQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(shipStatuses)
  status?: (typeof shipStatuses)[number];

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;
}
