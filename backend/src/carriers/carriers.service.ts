import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CarrierQueryDto } from './dto/carrier-query.dto';
import { CreateCarrierDto } from './dto/create-carrier.dto';
import { UpdateCarrierDto } from './dto/update-carrier.dto';

@Injectable()
export class CarriersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: CarrierQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const where = this.buildWhere(query);

    const [data, total] = await Promise.all([
      this.prisma.carrier.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { containers: true },
          },
        },
      }),
      this.prisma.carrier.count({ where }),
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
    const carrier = await this.prisma.carrier.findUnique({
      where: { id },
      include: {
        containers: {
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!carrier) {
      throw new NotFoundException('Carrier not found');
    }

    return carrier;
  }

  async create(createCarrierDto: CreateCarrierDto) {
    return this.prisma.carrier.create({
      data: {
        ...createCarrierDto,
        status: createCarrierDto.status ?? 'DISPONIVEL',
      },
    });
  }

  async update(id: string, updateCarrierDto: UpdateCarrierDto) {
    await this.findOne(id);
    return this.prisma.carrier.update({
      where: { id },
      data: {
        ...(updateCarrierDto.name ? { name: updateCarrierDto.name } : {}),
        ...(updateCarrierDto.cnpj ? { cnpj: updateCarrierDto.cnpj } : {}),
        ...(updateCarrierDto.driverName
          ? { driverName: updateCarrierDto.driverName }
          : {}),
        ...(updateCarrierDto.truckPlate
          ? { truckPlate: updateCarrierDto.truckPlate }
          : {}),
        ...(updateCarrierDto.phone ? { phone: updateCarrierDto.phone } : {}),
        ...(updateCarrierDto.email ? { email: updateCarrierDto.email } : {}),
        ...(updateCarrierDto.status ? { status: updateCarrierDto.status } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.carrier.delete({
      where: { id },
    });

    return { success: true };
  }

  private buildWhere(query: CarrierQueryDto): Prisma.CarrierWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
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
                driverName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                cnpj: {
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
