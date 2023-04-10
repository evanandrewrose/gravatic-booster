import { GravaticBooster } from "@/main";
import { GameMode, gameModeIdFromGameModeString } from "@/models/common";
import { GatewayId } from "@/models/gateway";
import { RealRegion } from "@/models/knownValues";

export class LeaderboardGateway {
  constructor(
    public isOfficial: boolean, // always true
    public name: string, // e.g., 'U.S. West', 'U.S. East', 'Europe', 'Asia', 'Korea'
    public region: RealRegion, // e.g., 'us', 'use', 'eu', 'asia', 'kr'
    public id: GatewayId | 0
  ) {}
}

export class Leaderboard {
  constructor(
    private gb: GravaticBooster,
    public benefactorId: number, // always 0
    public gameMode: GameMode, // always '1v1'
    public gateway: LeaderboardGateway,
    public id: number,
    public name: string, // matches gateway name or 'Global'
    public lastUpdateTime: Date,
    public nextUpdateTime: Date,
    public programId: string, // always "S1"
    public seasonId: number,
    public seasonName: string // 2023 %s 1
  ) {}

  rankings = (begin: number, limit?: number) => {
    return this.gb.rankings(
      {
        leaderboardId: this.id,
      },
      begin,
      limit
    );
  };

  get gameModeId() {
    return gameModeIdFromGameModeString(this.gameMode);
  }
}
