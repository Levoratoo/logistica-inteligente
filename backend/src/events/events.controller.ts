import { Controller, Get, Param, Query } from '@nestjs/common';
import { EventsQueryDto } from './dto/events-query.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(@Query() query: EventsQueryDto) {
    return this.eventsService.findAll(query);
  }

  @Get('container/:containerId')
  findByContainer(@Param('containerId') containerId: string) {
    return this.eventsService.findByContainer(containerId);
  }
}
