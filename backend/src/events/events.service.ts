import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsQueryDto } from './dto/events-query.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: EventsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const where = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.containerId ? { containerId: query.containerId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.eventLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { occurredAt: 'desc' },
        include: {
          container: {
            select: {
              id: true,
              containerCode: true,
              status: true,
              clientName: true,
            },
          },
        },
      }),
      this.prisma.eventLog.count({ where }),
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

  async findByContainer(containerId: string) {
    return this.prisma.eventLog.findMany({
      where: { containerId },
      orderBy: { occurredAt: 'asc' },
    });
  }
}
