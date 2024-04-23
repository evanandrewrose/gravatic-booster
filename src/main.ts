import { SCApiWithCaching } from "@/api/SCApiWithCaching";
import { ContextualWindowsOrWSLClientProvider } from "@/api/client/provider";
import { ResilientBroodWarConnection } from "@/api/connection/ResilientBroodWarConnection";
import { EntityNotFoundError } from "@/errors";
import {
  FullAccount,
  FullAccountMinusGameHistory,
  MinimalAccount,
  MinimalAccountWithGamesPlayedLastWeek,
} from "@/models/account";
import { AccountRankings } from "@/models/accountRankings";
import { GameMode, MapId, SeasonNumber } from "@/models/common";
import {
  Gateway,
  GatewayId,
  GlobalGatewayId,
  knownGatewayConfig,
} from "@/models/gateway";
import {
  Race,
  RealGateways as RealGateway,
  RealRegion,
} from "@/models/knownValues";
import { Leaderboard } from "@/models/leaderboard";
import { Map as SCRMap } from "@/models/map";
import { Match } from "@/models/matchHistory";
import { MapStats } from "@/models/profileMapStats";
import { Ranking } from "@/models/ranking";
import { Replays } from "@/models/replays";
import {
  accountFromBwApiResponseScrMmGameLoading,
  accountFromBwApiResponseScrMmToonInfo,
  accountFromBwApiResponseScrProfile,
  accountFromBwApiResponseScrToonInfo,
} from "@/transformers/account";
import { accountRankingsFromRankingByToonResponse } from "@/transformers/accountRankings";
import { leaderboardsFromBwApiResponse } from "@/transformers/leaderboards";
import { mapsFromBwApiResponse } from "@/transformers/map";
import { matchHistoryFromBwApiResponse } from "@/transformers/matchHistory";
import { profileMapStatsFromResponse } from "@/transformers/profileMapStats";
import { rankingsFromLeaderboardEntity } from "@/transformers/rankings";
import { replaysFromBwApiResponse } from "@/transformers/replay";
import { GravaticBoosterLogger } from "@/utils/logger";
import { BroodWarConnection, ISCApi, SCApi } from "bw-web-api";
import { PlayerSearchResult } from "./models/playerSearchResult";
import { playerSearchResultFromBwApiResponse } from "./transformers/playerSearchResult";

export type LeaderboardLookupProps =
  | {
      leaderboardId: number;
    }
  | {
      gameMode?: GameMode;
      gateway?: GatewayId | typeof GlobalGatewayId;
      seasonId?: number;
    };

export type GatewayLookupProps =
  | {
      gateway: GatewayId;
    }
  | {
      region: RealRegion;
    };

export class GravaticBooster {
  private constructor(private api: ISCApi) {}

  static async create(api?: ISCApi): Promise<GravaticBooster> {
    return new GravaticBooster(
      api ??
        new SCApiWithCaching(
          new SCApi(
            new ResilientBroodWarConnection(
              new BroodWarConnection(
                await new ContextualWindowsOrWSLClientProvider().provide()
              )
            )
          )
        )
    );
  }

  /**
   * Returns all known gateways. This is just a static list of gateways, since they're expected to be
   * non-changing. The only dynamic data is the number of online users, which is accessible via the
   * `onlineUsers` method on the returned gateway objects.
   *
   * @returns All known gateways
   */
  gateways = (): Gateway[] =>
    // We construct them here so we can pass `this` // todo: cache it
    Object.entries(knownGatewayConfig).map(
      ([id, config]) =>
        new Gateway(
          this,
          parseInt(id) as GatewayId,
          config.name as RealGateway,
          config.region as RealRegion
        )
    );

