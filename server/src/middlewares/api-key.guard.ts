import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');
    const validKey = process.env.API_KEY;

    if (!validKey) return true;
    if (!apiKey) {
      throw new HttpException('API key required', HttpStatus.UNAUTHORIZED);
    }
    if (apiKey !== validKey) {
      throw new HttpException('Invalid API key', HttpStatus.UNAUTHORIZED);
    }
    return true;
  }
}
