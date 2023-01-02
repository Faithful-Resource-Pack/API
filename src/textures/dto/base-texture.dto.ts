export class BaseTextureDto {
  id: number;
  type: 'atlas' | 'sprite' | 'tiled';
  packs: string[];
  configuration: null;
}
