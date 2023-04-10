import { UnexpectedAPIResponseError } from "@/errors";
import { GravaticBooster } from "@/main";
import {
  Avatar,
  AvatarAchievement,
  CompetitiveGame,
  CompetitiveGamePlayer,
  FullAccount,
  FullAccountMinusGameHistory,
  FullProfile,
  Game,
  GamePlayRaceStats,
  GamePlayStats,
  GamePlayer,
  GameResultStats,
  LadderProfileData,
  MatchMakedStats,
  MinimalAccount,
  MinimalAccountWithGamesPlayedLastWeek,
  MinimalProfile,
  MinimalProfileWithGamesPlayedLastWeek,
} from "@/models/account";
import {
  GameMode,
  PlayerType,
  SeasonNumber,
  Toon,
  bucketToTier,
  gameModeStringFromGameModeId,
  gameSpeedFromGameSpeedIdString,
  normalizeRace,
} from "@/models/common";
import { GatewayId } from "@/models/gateway";
import {
  GameResultPlayerType as CompetitiveGamePlayerType,
  GAME_RESULT_DRAW,
  GAME_RESULT_LOSS,
  GAME_RESULT_UNDECIDED,
  GAME_RESULT_WIN,
  GameModeId1v1,
  GameResult,
  PLAYER_TYPE_AI,
  PLAYER_TYPE_HUMAN,
  PlayerIndex,
  TeamNumber,
} from "@/models/knownValues";
import { GravaticBoosterLogger } from "@/utils/logger";
import {
  AuroraProfileByToonScrMmGameLoadingResponse,
  AuroraProfileByToonScrMmGameLoadingResponsePlayerFound,
  AuroraProfileByToonScrProfileResponse,
  AuroraProfileByToonScrProfileResponsePlayerFound,
  AuroraProfileByToonScrToonInfoResponse,
  AuroraProfileByToonScrToonInfoResponsePlayerFound,
} from "bw-web-api";

const avatarsFromResponse = (
  avatarsListing: AuroraProfileByToonScrProfileResponse["avatars"],
  avatarsFramed: AuroraProfileByToonScrProfileResponse["avatars_framed"],
  avatarsUnlocked: AuroraProfileByToonScrProfileResponse["avatars_unlocked"]
) => {
  const avatars: Avatar[] = [];

  // iterate through keys and values for avatars unlocked
  avatars.push(
    ...Object.entries(avatarsUnlocked).map(([fileName, avatar]) => {
      return new Avatar(
        fileName,
        avatar.url,
        new AvatarAchievement(avatar.level, avatar.stat),
        false
      );
    })
  );

  avatars.push(
    ...Object.entries(avatarsFramed).map(([fileName, avatar]) => {
      return new Avatar(
        fileName,
        avatar.url,
        new AvatarAchievement(avatar.level, avatar.stat),
        true
      );
    })
  );

  // only insert avatars that are not already in the list
  for (const [fileName, url] of Object.entries(avatarsListing)) {
    if (avatars.find((avatar) => avatar.fileName === fileName)) {
      continue;
    }

    avatars.push(new Avatar(fileName, url, null, false));
  }

  return avatars;
};

