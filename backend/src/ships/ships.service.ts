import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShipDto } from './dto/create-ship.dto';
import { ShipQueryDto } from './dto/ship-query.dto';
import { UpdateShipDto } from './dto/update-ship.dto';

@Injectable()
export class ShipsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ShipQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const where = this.buildWhere(query);

    const [data, total] = await Promise.all([
      this.prisma.ship.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { eta: 'asc' },
        include: {
          _count: {
            select: { containers: true },
          },
        },
      }),
      this.prisma.ship.count({ where }),
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
    const ship = await this.prisma.ship.findUnique({
      where: { id },
      include: {
        containers: {
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!ship) {
      throw new NotFoundException('Ship not found');
    }

    return ship;
  }

  async create(createShipDto: CreateShipDto) {
    return this.prisma.ship.create({
      data: {
        name: createShipDto.name,
        company: createShipDto.company,
        eta: new Date(createShipDto.eta),
        etd: createShipDto.etd ? new Date(createShipDto.etd) : undefined,
        origin: createShipDto.origin,
        destination: createShipDto.destination,
        status: createShipDto.status ?? 'PREVISTO',
        expectedContainers: createShipDto.expectedContainers,
      },
    });
  }

  async update(id: string, updateShipDto: UpdateShipDto) {
    await this.findOne(id);
    return this.prisma.ship.update({
      where: { id },
      data: {
        ...(updateShipDto.name ? { name: updateShipDto.name } : {}),
        ...(updateShipDto.company ? { company: updateShipDto.company } : {}),
        ...(updateShipDto.eta ? { eta: new Date(updateShipDto.eta) } : {}),
        ...(updateShipDto.etd ? { etd: new Date(updateShipDto.etd) } : {}),
        ...(updateShipDto.origin ? { origin: updateShipDto.origin } : {}),
        ...(updateShipDto.destination
          ? { destination: updateShipDto.destination }
          : {}),
        ...(updateShipDto.status ? { status: updateShipDto.status } : {}),
        ...(typeof updateShipDto.expectedContainers === 'number'
          ? { expectedContainers: updateShipDto.expectedContainers }
          : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.ship.delete({
      where: { id },
    });

    return { success: true };
  }

  private buildWhere(query: ShipQueryDto): Prisma.ShipWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
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
                name: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                company: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
  }
}
