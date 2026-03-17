import { Injectable } from '@nestjs/common';
import { format, subDays } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const today = new Date();
    const windowStart = subDays(today, 6);

    const [
      containersByStatus,
      upcomingShips,
      recentEvents,
      deliveredContainers,
      eventWindow,
      containers,
    ] = await Promise.all([
      this.prisma.container.groupBy({
        by: ['status'],
        _count: {
          _all: true,
        },
      }),
      this.prisma.ship.findMany({
        where: {
          eta: {
            gte: today,
          },
        },
        orderBy: { eta: 'asc' },
        take: 5,
      }),
      this.prisma.eventLog.findMany({
        orderBy: { occurredAt: 'desc' },
        take: 6,
        include: {
          container: {
            select: {
              containerCode: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.container.findMany({
        where: {
          deliveredAt: {
            not: null,
          },
          portEntryAt: {
            not: null,
          },
        },
        select: {
          deliveredAt: true,
          portEntryAt: true,
        },
      }),
      this.prisma.eventLog.findMany({
        where: {
          occurredAt: {
            gte: windowStart,
          },
        },
        orderBy: { occurredAt: 'asc' },
      }),
      this.prisma.container.findMany(),
    ]);

    const statusMap = containersByStatus.reduce<Record<string, number>>(
      (accumulator, item) => {
        accumulator[item.status] = item._count._all;
        return accumulator;
      },
      {},
    );

    const movementByDay = Array.from({ length: 7 }).map((_, index) => {
      const date = subDays(today, 6 - index);
      const key = format(date, 'yyyy-MM-dd');
      const events = eventWindow.filter(
        (event) => format(event.occurredAt, 'yyyy-MM-dd') === key,
      );

      return {
        day: format(date, 'dd/MM'),
        totalMovements: events.length,
        discharges: events.filter(
          (event) => event.type === 'CONTAINER_DESCARREGADO',
        ).length,
        deliveries: events.filter((event) => event.type === 'ENTREGUE').length,
      };
    });

    const volumeByClient = Object.values(
      containers.reduce<
        Record<
          string,
          { client: string; totalContainers: number; totalWeight: number }
        >
      >((accumulator, container) => {
        const current = accumulator[container.clientName] ?? {
          client: container.clientName,
          totalContainers: 0,
          totalWeight: 0,
        };

        current.totalContainers += 1;
        current.totalWeight += container.weight;
        accumulator[container.clientName] = current;
        return accumulator;
      }, {}),
    ).sort((left, right) => right.totalContainers - left.totalContainers);

    const averageDeliveryTimeHours =
      deliveredContainers.length > 0
        ? Math.round(
            deliveredContainers.reduce((sum, container) => {
              const deliveredAt = container.deliveredAt?.getTime() ?? 0;
              const portEntryAt = container.portEntryAt?.getTime() ?? 0;
              return sum + (deliveredAt - portEntryAt) / (1000 * 60 * 60);
            }, 0) / deliveredContainers.length,
          )
        : 0;

    return {
      kpis: {
        containersInPort:
          (statusMap.NO_PORTO ?? 0) +
          (statusMap.EM_FISCALIZACAO ?? 0) +
          (statusMap.LIBERADO ?? 0),
        containersInTransport: statusMap.EM_TRANSPORTE ?? 0,
        containersDelivered: statusMap.ENTREGUE ?? 0,
        awaitingClearance: statusMap.EM_FISCALIZACAO ?? 0,
        expectedShips: upcomingShips.length,
        averageDeliveryTimeHours,
      },
      statusDistribution: Object.entries(statusMap).map(([status, total]) => ({
        status,
        total,
      })),
      movementByDay,
      volumeByClient,
      upcomingShips,
      delayedContainers: containers.filter(
        (container) => container.status === 'ATRASADO',
      ),
      recentEvents,
    };
  }
}