const gameplayStatsFromResponse = (
  stats: AuroraProfileByToonScrProfileResponse["stats"][number]
) =>
  new GamePlayStats(
    parseInt(stats.benefactor_id),
    stats.raw.legacy_disconnects,
    stats.raw.legacy_losses,
    stats.raw.legacy_toon_creation_time,
    stats.raw.legacy_wins,
    new GamePlayRaceStats(
      stats.raw.protoss_apm_max,
      stats.raw.protoss_apm_min,
      stats.raw.protoss_apm_sum,
      stats.raw.protoss_disconnects_max,
      stats.raw.protoss_disconnects_min,
      stats.raw.protoss_disconnects_sum,
      stats.raw.protoss_draws_max,
      stats.raw.protoss_draws_min,
      stats.raw.protoss_draws_sum,
      stats.raw.protoss_losses_max,
      stats.raw.protoss_losses_min,
      stats.raw.protoss_losses_sum,
      stats.raw.protoss_play_time_max,
      stats.raw.protoss_play_time_min,
      stats.raw.protoss_play_time_sum,
      stats.raw.protoss_resources_gas_max,
      stats.raw.protoss_resources_gas_min,
      stats.raw.protoss_resources_gas_sum,
      stats.raw.protoss_resources_minerals_max,
      stats.raw.protoss_resources_minerals_min,
      stats.raw.protoss_resources_minerals_sum,
      stats.raw.protoss_resources_score_max,
      stats.raw.protoss_resources_score_min,
      stats.raw.protoss_resources_score_sum,
      stats.raw.protoss_resources_spent_max,
      stats.raw.protoss_resources_spent_min,
      stats.raw.protoss_resources_spent_sum,
      stats.raw.protoss_structures_constructed_max,
      stats.raw.protoss_structures_constructed_min,
      stats.raw.protoss_structures_constructed_sum,
      stats.raw.protoss_structures_lost_max,
      stats.raw.protoss_structures_lost_min,
      stats.raw.protoss_structures_lost_sum,
      stats.raw.protoss_structures_razed_max,
      stats.raw.protoss_structures_razed_min,
      stats.raw.protoss_structures_razed_sum,
      stats.raw.protoss_structures_score_max,
      stats.raw.protoss_structures_score_min,
      stats.raw.protoss_structures_score_sum,
      stats.raw.protoss_units_killed_max,
      stats.raw.protoss_units_killed_min,
      stats.raw.protoss_units_killed_sum,
      stats.raw.protoss_units_lost_max,
      stats.raw.protoss_units_lost_min,
      stats.raw.protoss_units_lost_sum,
      stats.raw.protoss_units_produced_max,
      stats.raw.protoss_units_produced_min,
      stats.raw.protoss_units_produced_sum,
      stats.raw.protoss_units_score_max,
      stats.raw.protoss_units_score_min,
      stats.raw.protoss_units_score_sum,
      stats.raw.protoss_wins_max,
      stats.raw.protoss_wins_min,
      stats.raw.protoss_wins_sum
    ),
    new GamePlayRaceStats(
      stats.raw.terran_apm_max,
      stats.raw.terran_apm_min,
      stats.raw.terran_apm_sum,
      stats.raw.terran_disconnects_max,
      stats.raw.terran_disconnects_min,
      stats.raw.terran_disconnects_sum,
      stats.raw.terran_draws_max,
      stats.raw.terran_draws_min,
      stats.raw.terran_draws_sum,
      stats.raw.terran_losses_max,
      stats.raw.terran_losses_min,
      stats.raw.terran_losses_sum,
      stats.raw.terran_play_time_max,
      stats.raw.terran_play_time_min,
      stats.raw.terran_play_time_sum,
      stats.raw.terran_resources_gas_max,
      stats.raw.terran_resources_gas_min,
      stats.raw.terran_resources_gas_sum,
      stats.raw.terran_resources_minerals_max,
      stats.raw.terran_resources_minerals_min,
      stats.raw.terran_resources_minerals_sum,
      stats.raw.terran_resources_score_max,
      stats.raw.terran_resources_score_min,
      stats.raw.terran_resources_score_sum,
      stats.raw.terran_resources_spent_max,
      stats.raw.terran_resources_spent_min,
      stats.raw.terran_resources_spent_sum,
      stats.raw.terran_structures_constructed_max,
      stats.raw.terran_structures_constructed_min,
      stats.raw.terran_structures_constructed_sum,
      stats.raw.terran_structures_lost_max,
      stats.raw.terran_structures_lost_min,
      stats.raw.terran_structures_lost_sum,
      stats.raw.terran_structures_razed_max,
      stats.raw.terran_structures_razed_min,
      stats.raw.terran_structures_razed_sum,
      stats.raw.terran_structures_score_max,
      stats.raw.terran_structures_score_min,
      stats.raw.terran_structures_score_sum,
      stats.raw.terran_units_killed_max,
      stats.raw.terran_units_killed_min,
      stats.raw.terran_units_killed_sum,
      stats.raw.terran_units_lost_max,
      stats.raw.terran_units_lost_min,
      stats.raw.terran_units_lost_sum,
      stats.raw.terran_units_produced_max,
      stats.raw.terran_units_produced_min,
      stats.raw.terran_units_produced_sum,
      stats.raw.terran_units_score_max,
      stats.raw.terran_units_score_min,
      stats.raw.terran_units_score_sum,
      stats.raw.terran_wins_max,
      stats.raw.terran_wins_min,
      stats.raw.terran_wins_sum
    ),
    new GamePlayRaceStats(
      stats.raw.zerg_apm_max,
      stats.raw.zerg_apm_min,
      stats.raw.zerg_apm_sum,
      stats.raw.zerg_disconnects_max,
      stats.raw.zerg_disconnects_min,
      stats.raw.zerg_disconnects_sum,
      stats.raw.zerg_draws_max,
      stats.raw.zerg_draws_min,
      stats.raw.zerg_draws_sum,
      stats.raw.zerg_losses_max,
      stats.raw.zerg_losses_min,
      stats.raw.zerg_losses_sum,
      stats.raw.zerg_play_time_max,
      stats.raw.zerg_play_time_min,
      stats.raw.zerg_play_time_sum,
      stats.raw.zerg_resources_gas_max,
      stats.raw.zerg_resources_gas_min,
      stats.raw.zerg_resources_gas_sum,
      stats.raw.zerg_resources_minerals_max,
      stats.raw.zerg_resources_minerals_min,
      stats.raw.zerg_resources_minerals_sum,
      stats.raw.zerg_resources_score_max,
      stats.raw.zerg_resources_score_min,
      stats.raw.zerg_resources_score_sum,
      stats.raw.zerg_resources_spent_max,
      stats.raw.zerg_resources_spent_min,
      stats.raw.zerg_resources_spent_sum,
      stats.raw.zerg_structures_constructed_max,
      stats.raw.zerg_structures_constructed_min,
      stats.raw.zerg_structures_constructed_sum,
      stats.raw.zerg_structures_lost_max,
      stats.raw.zerg_structures_lost_min,
      stats.raw.zerg_structures_lost_sum,
      stats.raw.zerg_structures_razed_max,
      stats.raw.zerg_structures_razed_min,
      stats.raw.zerg_structures_razed_sum,
      stats.raw.zerg_structures_score_max,
      stats.raw.zerg_structures_score_min,
      stats.raw.zerg_structures_score_sum,
      stats.raw.zerg_units_killed_max,
      stats.raw.zerg_units_killed_min,
      stats.raw.zerg_units_killed_sum,
      stats.raw.zerg_units_lost_max,
      stats.raw.zerg_units_lost_min,
      stats.raw.zerg_units_lost_sum,
      stats.raw.zerg_units_produced_max,
      stats.raw.zerg_units_produced_min,
      stats.raw.zerg_units_produced_sum,
      stats.raw.zerg_units_score_max,
      stats.raw.zerg_units_score_min,
      stats.raw.zerg_units_score_sum,
      stats.raw.zerg_wins_max,
      stats.raw.zerg_wins_min,
      stats.raw.zerg_wins_sum
    )
  );