  /**
   * Returns the gateway with the given id or region.
   *
   * @param props
   * @returns The gateway with the given id or region
   * @throws EntityNotFoundError if no such gateway could be found
   */
  gateway = (props: GatewayLookupProps): Gateway => {
    const gateway =
      "gateway" in props
        ? this.gateways().find((gateway) => gateway.id === props.gateway)
        : this.gateways().find((gateway) => gateway.region === props.region);

    if (!gateway) {
      throw new EntityNotFoundError(
        `No such gateway could be found with properties ${props}`
      );
    }
    return gateway;
  };

  /**
   * Returns the number of online users on the given gateway.
   *
   * @param props
   * @returns The number of online users on the given gateway
   * @throws EntityNotFoundError if no such gateway could be found
   */
  onlineUsers = async (props: GatewayLookupProps): Promise<number> => {
    const gatewayResponse = await this.api.gateway();
    let gateway;

    if ("gateway" in props) {
      gateway = gatewayResponse[props.gateway];
    } else {
      gateway = Object.values(gatewayResponse).find(
        (g) => g.region === props.region
      );
    }

    if (!gateway) {
      throw new EntityNotFoundError(
        `No such gateway could be found with properties ${props}`
      );
    }

    return gateway.online_users;
  };

  /**
   * Returns the 1v1 maps listing
   *
   * @returns The 1v1 maps listing
   */
  maps = async (): Promise<SCRMap[]> =>
    mapsFromBwApiResponse(await this.api.classicFilesGlobalMaps1v1());

  /**
   * Returns the current season number (e.g., 13).
   *
   * @returns The current season number
   */
  currentSeason = async (): Promise<number> =>
    (await this.api.leaderboard()).matchmaked_current_season;

  /**
   * Returns the leaderboards.
   *
   * @remarks
   * Leaderboards are the combination of game mode, gateway, and season. Each leaderboard has a unique id, which
   * is used for making other queries. For example, when fetching player rankings, you must specify the leaderboard.
   *
   * @returns The leaderboards
   */
  leaderboards = async (): Promise<Leaderboard[]> =>
    leaderboardsFromBwApiResponse(this, await this.api.leaderboard());

  /**
   * Returns the leaderboard with the given id or game mode, gateway, and season combination.
   *
   * @remarks
   * The default lookup properties (if leaderboard id is not used) are the current season, 1v1, and the global gateway.
   *
   * @param props The id or game mode, gateway, and season combination
   * @returns The selected leaderboard
   * @throws EntityNotFoundError if no such leaderboard could be found
   */
  leaderboard = async (props: LeaderboardLookupProps): Promise<Leaderboard> => {
    const leaderboards = await this.leaderboards();
    let leaderboard;

    if ("leaderboardId" in props) {
      leaderboard = leaderboards.find(
        (leaderboard) => leaderboard.id === props.leaderboardId
      );
    } else {
      const gateway: GatewayId =
        props.gateway === undefined ? GlobalGatewayId : props.gateway;
      const gameMode: GameMode = props.gameMode ?? "1v1";

      let seasonId: number;
      if ("seasonId" in props && props.seasonId) {
        seasonId = props.seasonId;
      } else {
        seasonId = await this.currentSeason();
      }

      leaderboard = leaderboards.find(
        (leaderboard) =>
          leaderboard.gameMode === gameMode &&
          leaderboard.gateway.id === gateway &&
          leaderboard.seasonId === seasonId
      );
    }

    if (!leaderboard) {
      throw new EntityNotFoundError(
        `No such leaderboard could be found with properties ${props}`
      );
    }

    return leaderboard;
  };

