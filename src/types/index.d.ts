export * from './minecraft';
export * from './pack';
export * from './texture';
export * from './user';
export * from './discord';

export type NonEmptyArray<T> = [T, ...T[]];
export type HTTPException = {
  status: number;
  message: string;
};
