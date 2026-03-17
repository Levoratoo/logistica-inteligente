import { IsIn, IsOptional, IsString } from 'class-validator';
import { eventTypes } from '../../common/constants/logistics.constants';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class EventsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(eventTypes)
  type?: (typeof eventTypes)[number];

  @IsOptional()
  @IsString()
  containerId?: string;
}