const matchMakedStatsFromResponse = (
  toonStats: AuroraProfileByToonScrProfileResponse["matchmaked_stats"]
): Map<Toon, Map<SeasonNumber, Map<GameMode, MatchMakedStats>>> => {
  const matchMakedStats = new Map<
    Toon,
    Map<SeasonNumber, Map<GameMode, MatchMakedStats>>
  >();

  for (const stats of toonStats) {
    if (!matchMakedStats.has(stats.toon)) {
      matchMakedStats.set(stats.toon, new Map());
    }

    if (!matchMakedStats.get(stats.toon)?.get(stats.season_id)) {
      matchMakedStats.get(stats.toon)?.set(stats.season_id, new Map());
    }

    if (stats.game_mode_id !== GameModeId1v1) {
      GravaticBoosterLogger.instance.warn(
        `Unexpected game mode id: ${stats.game_mode_id}. Skipping.`
      );
      continue;
    }

    matchMakedStats
      .get(stats.toon)
      ?.get(stats.season_id)
      ?.set(gameModeStringFromGameModeId(stats.game_mode_id), {
        benefactorId: parseInt(stats.benefactor_id),
        tier: bucketToTier(stats.bucket),
        disconnects: stats.disconnects,
        gameMode: gameModeStringFromGameModeId(stats.game_mode_id),
        highestPoints: stats.highest_points,
        points: stats.points,
        rating: stats.rating,
        highestRating: stats.highest_rating,
        lossStreak: stats.loss_streak,
        losses: stats.losses,
        seasonId: stats.season_id,
        toon: stats.toon,
        toonGuid: stats.toon_guid,
        winStreak: stats.win_streak,
        wins: stats.wins,
      });
  }

  return matchMakedStats;
};

