import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContainerQueryDto } from './dto/container-query.dto';
import { CreateContainerDto } from './dto/create-container.dto';
import { UpdateContainerDto } from './dto/update-container.dto';

@Injectable()
export class ContainersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ContainerQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const where = this.buildWhere(query);

    const [data, total] = await Promise.all([
      this.prisma.container.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          ship: true,
          carrier: true,
        },
      }),
      this.prisma.container.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findOne(id: string) {
    const container = await this.prisma.container.findUnique({
      where: { id },
      include: {
        ship: true,
        carrier: true,
        events: {
          orderBy: { occurredAt: 'asc' },
        },
      },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    return container;
  }

  async findByCode(containerCode: string) {
    const container = await this.prisma.container.findUnique({
      where: { containerCode: containerCode.toUpperCase() },
      include: {
        ship: true,
        carrier: true,
        events: {
          orderBy: { occurredAt: 'asc' },
        },
      },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    return container;
  }

  async create(createContainerDto: CreateContainerDto) {
    return this.prisma.$transaction(async (tx) => {
      const container = await tx.container.create({
        data: {
          ...this.mapDates(createContainerDto),
          containerCode: createContainerDto.containerCode.toUpperCase(),
          type: createContainerDto.type,
          weight: createContainerDto.weight,
          cargoDescription: createContainerDto.cargoDescription,
          clientName: createContainerDto.clientName,
          origin: createContainerDto.origin,
          destination: createContainerDto.destination,
          status: createContainerDto.status ?? 'AGUARDANDO_NAVIO',
          shipId: createContainerDto.shipId,
          carrierId: createContainerDto.carrierId,
          sealNumber: createContainerDto.sealNumber,
          notes: createContainerDto.notes,
        },
      });

      await tx.eventLog.create({
        data: {
          containerId: container.id,
          type: 'NAVIO_PREVISTO',
          title: 'Container cadastrado na operação',
          description: `Programação inicial registrada para o contêiner ${container.containerCode}.`,
          location: 'Planejamento operacional',
        },
      });

      return tx.container.findUniqueOrThrow({
        where: { id: container.id },
        include: {
          ship: true,
          carrier: true,
          events: {
            orderBy: { occurredAt: 'asc' },
          },
        },
      });
    });
  }

  async update(id: string, updateContainerDto: UpdateContainerDto) {
    const existing = await this.prisma.container.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Container not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.container.update({
        where: { id },
        data: {
          ...this.mapDates(updateContainerDto),
          ...(updateContainerDto.containerCode
            ? { containerCode: updateContainerDto.containerCode.toUpperCase() }
            : {}),
          ...(updateContainerDto.type ? { type: updateContainerDto.type } : {}),
          ...(typeof updateContainerDto.weight === 'number'
            ? { weight: updateContainerDto.weight }
            : {}),
          ...(updateContainerDto.cargoDescription
            ? { cargoDescription: updateContainerDto.cargoDescription }
            : {}),
          ...(updateContainerDto.clientName
            ? { clientName: updateContainerDto.clientName }
            : {}),
          ...(updateContainerDto.origin
            ? { origin: updateContainerDto.origin }
            : {}),
          ...(updateContainerDto.destination
            ? { destination: updateContainerDto.destination }
            : {}),
          ...(updateContainerDto.status
            ? { status: updateContainerDto.status }
            : {}),
          ...(updateContainerDto.shipId !== undefined
            ? { shipId: updateContainerDto.shipId }
            : {}),
          ...(updateContainerDto.carrierId !== undefined
            ? { carrierId: updateContainerDto.carrierId }
            : {}),
          ...(updateContainerDto.sealNumber !== undefined
            ? { sealNumber: updateContainerDto.sealNumber }
            : {}),
          ...(updateContainerDto.notes !== undefined
            ? { notes: updateContainerDto.notes }
            : {}),
        },
      });

      if (
        updateContainerDto.status &&
        updateContainerDto.status !== existing.status
      ) {
        await tx.eventLog.create({
          data: {
            containerId: id,
            type: 'STATUS_ATUALIZADO',
            title: 'Status atualizado manualmente',
            description: `Status alterado de ${existing.status} para ${updateContainerDto.status}.`,
            location: 'Painel administrativo',
          },
        });
      }

      return tx.container.findUniqueOrThrow({
        where: { id },
        include: {
          ship: true,
          carrier: true,
          events: {
            orderBy: { occurredAt: 'asc' },
          },
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.container.delete({
      where: { id },
    });

    return { success: true };
  }

  private buildWhere(query: ContainerQueryDto): Prisma.ContainerWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.shipId ? { shipId: query.shipId } : {}),
      ...(query.carrierId ? { carrierId: query.carrierId } : {}),
      ...(query.origin
        ? {
            origin: {
              contains: query.origin,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.destination
        ? {
            destination: {
              contains: query.destination,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                containerCode: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                cargoDescription: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                clientName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
  }

  private mapDates(
    dto: Partial<
      Pick<
        CreateContainerDto,
        | 'eta'
        | 'bookingDate'
        | 'portEntryAt'
        | 'unloadedAt'
        | 'inspectionStartedAt'
        | 'customsReleasedAt'
        | 'transportStartedAt'
        | 'deliveredAt'
      >
    >,
  ) {
    return {
      ...(dto.eta ? { eta: new Date(dto.eta) } : {}),
      ...(dto.bookingDate ? { bookingDate: new Date(dto.bookingDate) } : {}),
      ...(dto.portEntryAt ? { portEntryAt: new Date(dto.portEntryAt) } : {}),
      ...(dto.unloadedAt ? { unloadedAt: new Date(dto.unloadedAt) } : {}),
      ...(dto.inspectionStartedAt
        ? { inspectionStartedAt: new Date(dto.inspectionStartedAt) }
        : {}),
      ...(dto.customsReleasedAt
        ? { customsReleasedAt: new Date(dto.customsReleasedAt) }
        : {}),
      ...(dto.transportStartedAt
        ? { transportStartedAt: new Date(dto.transportStartedAt) }
        : {}),
      ...(dto.deliveredAt ? { deliveredAt: new Date(dto.deliveredAt) } : {}),
    };
  }
}
