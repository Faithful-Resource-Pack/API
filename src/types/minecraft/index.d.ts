/**
 * Type for Minecraft pack types (for Java Edition only)
 */
export type TMinecraftPackType = 'resource_pack' | 'texture_pack';

/**
 * Type for Minecraft editions AKA Minecraft games
 */
export type TMinecraftEdition = 'java' | 'bedrock' | 'education' | 'dungeons' | 'legends';

/**
 * Type for Minecraft texture/resource pack resolutions
 */
export type TMinecraftPackResolution = 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096;

/**
 * Type for Minecraft texture extensions between editions
 */
export type TMinecraftTextureExtension = 'png' | 'tga';

/**
 * Type for Minecraft versions
 * @example '1.7.3' | '1.7.3-rc1' | '1.7.3-pre1' | 'b1.7.3' | 'b1.7.3_01' | 'b1.3b' // (wtf Mojang)
 */
export type TMinecraftVersion =
  | TMinecraftVersionStable
  | TMinecraftVersionReleaseCandidate
  | TMinecraftVersionPreRelease
  | TMinecraftVersionBeta
  | TMinecraftVersionSnapshot;

/**
 * Type for Minecraft versions
 * @example '1.7.3' | '1.0'
 */
export type TMinecraftVersionStable = `${number}.${number}.${number}` | `${number}.${number}`;

/**
 * Type for Minecraft release candidate versions
 * @example '1.7.3-rc1'
 */
export type TMinecraftVersionReleaseCandidate = `${TMinecraftVersionStable}-rc${number}`;

/**
 * Type for Minecraft pre-release versions
 * @example '1.7.3-pre1'
 */
export type TMinecraftVersionPreRelease = `${TMinecraftVersionStable}-pre${number}`;

/**
 * Type for Minecraft old beta versions
 * @example 'b1.7.3' | 'b1.7.3_01' | 'b1.3b' (wtf Mojang)
 */
export type TMinecraftVersionBeta =
  | `b${TMinecraftVersionStable}`
  | `b${TMinecraftVersionStable}_${number}`
  | `b${TMinecraftVersionStable}${string}`;

/**
 * Type for Minecraft snapshots versions
 * @example '20w06a'
 */
export type TMinecraftVersionSnapshot = `${number}w${number}${
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z'}`;
