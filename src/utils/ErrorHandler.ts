import { HttpException, HttpStatus } from '@nestjs/common';

export default (status: HttpStatus, message: string, error?: any) => {
  throw new HttpException({ status: status, message: message, error }, status);
};
