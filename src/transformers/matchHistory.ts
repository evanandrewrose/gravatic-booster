import {
  KnownUnreconcilableEntityError,
  UnexpectedAPIResponseError,
} from "@/errors";
import { GravaticBooster } from "@/main";
import {
  bucketToTier,
  gameSpeedFromGameSpeedIdString,
  normalizeGameResultString,
  normalizeRace,
  tilesetFromId,
} from "@/models/common";
import { GatewayId } from "@/models/gateway";
import {
  Match,
  MatchMap,
  MatchPlayer,
  MatchPlayerProfileInfo,
  MatchPoints,
} from "@/models/matchHistory";
import { GravaticBoosterLogger } from "@/utils/logger";

type GameResultKeyValueObject = NonNullable<
  NonNullable<
    MatchMakerGameInfoByToonResponse[number][string]["players"][number][string]["game_result"]
  >
>;
type GameResultValue = NonNullable<GameResultKeyValueObject[string]>;

type PlayerKeyValueObject =
  MatchMakerGameInfoByToonResponse[number][string]["players"][number];
type PlayerValue = PlayerKeyValueObject[string];

import { MatchMakerGameInfoByToonResponse } from "bw-web-api";

const playerFromKeyValuePair = (
  playerInMatchResponse: PlayerKeyValueObject
): PlayerValue => {
  // similar to matches, players are each an object with a single key which is the player id,
  // but the player id doesn't seem useful, so we ignore it
  if (Object.keys(playerInMatchResponse).length !== 1) {
    throw new UnexpectedAPIResponseError(
      "Player object has more than one key?"
    );
  }

  const playerInfo = Object.values(playerInMatchResponse)[0];

  return playerInfo;
};

const playersFromMatchPlayerAndGameResultData = (
  matchPlayer: PlayerValue | null,
  toon: string,
  gameResult: GameResultValue
) => {
  if (!gameResult.attributes.race) {
    throw new UnexpectedAPIResponseError("Player has no race attribute?");
  }

  if (!gameResult.attributes.team) {
    throw new UnexpectedAPIResponseError("Player has no team attribute?");
  }

  const profileInfo = matchPlayer
    ? new MatchPlayerProfileInfo(
        matchPlayer.aurora_id,
        matchPlayer.avatar_url,
        matchPlayer.gateway_id,
        matchPlayer.info_attributes.player_battle_tag ?? null,
        matchPlayer.info_attributes.player_region ?? null,
        new MatchPoints(
          matchPlayer.score.base,
          matchPlayer.score.delta,
          bucketToTier(matchPlayer.score.bucket_old),
          bucketToTier(matchPlayer.score.bucket_new),
          matchPlayer.score.win_streak
        )
      )
    : null;

  return new MatchPlayer(
    parseInt(gameResult.attributes.gPlayerData_idx),
    normalizeRace(gameResult.attributes.race),
    toon,
    parseInt(gameResult.attributes.team),
    gameResult.is_computer || false,
    normalizeGameResultString(gameResult.result),
    profileInfo
  );
};

const correlatePlayersAndGameResults = (
  players: PlayerKeyValueObject[],
  gameResults: NonNullable<GameResultKeyValueObject>
): {
  player1: {
    toon: string;
    player: PlayerValue | null;
    gameResult: GameResultValue;
  };
  player2: {
    toon: string;
    player: PlayerValue | null;
    gameResult: GameResultValue;
  };
} => {
  const playerObjects = players.map((player) => playerFromKeyValuePair(player));

  // sometimes the game result object has an empty key, which we can ignore
  delete gameResults[""];

  if (Object.keys(gameResults).length > 2) {
    throw new UnexpectedAPIResponseError(
      `Game result object has more than two keys? (${
        Object.keys(gameResults).length
      })`
    );
  }

  const toon1 = Object.keys(gameResults)[0];
  const gameResult1 = Object.values(gameResults)[0];

  const toon2 = Object.keys(gameResults)[1];
  const gameResult2 = Object.values(gameResults)[1];

  if (gameResult1 === undefined) {
    throw new UnexpectedAPIResponseError("Game result 1 is undefined?");
  }

  if (gameResult2 === undefined) {
    throw new UnexpectedAPIResponseError("Game result 2 is undefined?");
  }

  const player1 = playerObjects.find((player) => player.name === toon1);
  const player2 = playerObjects.find((player) => player.name === toon2);

  return {
    player1: {
      toon: toon1,
      player: player1 ?? null,
      gameResult: gameResult1,
    },
    player2: {
      toon: toon2,
      player: player2 ?? null,
      gameResult: gameResult2,
    },
  };
};

const gameInfoFromMatchPlayers = (players: PlayerKeyValueObject[]) => {
  if (Object.keys(players).length === 0) {
    throw new UnexpectedAPIResponseError(
      "Match object has no players? (should have at least one)"
    );
  }

  // data is duplicated between the first player and the second player, so we only need to grab one of them
  const firstPlayer = playerFromKeyValuePair(players[0]); // first player is always present
  const secondPlayer = players[1] ? playerFromKeyValuePair(players[1]) : null; // second player is sometimes present

  const gameInfo = firstPlayer.game_info ?? secondPlayer?.game_info;

  if (gameInfo === undefined) {
    // happens sometimes, not much we can do about it
    throw new KnownUnreconcilableEntityError("Game info is undefined");
  }

  return gameInfo;
};

