import { GravaticBooster } from "@/main";
import { GameSpeed, MapTileset, Tier } from "@/models/common";
import { GatewayId } from "@/models/gateway";
import { GameResult, Race } from "@/models/knownValues";
import { GravaticBoosterLogger } from "@/utils/logger";

export class MatchPoints {
  constructor(
    public previous: number,
    public delta: number,
    public previousTier: Tier,
    public newTier: Tier,
    public winStreak: number
  ) {}
}

export class MatchPlayerProfileInfo {
  constructor(
    public auroraId: number,
    public avatarUrl: string,
    public gatewayId: number,
    public battleTag: string | null,
    public region: string | null,
    public points: MatchPoints
  ) {}
}

export class MatchPlayer {
  constructor(
    public playerIndex: number,
    public race: Race,
    public toon: string,
    public team: number,
    public isComputer: boolean,
    public result: GameResult,
    public profileInfo: MatchPlayerProfileInfo | null
  ) {}
}

export class MatchMap {
  constructor(
    public crc: number,
    public fileName: string,
    public fileSize: number,
    public height: number,
    public width: number,
    public md5: string,
    public displayName: string,
    public tileSet: MapTileset
  ) {}
}

export class Match {
  constructor(
    private gb: GravaticBooster,
    private requestedToon: string,
    private requestedGatewayId: GatewayId,
    public timestamp: Date | null,
    public closedSlots: number,
    public flags: string,
    public gameSpeed: GameSpeed,
    public hostName: string,
    public netTurnRate: number,
    public map: MatchMap,
    public id: string,
    public name: string,
    public players: MatchPlayer[],
    public gameId: number // as opposed to match id, this is an incrementing value unique to the game
  ) {}

  get replays() {
    return this.gb.replays(this.id);
  }

  get thisPlayer() {
    // Players are uniquely identified by their toon and gatewayId, but sometimes (not typically) the gatewayId is not available.
    // In this case, we can still identify the player by their toon, but we need to make sure there is only one player with that toon.
    // Otherwise, just return undefined.
    const exactMatch = this.players.find(
      (p) =>
        p.toon === this.requestedToon &&
        p.profileInfo?.gatewayId === this.requestedGatewayId
    );

    if (exactMatch) {
      return exactMatch;
    }

    const toonMatch = this.players.filter((p) => p.toon === this.requestedToon);

    if (toonMatch.length === 1) {
      return toonMatch[0];
    }

    GravaticBoosterLogger.instance.error(
      `Could not find player for toon ${this.requestedToon} and gatewayId ${this.requestedGatewayId} in match ${this.id}`
    );

    return undefined;
  }

  get opponent() {
    // todo: only applies for 1v1, but we only process 1v1 for now
    return this.players.find(
      (p) =>
        p.toon !== this.requestedToon ||
        (p.profileInfo?.gatewayId &&
          p.profileInfo?.gatewayId !== this.requestedGatewayId)
    );
  }
}
