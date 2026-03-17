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
import { ContainerQueryDto } from './dto/container-query.dto';
import { CreateContainerDto } from './dto/create-container.dto';
import { UpdateContainerDto } from './dto/update-container.dto';
import { ContainersService } from './containers.service';

@Controller('containers')
export class ContainersController {
  constructor(private readonly containersService: ContainersService) {}

  @Get()
  findAll(@Query() query: ContainerQueryDto) {
    return this.containersService.findAll(query);
  }

  @Get('tracking/:containerCode')
  findByCode(@Param('containerCode') containerCode: string) {
    return this.containersService.findByCode(containerCode);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.containersService.findOne(id);
  }

  @Post()
  create(@Body() createContainerDto: CreateContainerDto) {
    return this.containersService.create(createContainerDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContainerDto: UpdateContainerDto,
  ) {
    return this.containersService.update(id, updateContainerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.containersService.remove(id);
  }
}
