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
import { CarrierQueryDto } from './dto/carrier-query.dto';
import { CreateCarrierDto } from './dto/create-carrier.dto';
import { UpdateCarrierDto } from './dto/update-carrier.dto';
import { CarriersService } from './carriers.service';

@Controller('carriers')
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) {}

  @Get()
  findAll(@Query() query: CarrierQueryDto) {
    return this.carriersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.carriersService.findOne(id);
  }

  @Post()
  create(@Body() createCarrierDto: CreateCarrierDto) {
    return this.carriersService.create(createCarrierDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCarrierDto: UpdateCarrierDto) {
    return this.carriersService.update(id, updateCarrierDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.carriersService.remove(id);
  }
}
