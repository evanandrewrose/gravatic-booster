import { UnexpectedAPIResponseError } from "@/errors";
import { Ranking } from "@/models/ranking";

export class AccountRankings {
  constructor(
    public auroraId: number,
    public leaderboardId: number,
    public rankings: Ranking[],
    private requestedToon: string,
    private requestedGatewayId: number
  ) {}

  /**
   * The blizz API requires a toon/gateway combination and returns the account associated, along
   * with the other toon/gateway combinations for that account. This method returns the ranking
   * for the originally requested toon/gateway combination, which is often what you'll actually
   * want.
   *
   * @returns The ranking for the originally requested toon/gateway combination.
   */
  get requestedRanking(): Ranking {
    const result = this.rankings.find(
      (ranking) =>
        ranking.toon === this.requestedToon &&
        ranking.gatewayId === this.requestedGatewayId
    );

    if (result === undefined) {
      // shouldn't ever happen
      throw new UnexpectedAPIResponseError(
        "Requested ranking not found, yet it returned a set of rankings?"
      );
    }

    return result;
  }
}
