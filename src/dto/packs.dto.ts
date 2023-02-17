import { TMinecraftPackType, TMinecraftEdition, TMinecraftPackResolution } from 'src/types';

export class CreatePackDto {
  name: string;
  description: string;
  type: TMinecraftPackType;
  edition: TMinecraftEdition;
  resolution: TMinecraftPackResolution;
}

export class UpdatePackDto extends CreatePackDto {}