  /**
   * Returns a "minimal" account profile for the given toon and gateway.
   *
   * @remarks
   * This corresponds to the bw api endpoint `auroraProfileByToon` with the property mask `scr_mmgameloading`.
   *
   * @see {@link MinimalAccount} for fields returned.
   *
   * @param toon
   * @param gateway
   * @returns A "minimal" account profile for the given toon and gateway
   * @throws EntityNotFoundError if no such account could be found
   */
  minimalAccount = async (
    toon: string,
    gateway: GatewayLookupProps
  ): Promise<MinimalAccount> => {
    const { id: gatewayId } = this.gateway(gateway);

    const account = accountFromBwApiResponseScrMmGameLoading(
      this,
      toon,
      gatewayId,
      await this.api.auroraProfileByToon(toon, gatewayId, "scr_mmgameloading")
    );

    if (!account) {
      throw new EntityNotFoundError(
        `No such account could be found with properties ${toon}, ${gateway}`
      );
    }

    return account;
  };

  /**
   * Returns a "minimal" account profile for the given toon and gateway, with the number of games played in the last week
   * accessible on the account's profiles.
   *
   * @remarks
   * This corresponds to the bw api endpoint `auroraProfileByToon` with the property mask `scr_mmtooninfo`.
   *
   * @see {@link MinimalAccountWithGamesPlayedLastWeek} for fields returned.
   *
   * @param toon
   * @param gateway
   * @returns A "minimal" account profile for the given toon and gateway, with the number of games played in the last week
   * @throws EntityNotFoundError if no such account could be found
   */
  minimalAccountWithGamesPlayedLastWeek = async (
    toon: string,
    gateway: GatewayLookupProps
  ): Promise<MinimalAccountWithGamesPlayedLastWeek> => {
    const { id: gatewayId } = this.gateway(gateway);

    const account = accountFromBwApiResponseScrMmToonInfo(
      this,
      toon,
      gatewayId,
      await this.api.auroraProfileByToon(toon, gatewayId, "scr_mmtooninfo")
    );

    if (!account) {
      throw new EntityNotFoundError(
        `No such account could be found with properties ${toon} and ${gateway}`
      );
    }

    return account;
  };

  /**
   * Returns "full" account information, more time consuming API call.
   *
   * @remarks
   * Corresponds to the bw api endpoint `auroraProfileByToon` with the property mask `scr_profile`.
   *
   * @see {@link FullAccount} for fields returned.
   *
   * @param toon player name
   * @param gateway gateway properties
   * @returns "full" account information
   * @throws EntityNotFoundError if no such account could be found
   */
  fullAccount = async (
    toon: string,
    gateway: GatewayLookupProps
  ): Promise<FullAccount> => {
    const { id: gatewayId } = this.gateway(gateway);

    const account = accountFromBwApiResponseScrProfile(
      this,
      toon,
      gatewayId,
      await this.api.auroraProfileByToon(toon, gatewayId, "scr_profile")
    );

    if (!account) {
      throw new EntityNotFoundError(
        `No such account could be found with properties ${toon} and ${gateway}`
      );
    }

    return account;
  };

  /**
   * Returns "full" account information except for their game history. More performant than {@link fullAccount}.
   *
   * @remarks
   * Corresponds to the bw api endpoint `auroraProfileByToon` with the property mask `scr_tooninfo`.
   *
   * @see {@link FullAccountMinusGameHistory} for fields returned.
   *
   * @param toon player name
   * @param gateway gateway properties
   * @returns "full" account information except for their game history
   */
  fullAccountMinusGameHistory = async (
    toon: string,
    gateway: GatewayLookupProps
  ): Promise<FullAccountMinusGameHistory> => {
    const { id: gatewayId } = this.gateway(gateway);

    const account = accountFromBwApiResponseScrToonInfo(
      this,
      toon,
      gatewayId,
      await this.api.auroraProfileByToon(toon, gatewayId, "scr_tooninfo")
    );

    if (!account) {
      throw new EntityNotFoundError(
        `No such account could be found with properties ${toon} and ${gateway}`
      );
    }

    return account;
  };

