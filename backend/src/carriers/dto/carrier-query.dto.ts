import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { carrierStatuses } from '../../common/constants/logistics.constants';

export class CarrierQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(carrierStatuses)
  status?: (typeof carrierStatuses)[number];
}
