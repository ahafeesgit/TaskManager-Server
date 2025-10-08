import { Controller, applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export function ApiController(
  path: string,
  version: string = 'v1',
  tag?: string,
): ClassDecorator {
  return applyDecorators(
    Controller({
      path,
      version,
    }),
    ApiTags(tag || path),
  );
}