const gameplayStatsToToonSeasonMapping = (
  stats: AuroraProfileByToonScrProfileResponse["stats"]
): Map<Toon, Map<SeasonNumber, GamePlayStats>> => {
  const gamePlayStats = new Map<Toon, Map<SeasonNumber, GamePlayStats>>();

  for (const profileStats of stats) {
    const toon = profileStats["toon"];
    if (!gamePlayStats.has(toon)) {
      gamePlayStats.set(toon, new Map());
    }

    gamePlayStats
      .get(toon)
      ?.set(profileStats["season_id"], gameplayStatsFromResponse(profileStats));
  }

  return gamePlayStats;
};

const minimalProfileFromResponse = (
  gb: GravaticBooster,
  toonGuidByGateway: AuroraProfileByToonScrProfileResponse["toon_guid_by_gateway"],
  matchMakedStats: AuroraProfileByToonScrProfileResponse["matchmaked_stats"]
) => {
  const profiles: MinimalProfile[] = [];
  const mmStats = matchMakedStatsFromResponse(matchMakedStats);

  for (const [gatewayId, toonToGuid] of Object.entries(toonGuidByGateway)) {
    for (const [toon, toonGuid] of Object.entries(toonToGuid)) {
      profiles.push(
        new MinimalProfile(
          gb,
          toon,
          toonGuid,
          parseInt(gatewayId) as GatewayId,
          mmStats.get(toon) || new Map()
        )
      );
    }
  }

  return profiles;
};

const minimalProfileWithGamesPlayedLastWeek = (
  gb: GravaticBooster,
  toonGuidByGateway: AuroraProfileByToonScrProfileResponse["toon_guid_by_gateway"],
  matchMakedStats: AuroraProfileByToonScrProfileResponse["matchmaked_stats"],
  toons: AuroraProfileByToonScrProfileResponse["toons"]
) => {
  const profiles: MinimalProfileWithGamesPlayedLastWeek[] = [];
  const mmStats = matchMakedStatsFromResponse(matchMakedStats);

  for (const [gatewayId, toonToGuid] of Object.entries(toonGuidByGateway)) {
    for (const [toon, toonGuid] of Object.entries(toonToGuid)) {
      const correspondingToon = toons.find((t) => t.guid === toonGuid);
      if (!correspondingToon) {
        throw new UnexpectedAPIResponseError(
          `Could not find toon ${toonGuid} in toons list even though it's in toon_guid_by_gateway`
        );
      }

      profiles.push(
        new MinimalProfileWithGamesPlayedLastWeek(
          gb,
          toon,
          toonGuid,
          parseInt(gatewayId) as GatewayId,
          mmStats.get(toon) || new Map(),
          correspondingToon.games_last_week
        )
      );
    }
  }

  return profiles;
};

