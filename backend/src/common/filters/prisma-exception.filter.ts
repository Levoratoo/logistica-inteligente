import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception.code === 'P2002') {
      const error = new ConflictException('Resource already exists');
      return response.status(error.getStatus()).json({
        statusCode: error.getStatus(),
        message: error.message,
      });
    }

    if (exception.code === 'P2025') {
      const error = new NotFoundException('Resource not found');
      return response.status(error.getStatus()).json({
        statusCode: error.getStatus(),
        message: error.message,
      });
    }

    return response.status(400).json({
      statusCode: 400,
      message: exception.message,
    });
  }
}
