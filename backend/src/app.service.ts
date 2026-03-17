import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'PortFlow API online';
  }

  getHealth() {
    return {
      name: 'PortFlow',
      status: 'ok',
      timestamp: new Date().toISOString(),
      modules: [
        'containers',
        'ships',
        'carriers',
        'events',
        'dashboard',
        'simulations',
      ],
    };
  }
}