const fullProfile = (
  gb: GravaticBooster,
  profiles: AuroraProfileByToonScrProfileResponse["profiles"],
  toonGuidByGateway: AuroraProfileByToonScrProfileResponse["toon_guid_by_gateway"],
  stats: AuroraProfileByToonScrProfileResponse["stats"],
  matchMakedStats: AuroraProfileByToonScrProfileResponse["matchmaked_stats"],
  toons: AuroraProfileByToonScrProfileResponse["toons"],
  avatars: Avatar[]
) => {
  const fullProfiles: FullProfile[] = [];

  const mmStats = matchMakedStatsFromResponse(matchMakedStats);
  const gameplayStats = gameplayStatsToToonSeasonMapping(stats);

  for (const [gatewayId, toonToGuid] of Object.entries(toonGuidByGateway)) {
    for (const [toon, toonGuid] of Object.entries(toonToGuid)) {
      const correspondingToon = toons.find((t) => t.guid === toonGuid);
      const correspondingProfile = profiles?.find(
        (t) => t.toon_guid === toonGuid
      ); // no profile exists if profile is unranked, if no profiles are ranked, profiles is null

      if (!correspondingToon) {
        throw new UnexpectedAPIResponseError(
          `Could not find toon ${toonGuid} in toons list even though it's in toon_guid_by_gateway`
        );
      }

      fullProfiles.push(
        new FullProfile(
          gb,
          toon,
          toonGuid,
          parseInt(gatewayId) as GatewayId,
          gameplayStats.get(toon) || new Map(),
          mmStats.get(toon) || new Map(),
          correspondingToon.games_last_week,
          correspondingProfile
            ? new LadderProfileData(
                correspondingProfile.avatar_id,
                correspondingProfile.show_avatar_frame,
                correspondingProfile.description,
                correspondingProfile.title,
                avatars
              )
            : "PlayerIsUnranked"
        )
      );
    }
  }

  return fullProfiles;
};

export const accountFromBwApiResponseScrMmGameLoading = (
  gb: GravaticBooster,
  requestedToon: string,
  requestedGateway: GatewayId,
  response: AuroraProfileByToonScrMmGameLoadingResponse
) => {
  if (response.aurora_id === 0) {
    return null;
  }

  // todo: we need to fix this type to somehow indicate that aurora_id != 0 indicates that the player was found
  // and the other fields are valid
  response = response as AuroraProfileByToonScrMmGameLoadingResponsePlayerFound;

  return new MinimalAccount(
    requestedToon,
    requestedGateway,
    response.account_flags?.split(",") ?? [],
    response.aurora_id,
    response.battle_tag,
    response.country_code,
    response.matchmaked_current_season,
    response.matchmaked_current_season_buckets,
    minimalProfileFromResponse(
      gb,
      response.toon_guid_by_gateway,
      response.matchmaked_stats
    )
  );
};

export const accountFromBwApiResponseScrMmToonInfo = (
  gb: GravaticBooster,
  requestedToon: string,
  requestedGateway: GatewayId,
  response: AuroraProfileByToonScrMmGameLoadingResponse
) => {
  if (response.aurora_id === 0) {
    return null;
  }

  response = response as AuroraProfileByToonScrMmGameLoadingResponsePlayerFound;

  return new MinimalAccountWithGamesPlayedLastWeek(
    requestedToon,
    requestedGateway,
    response.account_flags?.split(",") ?? [],
    response.aurora_id,
    response.battle_tag,
    response.country_code,
    response.matchmaked_current_season,
    response.matchmaked_current_season_buckets,
    minimalProfileWithGamesPlayedLastWeek(
      gb,
      response.toon_guid_by_gateway,
      response.matchmaked_stats,
      response.toons
    )
  );
};

export const accountFromBwApiResponseScrToonInfo = (
  gb: GravaticBooster,
  requestedToon: string,
  requestedGateway: GatewayId,
  response: AuroraProfileByToonScrToonInfoResponse
) => {
  if (response.aurora_id === 0) {
    return null;
  }

  response = response as AuroraProfileByToonScrToonInfoResponsePlayerFound;

  const avatars = avatarsFromResponse(
    response.avatars,
    response.avatars_framed,
    response.avatars_unlocked
  );

  return new FullAccountMinusGameHistory(
    requestedToon,
    requestedGateway,
    response.account_flags?.split(",") ?? [],
    response.aurora_id,
    avatars,
    response.battle_tag,
    response.country_code,
    response.matchmaked_current_season,
    response.matchmaked_current_season_buckets,
    fullProfile(
      gb,
      response.profiles,
      response.toon_guid_by_gateway,
      response.stats,
      response.matchmaked_stats,
      response.toons,
      avatars
    )
  );
};

