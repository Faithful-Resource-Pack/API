import type { HttpStatus } from '@nestjs/common';

export * from './minecraft';
export * from './pack';
export * from './texture';
export * from './user';
export * from './discord';

/**
 * Made the array non-empty by adding a required first element
 * @param {T} T The type of the array
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * HTTP Exception generic type for the API
 * @param {number} status The HTTP status code
 */
export type HTTPException = {
  status: HttpStatus;
  message: string;
};
