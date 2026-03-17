import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateShipDto } from './dto/create-ship.dto';
import { ShipQueryDto } from './dto/ship-query.dto';
import { UpdateShipDto } from './dto/update-ship.dto';
import { ShipsService } from './ships.service';

@Controller('ships')
export class ShipsController {
  constructor(private readonly shipsService: ShipsService) {}

  @Get()
  findAll(@Query() query: ShipQueryDto) {
    return this.shipsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shipsService.findOne(id);
  }

  @Post()
  create(@Body() createShipDto: CreateShipDto) {
    return this.shipsService.create(createShipDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateShipDto: UpdateShipDto) {
    return this.shipsService.update(id, updateShipDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shipsService.remove(id);
  }
}
