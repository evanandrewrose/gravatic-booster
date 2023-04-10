import { UnexpectedAPIResponseError } from "@/errors";
import { GravaticBooster } from "@/main";
import {
  GameMode,
  GameSpeed,
  PlayerType,
  SeasonNumber,
  Tier,
} from "@/models/common";
import { GatewayId } from "@/models/gateway";
import {
  GameResultPlayerType as CompetitiveGamePlayerType,
  GameResult,
  PlayerIndex,
  Race,
  TeamNumber,
} from "@/models/knownValues";

export class GamePlayRaceStats {
  constructor(
    public apmMax: number,
    public apmMin: number,
    public apmSum: number,
    public disconnectsMax: number,
    public disconnectsMin: number,
    public disconnectsSum: number,
    public drawsMax: number,
    public drawsMin: number,
    public drawsSum: number,
    public lossesMax: number,
    public lossesMin: number,
    public lossesSum: number,
    public playTimeMax: number,
    public playTimeMin: number,
    public playTimeSum: number,
    public resourcesGasMax: number,
    public resourcesGasMin: number,
    public resourcesGasSum: number,
    public resourcesMineralsMax: number,
    public resourcesMineralsMin: number,
    public resourcesMineralsSum: number,
    public resourcesScoreMax: number,
    public resourcesScoreMin: number,
    public resourcesScoreSum: number,
    public resourcesSpentMax: number,
    public resourcesSpentMin: number,
    public resourcesSpentSum: number,
    public structuresConstructedMax: number,
    public structuresConstructedMin: number,
    public structuresConstructedSum: number,
    public structuresLostMax: number,
    public structuresLostMin: number,
    public structuresLostSum: number,
    public structuresRazedMax: number,
    public structuresRazedMin: number,
    public structuresRazedSum: number,
    public structuresScoreMax: number,
    public structuresScoreMin: number,
    public structuresScoreSum: number,
    public unitsKilledMax: number,
    public unitsKilledMin: number,
    public unitsKilledSum: number,
    public unitsLostMax: number,
    public unitsLostMin: number,
    public unitsLostSum: number,
    public unitsProducedMax: number,
    public unitsProducedMin: number,
    public unitsProducedSum: number,
    public unitsScoreMax: number,
    public unitsScoreMin: number,
    public unitsScoreSum: number,
    public winsMax: number,
    public winsMin: number,
    public winsSum: number
  ) {}
}

export class GamePlayStats {
  constructor(
    public benefactorId: number,
    public legacyDisconnects: number,
    public legacyLosses: number,
    public legacyToonCreationTime: number,
    public legacyWins: number,
    public protossStats: GamePlayRaceStats,
    public terranStats: GamePlayRaceStats,
    public zergStats: GamePlayRaceStats
  ) {}
}

export class MatchMakedStats {
  constructor(
    public benefactorId: number, // always 0
    public tier: Tier,
    public disconnects: number,
    public gameMode: GameMode,
    public highestPoints: number, // no idea what this represents
    public points: number, // no idea what this represents
    public rating: number, // mmr
    public highestRating: number, // highest mmr
    public lossStreak: number,
    public losses: number,
    public seasonId: number,
    public toon: string,
    public toonGuid: number,
    public winStreak: number,
    public wins: number
  ) {}

  toString = () => {
    return `MMR: ${this.rating} | Wins: ${this.wins} | Losses: ${this.losses}`;
  };
}

export class LadderProfileData {
  constructor(
    public avatarFileName: string,
    public showAvatarFrame: boolean,
    public description: string, // always "" if present
    public title: string, // always "" if present
    private avatars: Avatar[]
  ) {}

  public get avatar() {
    const avatar = this.avatars.find(
      (avatar) => avatar.fileName === this.avatarFileName
    );

    if (!avatar) {
      throw new UnexpectedAPIResponseError(
        `Player selected avatar does not exist in account avatars ${this.avatarFileName} ${this.showAvatarFrame}`
      );
    }

    return avatar;
  }
}

