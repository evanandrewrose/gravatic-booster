import {
  HOURS_S,
  MB_BYTES,
  MINUTES_S,
  MS_IN_SECOND,
  SingularKey,
  SingularKeyType,
} from "@/consts";
import { GravaticBoosterLogger } from "@/utils/logger";
import { sizeOfStringifiableObject } from "@/utils/objects";
import {
  AuroraProfileByToonScrMmGameLoadingResponse,
  AuroraProfileByToonScrMmToonInfoResponse,
  AuroraProfileByToonScrProfileResponse,
  AuroraProfileByToonScrToonInfoResponse,
  AuroraProfileByToonV2FieldMask,
  ClassicFilesGlobalMaps1v1Response,
  GatewayResponse,
  ISCApi,
  LeaderboardEntityResponse,
  LeaderboardNameSearchResponse,
  LeaderboardRankByToonResponse,
  LeaderboardResponse,
  MapStatsByToonResponse,
  MatchMakerGameInfoByToonResponse,
  MatchMakerGameInfoPlayerInfoResponse,
} from "bw-web-api";
import LRUCache from "lru-cache";

export interface CacheValues {
  ttlSeconds: number; // per response
  maxSizeBytes: number; // for the api responses aggregated
}

export interface CacheConfig {
  gateways: CacheValues | null;
  maps: CacheValues | null;
  leaderboard: CacheValues | null;
  leaderboardEntity: CacheValues | null;
  leaderboardNameSearch: CacheValues | null;
  leaderboardRankByToon: CacheValues | null;
  profile: CacheValues | null;
  matchHistory: CacheValues | null;
  matchMakerGameInfoPlayerInfoCache: CacheValues | null;
  mapStatsByToon: CacheValues | null;
}

export const defaultCacheConfig: CacheConfig = {
  gateways: {
    // rarely, if ever, updates
    ttlSeconds: 1 * HOURS_S,
    maxSizeBytes: 1 * MB_BYTES,
  },
  maps: {
    // updates are per-season, so very rare
    ttlSeconds: 1 * HOURS_S,
    maxSizeBytes: 1 * MB_BYTES,
  },
  leaderboard: {
    // updates every 5 min, but only updating the "last_update_time" and "next_update_time" fields
    // interesting data rarely updates
    ttlSeconds: 1 * HOURS_S,
    maxSizeBytes: 1 * MB_BYTES,
  },
  leaderboardEntity: {
    // updates every 5 min
    ttlSeconds: 5 * MINUTES_S,
    maxSizeBytes: 1 * MB_BYTES,
  },
  leaderboardNameSearch: {
    // changes as profiles are made/deleted
    ttlSeconds: 5 * MINUTES_S,
    maxSizeBytes: 1 * MB_BYTES,
  },
  leaderboardRankByToon: {
    // updates every 5 min
    ttlSeconds: 5 * MINUTES_S,
    maxSizeBytes: 1 * MB_BYTES,
  },
  profile: {
    // frequently changes as games are played
    ttlSeconds: 1 * MINUTES_S,
    maxSizeBytes: 1 * MB_BYTES,
  },
  matchHistory: {
    // frequently changes as games are played
    ttlSeconds: 1 * MINUTES_S,
    maxSizeBytes: 1 * MB_BYTES,
  },
  matchMakerGameInfoPlayerInfoCache: {
    // this is cache of a played game, so the values should never change
    ttlSeconds: 24 * HOURS_S,
    maxSizeBytes: 1 * MB_BYTES,
  },
  mapStatsByToon: {
    // updates with every game played
    ttlSeconds: 1 * MINUTES_S,
    maxSizeBytes: 1 * MB_BYTES,
  },
};

/**
 * A wrapper around the bw-web-api that caches responses with configurable TTLs and max sizes for each endpoint.
 */
export class SCApiWithCaching implements ISCApi {
  private gatewayCache: LRUCache<SingularKeyType, GatewayResponse> | null;
  private mapsCache: LRUCache<
    SingularKeyType,
    ClassicFilesGlobalMaps1v1Response
  > | null;
  private leaderboardCache: LRUCache<
    SingularKeyType,
    LeaderboardResponse
  > | null;
  private leaderboardEntityCache: LRUCache<
    string,
    LeaderboardEntityResponse
  > | null;
  private leaderboardNameSearchCache: LRUCache<
    string,
    LeaderboardNameSearchResponse
  > | null;
  private leaderboardRankingByToonCache: LRUCache<
    string,
    LeaderboardRankByToonResponse
  > | null;
  private auroraProfileByToonV2Cache: LRUCache<
    string,
    | AuroraProfileByToonScrProfileResponse
    | AuroraProfileByToonScrMmGameLoadingResponse
    | AuroraProfileByToonScrToonInfoResponse
    | AuroraProfileByToonScrMmToonInfoResponse
  > | null;
  private matchHistoryCache: LRUCache<
    string,
    MatchMakerGameInfoByToonResponse
  > | null;
  private matchMakerGameInfoPlayerInfoCache: LRUCache<
    string,
    MatchMakerGameInfoPlayerInfoResponse
  > | null;
  private mapStatsCache: LRUCache<string, MapStatsByToonResponse> | null;

