export * from './minecraft';
export * from './pack';
export * from './texture';

export type NonEmptyArray<T> = [T, ...T[]];
export type HTTPException = {
  status: number;
  message: string;
};
