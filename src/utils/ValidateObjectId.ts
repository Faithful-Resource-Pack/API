import { HttpStatus } from '@nestjs/common';
import ErrorHandler from './ErrorHandler';
import { isValidObjectId } from 'mongoose';

export default (id: string) => {
  if (!isValidObjectId(id)) ErrorHandler(HttpStatus.BAD_REQUEST, `The id "${id}" is not a valid UUID`);
};
