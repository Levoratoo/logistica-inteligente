import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { containerStatuses } from '../../common/constants/logistics.constants';

export class ContainerQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(containerStatuses)
  status?: (typeof containerStatuses)[number];

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  shipId?: string;

  @IsOptional()
  @IsString()
  carrierId?: string;
}