const playersFromMatchResponse = (
  playersResponse: MatchMakerGameInfoByToonResponse[number][string]["players"]
) => {
  // We have to execute some unfortunate logic to clean up this data. The players have some data about themselves and
  // we can have either 1 or 2 players that show up in the response. Within each player is a game_result object
  // which tells us more about each player, but there's no guaranteed way to tie the player to the additional info
  // in the game_result object, despite the game_result object indicating the name of the player, since two players
  // could have the same name as long as they're in different regions.
  //
  // That being said, the game_result json object keys are the player's name, so if two players have the same name, then
  // the json response from blizz is either going to be wrong or otherwise invalid anyway since keys have to be unique.
  // To further complicate things, game_result isn't guaranteed to be present for both players (rare), so in that case we take
  // whichever game result is available.
  const players = playersResponse.map(playerFromKeyValuePair);

  if (players.length > 2) {
    throw new UnexpectedAPIResponseError("More than two players in a match?");
  }

  const gameResults = players[0].game_result ?? players[1].game_result; // take the first defined game_result

  if (gameResults === undefined) {
    throw new KnownUnreconcilableEntityError("Game results are undefined?");
  }

  const { player1, player2 } = correlatePlayersAndGameResults(
    playersResponse,
    gameResults
  );

  return [
    playersFromMatchPlayerAndGameResultData(
      player1.player,
      player1.toon,
      player1.gameResult
    ),
    playersFromMatchPlayerAndGameResultData(
      player2.player,
      player2.toon,
      player2.gameResult
    ),
  ];
};

const matchResponseToMatch = (
  gb: GravaticBooster,
  requestedToon: string,
  requestedGatewayId: GatewayId,
  matchResponse: MatchMakerGameInfoByToonResponse[number]
): Match => {
  // for whatever reason, matches are each an object with a single key which is the match id
  if (Object.keys(matchResponse).length !== 1) {
    throw new UnexpectedAPIResponseError("Match object has more than one key?");
  }

  const matchId = Object.keys(matchResponse)[0];
  const matchInfo = matchResponse[matchId];

  let gameInfo;
  let players;

  try {
    gameInfo = gameInfoFromMatchPlayers(matchInfo.players);
  } catch (e) {
    GravaticBoosterLogger.instance.error(
      `Error parsing game info from match ${matchId}`,
      e
    );
    throw e;
  }

  try {
    players = playersFromMatchResponse(matchInfo.players);
  } catch (e) {
    GravaticBoosterLogger.instance.error(
      `Error parsing players from match ${matchId}`,
      e
    );
    throw e;
  }

  return new Match(
    gb,
    requestedToon,
    requestedGatewayId,
    new Date(parseInt(matchInfo.match_created) * 1000),
    parseInt(gameInfo.attributes.closed_slots),
    gameInfo.attributes.flags,
    gameSpeedFromGameSpeedIdString(gameInfo.attributes.game_speed),
    gameInfo.attributes.host_name,
    parseInt(gameInfo.attributes.net_turn_rate),
    new MatchMap(
      parseInt(gameInfo.attributes.map_crc),
      gameInfo.attributes.map_file_name,
      parseInt(gameInfo.attributes.map_file_size),
      parseInt(gameInfo.attributes.map_height),
      parseInt(gameInfo.attributes.map_width),
      gameInfo.attributes.map_md5,
      gameInfo.attributes.map_name,
      tilesetFromId(parseInt(gameInfo.attributes.map_tile_set))
    ),
    matchId,
    gameInfo.name,
    players
  );
};

export const matchHistoryFromBwApiResponse = (
  gb: GravaticBooster,
  requestedToon: string,
  requestedGatewayId: GatewayId,
  matchesResponse: MatchMakerGameInfoByToonResponse
): Match[] => {
  const matches: Match[] = [];

  for (const match of matchesResponse) {
    if (Object.keys(match).length !== 1) {
      throw new UnexpectedAPIResponseError("Match object has not one key?");
    }

    const matchId = Object.keys(match)[0];
    const matchInfo = match[matchId];

    let gameInfo;
    try {
      gameInfo = gameInfoFromMatchPlayers(matchInfo.players);
    } catch (e) {
      if (e instanceof KnownUnreconcilableEntityError) {
        // This is rare, but happens sometimes. We can't do anything about it, so we just skip it.
        continue;
      }

      throw e;
    }

    // ensure the match is 1v1 before processing. otherwise, skip. 2v2, etc. don't exist for ladder
    // yet, but hopefully this will prevent our code from breaking if they're implemented later,
    // hah! ... :(
    if (parseInt(gameInfo.attributes.players_max) !== 2) {
      GravaticBoosterLogger.instance.warn(
        "Match is not a 1v1 match, skipping..."
      );
      continue;
    }

    try {
      matches.push(
        matchResponseToMatch(gb, requestedToon, requestedGatewayId, match)
      );
    } catch (e) {
      if (e instanceof KnownUnreconcilableEntityError) {
        GravaticBoosterLogger.instance.warn(
          `A known data issue has occurred when processing ${matchId} (skipping): ${e.message}`
        );
        continue;
      }

      throw e;
    }
  }

  return matches;
};
