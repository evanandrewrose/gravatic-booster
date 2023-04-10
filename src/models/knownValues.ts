// Values here are mostly to add to the type system and improve usability of the API. However, it's possible that
// these values might need to be updated in the future if Blizzard changes them.
export const GLOBAL_GATEWAY_ID = 0; // meta id, not a real gateway

export type RealGateways =
  | "U.S. West"
  | "U.S. East"
  | "Europe"
  | "Asia"
  | "Korea";
export type MetaGateways = "Global";
export type Gateways = RealGateways | MetaGateways;

export type RealRegion = "usw" | "use" | "eu" | "asia" | "kr";
export type MetaRegion = "global";
export type Region = RealRegion | MetaRegion;

export const GameModeId1v1 = 1;
export type GameModeId = typeof GameModeId1v1;

export type PlayerIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type TeamNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type GameResultPlayerType = "none" | "player" | "ai";
export type GameResult = "win" | "loss" | "draw" | "undecided" | "unknown";
export type Race = "terran" | "protoss" | "zerg" | "random";

// /web-api/v2/aurora-profile-by-toon/dex9/10?request_flags=scr_profile
// @ game_results[].players[].result
export const GAME_RESULT_UNDECIDED = 0;
export const GAME_RESULT_WIN = 1;
export const GAME_RESULT_LOSS = 2;
export const GAME_RESULT_DRAW = 3;
export const GAME_RESULT_UNKNOWN = 3;

// /web-api/v1/web-api/v1/leaderboard/12941/
export const LEADERBOARD_RANKING_INDEX_RANK = 0;
export const LEADERBOARD_RANKING_INDEX_LAST_RANK = 1;
export const LEADERBOARD_RANKING_INDEX_GATEWAY_ID = 2;
export const LEADERBOARD_RANKING_INDEX_POINTS = 3;
export const LEADERBOARD_RANKING_INDEX_WINS = 4;
export const LEADERBOARD_RANKING_INDEX_LOSSES = 5;
export const LEADERBOARD_RANKING_INDEX_DISCONNECTS = 6;
export const LEADERBOARD_RANKING_INDEX_TOON = 7;
export const LEADERBOARD_RANKING_INDEX_BATTLETAG = 8;
export const LEADERBOARD_RANKING_INDEX_AVATAR = 9;
export const LEADERBOARD_RANKING_INDEX_FEATURE_STAT = 10;
export const LEADERBOARD_RANKING_INDEX_RATING = 11;
export const LEADERBOARD_RANKING_INDEX_BUCKET = 12;

// /web-api/v2/aurora-profile-by-toon/dex9/10?request_flags=scr_profile
// @ replays[].attributes[].replay_game_speed
export const GAME_SPEED_FASTEST = 6;
export const GAME_SPEED_FASTER = 5;
export const GAME_SPEED_FAST = 4;
export const GAME_SPEED_NORMAL = 3;
export const GAME_SPEED_SLOW = 2;
export const GAME_SPEED_SLOWER = 1;
export const GAME_SPEED_SLOWEST = 0;

export const MAP_TILESET_BADLANDS = 0;
export const MAP_TILESET_SPACE_PLATFORM = 1;
export const MAP_TILESET_INSTALLATION = 2;
export const MAP_TILESET_ASHWORLD = 3;
export const MAP_TILESET_JUNGLE = 4;
export const MAP_TILESET_DESERT = 5;
export const MAP_TILESET_ARCTIC = 6;
export const MAP_TILESET_TWILIGHT = 7;

// /web-api/v2/aurora-profile-by-toon/dex9/10?request_flags=scr_profile
// @ replays[].attributes[].replay_player_types
export const PLAYER_TYPE_HUMAN = 1;
export const PLAYER_TYPE_AI = 0;