  /**
   * Returns the player rankings for the given toon and gateway. Note that this returns all rankings for all
   * toons for the given player, not just the requested toon.
   *
   * @param toon player name
   * @param gateway gateway properties
   * @param leaderboardId leaderboard id
   * @returns player rankings
   */
  accountRankingsByToon = async (
    toon: string,
    gateway: GatewayLookupProps,
    leaderboardProps: LeaderboardLookupProps
  ): Promise<AccountRankings> => {
    const { id: gatewayId } = this.gateway(gateway);
    const { id: leaderboardId } = await this.leaderboard(leaderboardProps);

    const response = await this.api.leaderboardRankByToon(
      leaderboardId,
      toon,
      gatewayId
    );

    const accountRankings = accountRankingsFromRankingByToonResponse(
      this,
      response,
      toon,
      gatewayId
    );

    if (!accountRankings) {
      throw new EntityNotFoundError(
        `No such account could be found with properties ${toon} and ${gatewayId}`
      );
    }

    return accountRankings;
  };

  /**
   * Returns the map stats with the given toon and gateway.
   *
   * @remarks
   * Resultant structure is a nested  map of
   * {@link GameMode} -> {@link SeasonNumber} -> {@link MapId} -> {@link Race} -> {@link MapStats}
   *
   * @param toon player name
   * @param gateway gateway properties
   * @returns map stats
   */
  mapStatsByToon = async (
    toon: string,
    gateway: GatewayLookupProps
  ): Promise<
    Map<GameMode, Map<SeasonNumber, Map<MapId, Map<Race, MapStats>>>>
  > => {
    const { id: gatewayId } = this.gateway(gateway);
    return profileMapStatsFromResponse(
      this,
      await this.api.mapStatsByToon(toon, gatewayId)
    );
  };

  /**
   * Given a {@link leaderboardProps} and an index (0-indexed rank), returns the player ranking at that index.
   *
   * @param index The index of the ranking to query
   * @param leaderboardProps The leaderboard to query
   * @returns The player ranking at the given index
   */
  ranking = async (
    index: number,
    leaderboardProps: LeaderboardLookupProps = {}
  ): Promise<Ranking> => {
    const rankings = this.rankings(leaderboardProps, index, index + 1);
    const ranking = (await rankings.next()).value;

    if (!ranking) {
      throw new EntityNotFoundError(
        `No ranking could be found with properties ${leaderboardProps} and index ${index}`
      );
    }

    return ranking;
  };

  /**
   * Returns a generator that yields the rankings for the given leaderboard.
   *
   * @param leaderboardId The id of the leaderboard to query
   * @param begin The index of the first ranking to return (0-indexed)
   * @param limit The maximum number of rankings to return
   */
  async *rankings(
    leaderboardProps: LeaderboardLookupProps = {},
    begin = 0,
    limit?: number
  ) {
    const leaderboard = await this.leaderboard(leaderboardProps);
    const maximumSupportedPageSize = 100;

    for (
      let offset = begin;
      offset < begin + (limit || Infinity);
      offset += maximumSupportedPageSize
    ) {
      const acquiredSoFar = offset - begin;
      const numToRequest = limit
        ? Math.min(maximumSupportedPageSize, limit - acquiredSoFar)
        : maximumSupportedPageSize;

      const leaderboardRankingsResponse = await this.api.leaderboardEntity(
        leaderboard.id,
        offset,
        numToRequest
      );

      const rankings = rankingsFromLeaderboardEntity(
        this,
        leaderboard.id,
        leaderboardRankingsResponse
      );

      for (const ranking of rankings) {
        yield ranking;
      }

      if (leaderboardRankingsResponse.rows.length < maximumSupportedPageSize) {
        break; // no more results
      }
    }
  }

