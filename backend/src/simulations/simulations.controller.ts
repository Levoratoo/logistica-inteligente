import { Controller, Param, Post } from '@nestjs/common';
import { SimulationsService } from './simulations.service';

@Controller('simulations')
export class SimulationsController {
  constructor(private readonly simulationsService: SimulationsService) {}

  @Post('ships/:shipId/arrival')
  simulateShipArrival(@Param('shipId') shipId: string) {
    return this.simulationsService.simulateShipArrival(shipId);
  }

  @Post('containers/:containerId/customs-release')
  simulateCustomsRelease(@Param('containerId') containerId: string) {
    return this.simulationsService.simulateCustomsRelease(containerId);
  }

  @Post('containers/:containerId/dispatch')
  simulateDispatch(@Param('containerId') containerId: string) {
    return this.simulationsService.simulateDispatch(containerId);
  }

  @Post('containers/:containerId/delivery')
  simulateDelivery(@Param('containerId') containerId: string) {
    return this.simulationsService.simulateDelivery(containerId);
  }
}