export class GamePlayer {
  constructor(
    public name: string,
    public race: Race | null, // sometimes race can be null, seems like it's only for AI
    public type: PlayerType
  ) {}
}

export class Game {
  // corresponds to "replays" in the bw api, but it's essentially just the last 25 games the user played, including ums and such
  constructor(
    public gameCreator: string, // toon
    public gameId: number,
    public gameName: string,
    public gameSaveId: number, // always 0
    public gameSpeed: GameSpeed, // 6 = fastest
    public gameSubType: number, // not sure
    public gameType: number, // tvb, etc., haven't decoded this
    public mapEra: number, // no idea
    public mapHeight: number,
    public mapWidth: number,
    public mapDisplayName: string,
    public description: string, // always ""
    public humans: number, // number of non-ai players
    public mapNumber: number, // always 0
    public maxPlayers: number, // always 8
    public minPlayers: number, // always 1
    public opponents: number, // number of enemy ai players
    public players: GamePlayer[],
    public result: GameResult, // 0 = decided, 1 = win, 2 = lose, 3 = draw
    public createTime: Date
  ) {}
}

export class AvatarAchievement {
  constructor(public level: number, public stat: string) {}
}

export class Avatar {
  constructor(
    public fileName: string,
    public url: string,
    public achievement: AvatarAchievement | null,
    public framed: boolean
  ) {}
}

export class GameResultStats {
  constructor(
    public apm: number,
    public playTimeInSeconds: number,
    public resourcesGas: number,
    public resourcesMinerals: number,
    public resourcesScore: number,
    public resourcesSpent: number,
    public scoreOverall: number,
    public structuresConstructed: number,
    public structuresLost: number,
    public structuresRazed: number,
    public structuresScore: number,
    public unitsKilled: number,
    public unitsLost: number,
    public unitsProduced: number,
    public unitsScore: number
  ) {}
}

export class CompetitiveGamePlayer {
  constructor(
    public toon: string,
    public index: PlayerIndex, // 0-based index of the player in the game
    public left: boolean, // whether the player left the game
    public type: CompetitiveGamePlayerType, // either "none", "player", or "ai"
    public team: TeamNumber,
    public result: GameResult, // either "win", "loss", "draw", or "undecided"
    public stats: GameResultStats | null
  ) {}
}

// recent 25 games with other humans that aren't ums, roughly your "competitive" history, includes ladder
export class CompetitiveGame {
  constructor(
    public clientVersion: string,
    public mapDisplayName: string,
    public mapTileSet: number,
    public benefactorId: number, // always 0
    public createTime: Date,
    public gameId: number,
    public gatewayId: GatewayId,
    public matchGuid: string | null, // from the bw api, could be either "" or "mm-{uuid}" if it was a ladder game
    public players: CompetitiveGamePlayer[]
  ) {}
}

// this repesents the data you can from the v2 aurora profile with the flag scr_mmtooninfo
export class MinimalProfile {
  constructor(
    protected gb: GravaticBooster,
    public toon: string,
    public toonGuid: number,
    public gatewayId: GatewayId,
    public matchMakedStatsForSeason: Map<
      SeasonNumber,
      Map<GameMode, MatchMakedStats>
    >
  ) {}

  accountRankings = async (leaderboardId: number) =>
    await this.gb.accountRankingsByToon(
      this.toon,
      {
        gateway: this.gatewayId,
      },
      {
        leaderboardId,
      }
    );

  ranking = async (leaderboardId: number) =>
    (
      await this.gb.accountRankingsByToon(
        this.toon,
        {
          gateway: this.gatewayId,
        },
        {
          leaderboardId,
        }
      )
    )?.requestedRanking;

  ladderGames = async (
    gameMode: GameMode = "1v1",
    season: SeasonNumber | "current" = "current",
    limit?: number
  ) => {
    const seasonNumber =
      season === "current" ? await this.gb.currentSeason() : season;

    return this.gb.matchHistory(
      this.toon,
      {
        gateway: this.gatewayId,
      },
      {
        gameMode,
        seasonId: seasonNumber,
      },
      limit
    );
  };
}