const playerTypeFromPlayerTypeIdString = (playerTypeId: string): PlayerType => {
  switch (parseInt(playerTypeId)) {
    case PLAYER_TYPE_HUMAN:
      return "human";
    case PLAYER_TYPE_AI:
      return "ai";
  }

  throw new UnexpectedAPIResponseError(
    "received invalid player type from API (id: " + playerTypeId + ")"
  );
};

const gameResultFromGameResultIdString = (gameResultId: string): GameResult => {
  switch (parseInt(gameResultId)) {
    case GAME_RESULT_WIN:
      return "win";
    case GAME_RESULT_LOSS:
      return "loss";
    case GAME_RESULT_DRAW:
      return "draw";
    case GAME_RESULT_UNDECIDED:
      return "undecided";
  }

  return "unknown";
};

const gamesFromResponse = (
  replays: AuroraProfileByToonScrProfileResponse["replays"]
) => {
  const games: Game[] = [];

  for (const replay of replays) {
    const names = replay.attributes.replay_player_names.split(",");
    const races = replay.attributes.replay_player_races.split(",");
    const types = replay.attributes.replay_player_types.split(",");

    if (names.length !== races.length) {
      throw new UnexpectedAPIResponseError(
        `Replay ${replay.link} has ${names.length} names but ${races.length} races`
      );
    } else if (names.length !== types.length) {
      throw new UnexpectedAPIResponseError(
        `Replay ${replay.link} has ${names.length} names but ${types.length} types`
      );
    }

    // map names, races, and types to a GamePlayer
    const players: GamePlayer[] = [];
    for (let i = 0; i < names.length; i++) {
      players.push(
        new GamePlayer(
          names[i],
          races[i] ? normalizeRace(races[i]) : null,
          playerTypeFromPlayerTypeIdString(types[i])
        )
      );
    }

    let game;
    try {
      game = new Game(
        replay.attributes.game_creator,
        parseInt(replay.attributes.game_id),
        replay.attributes.game_name,
        parseInt(replay.attributes.game_save_id),
        gameSpeedFromGameSpeedIdString(replay.attributes.game_speed),
        parseInt(replay.attributes.game_sub_type),
        parseInt(replay.attributes.game_type),
        parseInt(replay.attributes.map_era),
        parseInt(replay.attributes.map_height),
        parseInt(replay.attributes.map_width),
        replay.attributes.map_title,
        replay.attributes.replay_description,
        parseInt(replay.attributes.replay_humans),
        parseInt(replay.attributes.replay_map_number),
        parseInt(replay.attributes.replay_max_players),
        parseInt(replay.attributes.replay_min_players),
        parseInt(replay.attributes.replay_opponents),
        players,
        gameResultFromGameResultIdString(replay.attributes.replay_result),
        new Date(replay.create_time * 1000)
      );
    } catch (e) {
      throw new Error(`Error parsing game ${replay.attributes.game_id}: ${e}`);
    }

    games.push(game);
  }

  return games;
};