  /**
   * Construct a new SCApiWithCaching instance.
   *
   * @remarks Each cache is configured with a TTL and max size in bytes. The TTL is per response, and the max size is for the aggregated responses.
   * @see {@link defaultCacheConfig} for the default configuration.
   *
   * @param api The underlying api to wrap.
   * @param cacheConfig The configuration for the caches.
   */
  constructor(
    private api: ISCApi,
    private cacheConfig: CacheConfig = defaultCacheConfig
  ) {
    this.gatewayCache = this.cacheConfig.gateways
      ? new LRUCache<SingularKeyType, GatewayResponse>({
          maxSize: this.cacheConfig.gateways.maxSizeBytes,
          ttl: this.cacheConfig.gateways.ttlSeconds * MS_IN_SECOND,
          sizeCalculation: sizeOfStringifiableObject,
        })
      : null;

    this.mapsCache = this.cacheConfig.maps
      ? new LRUCache<SingularKeyType, ClassicFilesGlobalMaps1v1Response>({
          maxSize: this.cacheConfig.maps.maxSizeBytes,
          ttl: this.cacheConfig.maps.ttlSeconds * MS_IN_SECOND,
          sizeCalculation: sizeOfStringifiableObject,
        })
      : null;

    this.leaderboardCache = this.cacheConfig.leaderboard
      ? new LRUCache<SingularKeyType, LeaderboardResponse>({
          maxSize: this.cacheConfig.leaderboard.maxSizeBytes,
          ttl: this.cacheConfig.leaderboard.ttlSeconds * MS_IN_SECOND,
          sizeCalculation: sizeOfStringifiableObject,
        })
      : null;

    this.leaderboardEntityCache = this.cacheConfig.leaderboardEntity
      ? new LRUCache<string, LeaderboardEntityResponse>({
          maxSize: this.cacheConfig.leaderboardEntity.maxSizeBytes,
          ttl: this.cacheConfig.leaderboardEntity.ttlSeconds * MS_IN_SECOND,
          sizeCalculation: sizeOfStringifiableObject,
        })
      : null;

    this.leaderboardNameSearchCache = this.cacheConfig.leaderboardNameSearch
      ? new LRUCache<string, LeaderboardNameSearchResponse>({
          maxSize: this.cacheConfig.leaderboardNameSearch.maxSizeBytes,
          ttl: this.cacheConfig.leaderboardNameSearch.ttlSeconds * MS_IN_SECOND,
          sizeCalculation: sizeOfStringifiableObject,
        })
      : null;

    this.leaderboardRankingByToonCache = this.cacheConfig.leaderboardRankByToon
      ? new LRUCache<string, LeaderboardRankByToonResponse>({
          maxSize: this.cacheConfig.leaderboardRankByToon.maxSizeBytes,
          ttl: this.cacheConfig.leaderboardRankByToon.ttlSeconds * MS_IN_SECOND,
          sizeCalculation: sizeOfStringifiableObject,
        })
      : null;

    this.auroraProfileByToonV2Cache = this.cacheConfig.profile
      ? new LRUCache<
          string,
          | AuroraProfileByToonScrProfileResponse
          | AuroraProfileByToonScrMmGameLoadingResponse
          | AuroraProfileByToonScrToonInfoResponse
          | AuroraProfileByToonScrMmToonInfoResponse
        >({
          maxSize: this.cacheConfig.profile.maxSizeBytes,
          ttl: this.cacheConfig.profile.ttlSeconds * MS_IN_SECOND,
          sizeCalculation: sizeOfStringifiableObject,
        })
      : null;

    this.matchHistoryCache = this.cacheConfig.matchHistory
      ? new LRUCache<string, MatchMakerGameInfoByToonResponse>({
          maxSize: this.cacheConfig.matchHistory.maxSizeBytes,
          ttl: this.cacheConfig.matchHistory.ttlSeconds * MS_IN_SECOND,
          sizeCalculation: sizeOfStringifiableObject,
        })
      : null;

    this.matchMakerGameInfoPlayerInfoCache = this.cacheConfig
      .matchMakerGameInfoPlayerInfoCache
      ? new LRUCache<string, MatchMakerGameInfoPlayerInfoResponse>({
          maxSize:
            this.cacheConfig.matchMakerGameInfoPlayerInfoCache.maxSizeBytes,
          ttl:
            this.cacheConfig.matchMakerGameInfoPlayerInfoCache.ttlSeconds *
            MS_IN_SECOND,
          sizeCalculation: sizeOfStringifiableObject,
        })
      : null;

    this.mapStatsCache = this.cacheConfig.mapStatsByToon
      ? new LRUCache<string, MapStatsByToonResponse>({
          maxSize: this.cacheConfig.mapStatsByToon.maxSizeBytes,
          ttl: this.cacheConfig.mapStatsByToon.ttlSeconds * MS_IN_SECOND,
          sizeCalculation: sizeOfStringifiableObject,
        })
      : null;
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  cacheOr = async <K extends {}, V extends {}>(
    fnName: string,
    cache: LRUCache<K, V> | null,
    key: K,
    fn: () => Promise<V>
  ) => {
    const cachedResult = cache?.get(key);

    if (cachedResult !== undefined) {
      GravaticBoosterLogger.instance.trace(`${fnName}(${key}) - cache hit`);
      return cachedResult;
    } else {
      GravaticBoosterLogger.instance.trace(`${fnName}(${key}) - cache miss`);

      const result = await fn();
      cache?.set(key, result);
      return result;
    }
  };

  classicFilesGlobalMaps1v1 =
    async (): Promise<ClassicFilesGlobalMaps1v1Response> =>
      this.cacheOr(
        "classicFilesGlobalMaps1v1",
        this.mapsCache,
        SingularKey,
        () => this.api.classicFilesGlobalMaps1v1()
      );

  gateway = async (): Promise<GatewayResponse> =>
    this.cacheOr("gateway", this.gatewayCache, SingularKey, () =>
      this.api.gateway()
    );

  leaderboard = async (): Promise<LeaderboardResponse> =>
    this.cacheOr("leaderboard", this.leaderboardCache, SingularKey, () =>
      this.api.leaderboard()
    );

  leaderboardEntity = async (
    leaderboardId: number,
    offset: number,
    length: number
  ): Promise<LeaderboardEntityResponse> =>
    this.cacheOr(
      "leaderboardEntity",
      this.leaderboardEntityCache,
      JSON.stringify({ leaderboardId, offset, length }),
      () => this.api.leaderboardEntity(leaderboardId, offset, length)
    );

  leaderboardNameSearch = async (
    toon: string
  ): Promise<LeaderboardNameSearchResponse> =>
    this.cacheOr(
      "leaderboardNameSearch",
      this.leaderboardNameSearchCache,
      toon,
      () => this.api.leaderboardNameSearch(toon)
    );

  leaderboardRankByToon = async (
    ladder: number,
    toon: string,
    gateway: number
  ): Promise<LeaderboardRankByToonResponse> =>
    this.cacheOr(
      "leaderboardRankByToon",
      this.leaderboardRankingByToonCache,
      JSON.stringify({ ladder, toon, gateway }),
      () => this.api.leaderboardRankByToon(ladder, toon, gateway)
    );

  mapStatsByToon = async (
    toon: string,
    gateway: number
  ): Promise<MapStatsByToonResponse> =>
    this.cacheOr(
      "mapStatsByToon",
      this.mapStatsCache,
      JSON.stringify({ toon, gateway }),
      () => this.api.mapStatsByToon(toon, gateway)
    );

  matchMakerGameInfoByToon = async (
    toon: string,
    gateway: number,
    gameMode: number,
    season: number,
    offset: number,
    limit: number
  ): Promise<MatchMakerGameInfoByToonResponse> =>
    this.cacheOr(
      "matchMakerGameInfoByToon",
      this.matchHistoryCache,
      JSON.stringify({ toon, gateway, gameMode, season, offset, limit }),
      () =>
        this.api.matchMakerGameInfoByToon(
          toon,
          gateway,
          gameMode,
          season,
          offset,
          limit
        )
    );

  matchMakerGameInfoPlayerInfo = async (
    matchId: string
  ): Promise<MatchMakerGameInfoPlayerInfoResponse> =>
    this.cacheOr(
      "matchMakerGameInfoPlayerInfo",
      this.matchMakerGameInfoPlayerInfoCache,
      matchId,
      () => this.api.matchMakerGameInfoPlayerInfo(matchId)
    );

  auroraProfileByToon = async (
    toon: string,
    gateway: number,
    mask: AuroraProfileByToonV2FieldMask
  ): Promise<
    | AuroraProfileByToonScrMmGameLoadingResponse
    | AuroraProfileByToonScrMmToonInfoResponse
    | AuroraProfileByToonScrToonInfoResponse
    | AuroraProfileByToonScrProfileResponse
  > =>
    this.cacheOr(
      "auroraProfileByToon",
      this.auroraProfileByToonV2Cache,
      JSON.stringify({ toon, gateway, mask }),
      () => this.api.auroraProfileByToon(toon, gateway, mask)
    );
}