export class MinimalProfileWithGamesPlayedLastWeek extends MinimalProfile {
  constructor(
    protected gb: GravaticBooster,
    public toon: string,
    public toonGuid: number,
    public gatewayId: GatewayId,
    public matchMakedStatsForSeason: Map<
      SeasonNumber,
      Map<GameMode, MatchMakedStats>
    >,
    public numGamesLastWeek: number
  ) {
    super(gb, toon, toonGuid, gatewayId, matchMakedStatsForSeason);
  }
}

export class FullProfile extends MinimalProfileWithGamesPlayedLastWeek {
  constructor(
    protected gb: GravaticBooster,
    public toon: string,
    public toonGuid: number,
    public gatewayId: GatewayId,
    public gameplayStatsForSeason: Map<SeasonNumber, GamePlayStats>,
    public matchMakedStatsForSeason: Map<
      SeasonNumber,
      Map<GameMode, MatchMakedStats>
    >,
    public numGamesLastWeek: number,
    public ladderProfileData: LadderProfileData | "PlayerIsUnranked"
  ) {
    super(
      gb,
      toon,
      toonGuid,
      gatewayId,
      matchMakedStatsForSeason,
      numGamesLastWeek
    );
  }

  public get gateway() {
    return this.gb.gateways().find((gateway) => gateway.id === this.gatewayId);
  }
}

export class MinimalAccountBase<ProfileType extends MinimalProfile> {
  constructor(
    protected requestedToon: string,
    protected requestedGatewayId: GatewayId,
    public flags: string[],
    public auroraId: number,
    public battleTag: string,
    public countryCode: string,
    public currentSeason: number,
    public currentSeasonBuckets: number[],
    public profiles: ProfileType[]
  ) {}

  public get requestedProfile() {
    return this.profiles.find(
      (profile) =>
        profile.toon === this.requestedToon &&
        profile.gatewayId === this.requestedGatewayId
    );
  }
}

export const MinimalAccount = MinimalAccountBase<MinimalProfile>;
export const MinimalAccountWithGamesPlayedLastWeek =
  MinimalAccountBase<MinimalProfileWithGamesPlayedLastWeek>;

export type MinimalAccount = MinimalAccountBase<MinimalProfile>;
export type MinimalAccountWithGamesPlayedLastWeek =
  MinimalAccountBase<MinimalProfileWithGamesPlayedLastWeek>;

export class FullAccountMinusGameHistory extends MinimalAccountBase<FullProfile> {
  constructor(
    protected requestedToon: string,
    protected requestedGatewayId: GatewayId,
    public flags: string[],
    public auroraId: number,
    public avatars: Avatar[],
    public battleTag: string,
    public countryCode: string,
    public currentSeason: number,
    public currentSeasonBuckets: number[],
    public profiles: FullProfile[]
  ) {
    super(
      requestedToon,
      requestedGatewayId,
      flags,
      auroraId,
      battleTag,
      countryCode,
      currentSeason,
      currentSeasonBuckets,
      profiles
    );
  }
}

export class FullAccount extends FullAccountMinusGameHistory {
  constructor(
    protected requestedToon: string,
    protected requestedGatewayId: GatewayId,
    public flags: string[],
    public auroraId: number,
    public avatars: Avatar[],
    public battleTag: string,
    public countryCode: string,
    public recent25Games: Game[],
    public recent25CompetitiveGames: CompetitiveGame[],
    public currentSeason: number,
    public currentSeasonBuckets: number[],
    public profiles: FullProfile[]
  ) {
    super(
      requestedToon,
      requestedGatewayId,
      flags,
      auroraId,
      avatars,
      battleTag,
      countryCode,
      currentSeason,
      currentSeasonBuckets,
      profiles
    );
  }
}
