import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SimulationsService {
  constructor(private readonly prisma: PrismaService) {}

  async simulateShipArrival(shipId: string) {
    const ship = await this.prisma.ship.findUnique({
      where: { id: shipId },
      include: {
        containers: true,
      },
    });

    if (!ship) {
      throw new NotFoundException('Ship not found');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.ship.update({
        where: { id: shipId },
        data: {
          status: 'ATRACADO',
          actualArrivalAt: now,
        },
      });

      for (const container of ship.containers) {
        if (
          container.status === 'AGUARDANDO_NAVIO' ||
          container.status === 'ATRASADO'
        ) {
          await tx.container.update({
            where: { id: container.id },
            data: {
              status: 'NO_PORTO',
              portEntryAt: container.portEntryAt ?? now,
              unloadedAt: container.unloadedAt ?? now,
            },
          });

          await tx.eventLog.createMany({
            data: [
              {
                containerId: container.id,
                type: 'NAVIO_CHEGOU',
                title: 'Navio atracado no porto',
                description: `O navio ${ship.name} chegou ao terminal e iniciou a operação.`,
                location: 'Terminal portuário',
                occurredAt: now,
              },
              {
                containerId: container.id,
                type: 'CONTAINER_DESCARREGADO',
                title: 'Contêiner descarregado',
                description: `O contêiner ${container.containerCode} foi descarregado e está no pátio.`,
                location: 'Pátio alfandegado',
                occurredAt: now,
              },
            ],
          });
        }
      }
    });

    return this.prisma.ship.findUnique({
      where: { id: shipId },
      include: {
        containers: true,
      },
    });
  }

  async simulateCustomsRelease(containerId: string) {
    const container = await this.prisma.container.findUnique({
      where: { id: containerId },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    if (
      !['NO_PORTO', 'EM_FISCALIZACAO', 'ATRASADO'].includes(container.status)
    ) {
      throw new BadRequestException(
        'Container must be in port or under inspection before release.',
      );
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      if (container.status === 'NO_PORTO' || container.status === 'ATRASADO') {
        await tx.eventLog.create({
          data: {
            containerId,
            type: 'EM_FISCALIZACAO',
            title: 'Fiscalização iniciada',
            description:
              'A carga entrou em processo de fiscalização aduaneira.',
            location: 'Receita Federal',
            occurredAt: now,
          },
        });
      }

      await tx.eventLog.create({
        data: {
          containerId,
          type: 'LIBERADO',
          title: 'Carga liberada',
          description:
            'A fiscalização foi concluída e a carga está pronta para expedição.',
          location: 'Receita Federal',
          occurredAt: now,
        },
      });

      return tx.container.update({
        where: { id: containerId },
        data: {
          status: 'LIBERADO',
          inspectionStartedAt: container.inspectionStartedAt ?? now,
          customsReleasedAt: now,
        },
        include: {
          ship: true,
          carrier: true,
          events: { orderBy: { occurredAt: 'asc' } },
        },
      });
    });
  }

  async simulateDispatch(containerId: string) {
    const container = await this.prisma.container.findUnique({
      where: { id: containerId },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    if (container.status !== 'LIBERADO') {
      throw new BadRequestException(
        'Container must be released before transport dispatch.',
      );
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.container.update({
        where: { id: containerId },
        data: {
          status: 'EM_TRANSPORTE',
          transportStartedAt: now,
        },
        include: {
          ship: true,
          carrier: true,
          events: { orderBy: { occurredAt: 'asc' } },
        },
      });

      await tx.eventLog.create({
        data: {
          containerId,
          type: 'SAIU_PARA_TRANSPORTE',
          title: 'Saída para transporte',
          description:
            'O contêiner deixou o porto e iniciou a etapa rodoviária.',
          location: 'Gate out do terminal',
          occurredAt: now,
        },
      });

      if (container.carrierId) {
        await tx.carrier.update({
          where: { id: container.carrierId },
          data: {
            status: 'EM_OPERACAO',
          },
        });
      }

      return updated;
    });
  }

  async simulateDelivery(containerId: string) {
    const container = await this.prisma.container.findUnique({
      where: { id: containerId },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    if (container.status !== 'EM_TRANSPORTE') {
      throw new BadRequestException(
        'Container must be in transit before final delivery.',
      );
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.container.update({
        where: { id: containerId },
        data: {
          status: 'ENTREGUE',
          deliveredAt: now,
        },
        include: {
          ship: true,
          carrier: true,
          events: { orderBy: { occurredAt: 'asc' } },
        },
      });

      await tx.eventLog.create({
        data: {
          containerId,
          type: 'ENTREGUE',
          title: 'Entrega concluída',
          description:
            'A unidade foi entregue ao destino final com confirmação operacional.',
          location: updated.destination,
          occurredAt: now,
        },
      });

      if (container.carrierId) {
        const activeAssignments = await tx.container.count({
          where: {
            carrierId: container.carrierId,
            status: 'EM_TRANSPORTE',
          },
        });

        if (activeAssignments === 0) {
          await tx.carrier.update({
            where: { id: container.carrierId },
            data: {
              status: 'DISPONIVEL',
            },
          });
        }
      }

      return updated;
    });
  }
}