  /**
   * Returns a generator that yields the match history for the given player.
   *
   * @param toon The player's in-game id
   * @param gateway The gateway the player plays on
   * @param leaderboardProps The leaderboard to query
   * @param limit The maximum number of matches to return
   * @returns A generator that yields the match history for the given player
   */
  async *matchHistory(
    toon: string,
    gateway: GatewayLookupProps,
    leaderboardProps: LeaderboardLookupProps,
    limit?: number
  ): AsyncGenerator<Match, void, void> {
    // The reason for the complexity of this method is that, although we can request a number of matches by offset and
    // limit, the API returns a somewhere between 0 and the requested number of matches, even if there are more to be grabbed. It's
    // as if there are null records in their database that consume a slot in the results, but they're filtered out before returned.
    //
    // We can determine how many matches there are by looking at the total number of matches in the profile, and from that, we can
    // just keep paging through the data until we find all of the matches we're looking for. We assume if there are zero results in
    // a page of 50, then it's probably not a page full of sparse nulls and we can just stop there.
    //
    // Also, sometimes the API returns the same match twice, so we store the match ids as a set to skip duplicates.
    const { id: gatewayId } = this.gateway(gateway);

    const maximumSupportedPageSize = 50; // you would think this should be min'd against the user specified limit, but since you'll
    // often receive fewer results than requested, you may need multiple requests regardless and if the user were to request
    // e.g., 1 match it would be quite possible that would we return 0 results even if there were matches to be found

    const leaderboard = await this.leaderboard(leaderboardProps);

    // this is the only way to get the total number of matches played by the player, which is our most reliable way to determine
    // how many matches we should expect to find
    const rankByToon = await this.accountRankingsByToon(
      toon,
      gateway,
      leaderboardProps
    );

    if (rankByToon === null) {
      throw new EntityNotFoundError(
        `No account rankings could be found with properties ${{
          toon,
          gatewayId,
          leaderboardId: leaderboard.id,
        }}`
      );
    }

    const ranking = rankByToon.requestedRanking;

    if (!ranking) {
      throw new EntityNotFoundError(
        `No ranking could be found with properties ${JSON.stringify({
          toon,
          gatewayId,
          leaderboardId: leaderboard.id,
        })}`
      );
    }

    GravaticBoosterLogger.instance.info(
      `We expect to find ${ranking.totalGamesPlayed} total games played for ${toon} on ${gatewayId} in ${leaderboard.id}`
    );

    const expectedTotalMatches = Math.min(
      ranking.totalGamesPlayed,
      limit ?? Infinity
    );

    const seenMatchIds = new Set<string>();

    for (let page = 0; seenMatchIds.size < expectedTotalMatches; page++) {
      const matchHistoryResponse = await this.api.matchMakerGameInfoByToon(
        toon,
        gatewayId,
        leaderboard.gameModeId,
        leaderboard.seasonId,
        page * maximumSupportedPageSize,
        maximumSupportedPageSize
      );

      const matches = matchHistoryFromBwApiResponse(
        this,
        toon,
        gatewayId,
        matchHistoryResponse
      );

      // pages are sorted by the api, but the matches within a given page are unsorted. almost always, we want
      // the return matches in reverse chronological order, so we'll sort them here to prevent the caller from having
      // to drain the generator before sorting
      matches.sort((a, b) => b.gameId - a.gameId);

      for (const match of matches) {
        if (seenMatchIds.has(match.id)) {
          continue;
        }

        seenMatchIds.add(match.id);
        yield match;

        if (limit !== undefined && seenMatchIds.size >= limit) {
          // we've collected the number of matches requested
          return;
        }
      }

      if (matchHistoryResponse.length === 0) {
        // completely empty page returned
        return;
      }
    }
  }

  /**
   * Returns the replays for the given match.
   *
   * @param matchId The id of the match to query
   * @returns The replays for the given match
   */
  replays = async (matchId: string): Promise<Replays> =>
    replaysFromBwApiResponse(
      await this.api.matchMakerGameInfoPlayerInfo(matchId)
    );

  playerSearch = async (search: string): Promise<PlayerSearchResult[]> =>
    playerSearchResultFromBwApiResponse(
      await this.api.leaderboardNameSearch(
        (
          await this.leaderboard({})
        ).id,
        search
      )
    );
}