const competitiveGameStatsFromResponse = (
  stats: AuroraProfileByToonScrProfileResponse["game_results"][number]["players"][number]["stats"]
): GameResultStats | null => {
  if ("zerg_games_played" in stats) {
    return new GameResultStats(
      parseInt(stats.zerg_apm),
      parseInt(stats.zerg_play_time),
      parseInt(stats.zerg_resources_gas),
      parseInt(stats.zerg_resources_minerals),
      parseInt(stats.zerg_resources_score),
      parseInt(stats.zerg_resources_spent),
      parseInt(stats.zerg_score_overall),
      parseInt(stats.zerg_structures_constructed),
      parseInt(stats.zerg_structures_lost),
      parseInt(stats.zerg_structures_razed),
      parseInt(stats.zerg_structures_score),
      parseInt(stats.zerg_units_killed),
      parseInt(stats.zerg_units_lost),
      parseInt(stats.zerg_units_produced),
      parseInt(stats.zerg_units_score)
    );
  } else if ("protoss_games_played" in stats) {
    return new GameResultStats(
      parseInt(stats.protoss_apm),
      parseInt(stats.protoss_play_time),
      parseInt(stats.protoss_resources_gas),
      parseInt(stats.protoss_resources_minerals),
      parseInt(stats.protoss_resources_score),
      parseInt(stats.protoss_resources_spent),
      parseInt(stats.protoss_score_overall),
      parseInt(stats.protoss_structures_constructed),
      parseInt(stats.protoss_structures_lost),
      parseInt(stats.protoss_structures_razed),
      parseInt(stats.protoss_structures_score),
      parseInt(stats.protoss_units_killed),
      parseInt(stats.protoss_units_lost),
      parseInt(stats.protoss_units_produced),
      parseInt(stats.protoss_units_score)
    );
  } else if ("terran_games_played" in stats) {
    return new GameResultStats(
      parseInt(stats.terran_apm),
      parseInt(stats.terran_play_time),
      parseInt(stats.terran_resources_gas),
      parseInt(stats.terran_resources_minerals),
      parseInt(stats.terran_resources_score),
      parseInt(stats.terran_resources_spent),
      parseInt(stats.terran_score_overall),
      parseInt(stats.terran_structures_constructed),
      parseInt(stats.terran_structures_lost),
      parseInt(stats.terran_structures_razed),
      parseInt(stats.terran_structures_score),
      parseInt(stats.terran_units_killed),
      parseInt(stats.terran_units_lost),
      parseInt(stats.terran_units_produced),
      parseInt(stats.terran_units_score)
    );
  }

  return null;
};

const competitiveGamePlayerFromResponse = (
  player: AuroraProfileByToonScrProfileResponse["game_results"][number]["players"][number]
): CompetitiveGamePlayer | null => {
  if (
    !("team" in player.attributes) ||
    player.attributes.type === "none" ||
    player.toon === ""
  ) {
    return null;
  }

  return new CompetitiveGamePlayer(
    player.toon,
    parseInt(player.attributes.gPlayerData_idx) as PlayerIndex,
    parseInt(player.attributes.left) === 1,
    player.attributes.type as CompetitiveGamePlayerType,
    parseInt(player.attributes.team) as TeamNumber,
    player.result as GameResult,
    competitiveGameStatsFromResponse(player.stats)
  );
};

const competitiveGamesFromResponse = (
  gameResult: AuroraProfileByToonScrProfileResponse["game_results"]
): CompetitiveGame[] =>
  gameResult.map(
    (game) =>
      new CompetitiveGame(
        game.attributes.client_version,
        game.attributes.mapName,
        parseInt(game.attributes.tileset),
        parseInt(game.benefactor_id),
        new Date(parseInt(game.create_time) * 1000),
        parseInt(game.game_id),
        game.gateway_id as GatewayId,
        game.match_guid || null,
        game.players
          .map(competitiveGamePlayerFromResponse)
          .filter((p) => p !== null) as CompetitiveGamePlayer[]
      )
  );

export const accountFromBwApiResponseScrProfile = (
  gb: GravaticBooster,
  requestedToon: string,
  requestedGateway: GatewayId,
  response: AuroraProfileByToonScrProfileResponse
) => {
  if (response.aurora_id === 0) {
    return null;
  }

  response = response as AuroraProfileByToonScrProfileResponsePlayerFound;

  const avatars = avatarsFromResponse(
    response.avatars,
    response.avatars_framed,
    response.avatars_unlocked
  );

  return new FullAccount(
    requestedToon,
    requestedGateway,
    response.account_flags?.split(",") ?? [],
    response.aurora_id,
    avatars,
    response.battle_tag,
    response.country_code,
    // recent 25 games
    gamesFromResponse(response.replays),
    // recent 25 competitive games
    competitiveGamesFromResponse(response.game_results),
    response.matchmaked_current_season,
    response.matchmaked_current_season_buckets,
    fullProfile(
      gb,
      response.profiles,
      response.toon_guid_by_gateway,
      response.stats,
      response.matchmaked_stats,
      response.toons,
      avatars
    )
  );
};
