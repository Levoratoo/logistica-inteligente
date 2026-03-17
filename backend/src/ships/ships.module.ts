import { Module } from '@nestjs/common';
import { ShipsController } from './ships.controller';
import { ShipsService } from './ships.service';

@Module({
  controllers: [ShipsController],
  providers: [ShipsService],
})
export class ShipsModule {}
