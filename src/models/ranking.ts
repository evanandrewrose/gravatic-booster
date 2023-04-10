import { GravaticBooster } from "@/main";
import { FeaturedRace, Tier } from "@/models/common";
import { GatewayId } from "@/models/gateway";

export class Ranking {
  constructor(
    private gb: GravaticBooster,

    private leaderboardId: number,
    public rank: number,
    public lastRank: number,
    public gatewayId: GatewayId,
    public wins: number,
    public losses: number,
    public disconnects: number,
    public toon: string,
    public battletag: string,
    public avatar: string,
    public featureRace: FeaturedRace,
    public rating: number,
    public tier: Tier
  ) {}

  get totalGamesPlayed() {
    return this.wins + this.losses + this.disconnects;
  }

  get gateway() {
    const gateways = this.gb.gateways();
    const gateway = gateways.find((gateway) => gateway.id === this.gatewayId);

    if (!gateway) throw new Error(`Gateway not found for id ${this.gatewayId}`);

    return gateway;
  }

  ladderGames = async (limit?: number) =>
    this.gb.matchHistory(
      this.toon,
      {
        gateway: this.gatewayId,
      },
      {
        leaderboardId: this.leaderboardId,
      },
      limit
    );

  fullAccount = async () =>
    await this.gb.fullAccount(this.toon, {
      gateway: this.gatewayId,
    });

  fullAccountMinusGameHistory = async () =>
    await this.gb.fullAccountMinusGameHistory(this.toon, {
      gateway: this.gatewayId,
    });

  minimalAccount = async () =>
    await this.gb.minimalAccount(this.toon, {
      gateway: this.gatewayId,
    });

  minimalAccountWithGamesPlayedLastWeek = async () =>
    await this.gb.minimalAccountWithGamesPlayedLastWeek(this.toon, {
      gateway: this.gatewayId,
    });
}
