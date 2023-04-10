// various helpers and types to support transformations on the original API

import { UnexpectedAPIResponseError } from "@/errors";
import {
  GAME_SPEED_FAST,
  GAME_SPEED_FASTER,
  GAME_SPEED_FASTEST,
  GAME_SPEED_NORMAL,
  GAME_SPEED_SLOW,
  GAME_SPEED_SLOWER,
  GAME_SPEED_SLOWEST,
  GameModeId,
  GameResult,
  MAP_TILESET_ARCTIC,
  MAP_TILESET_ASHWORLD,
  MAP_TILESET_BADLANDS,
  MAP_TILESET_DESERT,
  MAP_TILESET_INSTALLATION,
  MAP_TILESET_JUNGLE,
  MAP_TILESET_SPACE_PLATFORM,
  MAP_TILESET_TWILIGHT,
  Race,
} from "@/models/knownValues";
import { GravaticBoosterLogger } from "@/utils/logger";

export type PlayerType = "human" | "ai";
export type Tier = "S" | "A" | "B" | "C" | "D" | "E" | "F" | "Unranked"; // aka rank, aka bucket
export type FeaturedRace = "terran" | "protoss" | "zerg";

export type GameSpeed =
  | "fastest"
  | "faster"
  | "fast"
  | "normal"
  | "slow"
  | "slower"
  | "slowest"
  | "unknown";

export type MapTileset =
  | "badlands"
  | "space_platform"
  | "installation"
  | "ashworld"
  | "jungle"
  | "desert"
  | "arctic"
  | "twilight";

export type GameMode = "1v1";

export type MapId = string;
export type SeasonNumber = number;
export type Toon = string;

export const bucketToTier = (bucket: number): Tier => {
  switch (bucket) {
    case 7:
      return "S";
    case 6:
      return "A";
    case 5:
      return "B";
    case 4:
      return "C";
    case 3:
      return "D";
    case 2:
      return "E";
    case 1:
      return "F";
    case 0:
      return "Unranked";
    default:
      throw new Error(`Unknown bucket: ${bucket}`);
  }
};

export const tilesetFromId = (id: number): MapTileset => {
  switch (id) {
    case MAP_TILESET_BADLANDS:
      return "badlands";
    case MAP_TILESET_SPACE_PLATFORM:
      return "space_platform";
    case MAP_TILESET_INSTALLATION:
      return "installation";
    case MAP_TILESET_ASHWORLD:
      return "ashworld";
    case MAP_TILESET_JUNGLE:
      return "jungle";
    case MAP_TILESET_DESERT:
      return "desert";
    case MAP_TILESET_ARCTIC:
      return "arctic";
    case MAP_TILESET_TWILIGHT:
      return "twilight";
    default:
      // tilesets are known, so this shouldn't happen
      throw new UnexpectedAPIResponseError(`Unknown tileset id: ${id}`);
  }
};

export const gameSpeedFromGameSpeedIdString = (
  gameSpeedId: string
): GameSpeed => {
  switch (parseInt(gameSpeedId)) {
    case GAME_SPEED_FASTEST:
      return "fastest";
    case GAME_SPEED_FAST:
      return "fast";
    case GAME_SPEED_FASTER:
      return "faster";
    case GAME_SPEED_NORMAL:
      return "normal";
    case GAME_SPEED_SLOW:
      return "slow";
    case GAME_SPEED_SLOWER:
      return "slower";
    case GAME_SPEED_SLOWEST:
      return "slowest";
  }

  // it seems that for some ums maps, the speed values are not as listed above, so we'll just use 'unknown' until we decode them
  GravaticBoosterLogger.instance.error(
    `Unknown game speed id: ${gameSpeedId}, defaulting to "unknown"`
  );

  return "unknown";
};

export const normalizeRace = (firstLetter: string): Race => {
  switch (firstLetter[0].toLowerCase()) {
    case "p":
      return "protoss";
    case "t":
      return "terran";
    case "z":
      return "zerg";
    case "r":
      return "random";
  }

  throw new UnexpectedAPIResponseError(
    "received invalid race from API (letter: " + firstLetter + ")"
  );
};

export const normalizeGameResultString = (result: string): GameResult => {
  switch (result[0].toLowerCase()) {
    case "w":
      return "win";
    case "l":
      return "loss";
    case "d":
      return "draw";
    case "u":
      return "undecided";
  }

  throw new UnexpectedAPIResponseError(
    `received invalid game result from API (result: ${result})`
  );
};

export const gameModeIdFromGameModeString = (
  gameMode: GameMode
): GameModeId => {
  switch (gameMode) {
    case "1v1":
      return 1;
  }
};

export const gameModeStringFromGameModeId = (gameModeId: number): GameMode => {
  switch (gameModeId) {
    case 1:
      return "1v1";
    default:
      throw new UnexpectedAPIResponseError(
        `received invalid game mode id from API (gameModeId: ${gameModeId})`
      );
  }
};
