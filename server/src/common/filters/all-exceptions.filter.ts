import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    this.logger.error(`[${request.method}] ${request.url} -> ${status}: ${exception instanceof Error ? exception.message : 'Unknown error'}`);
    if (exception instanceof Error && exception.stack) {
      this.logger.error(exception.stack);
    }

    const errorMessage = exception instanceof Error ? exception.message : 'Unknown error';
    const errorStack = exception instanceof Error ? exception.stack?.split('\n').slice(0, 5).join('\n') : '';

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message || errorMessage,
      errorType: exception?.constructor?.name || 'Unknown',
      detail: errorMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
