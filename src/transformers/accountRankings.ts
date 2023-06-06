import { GravaticBooster } from "@/main";
import { AccountRankings } from "@/models/accountRankings";
import { rankingsFromLeaderboardRankByToonEntity } from "@/transformers/rankings";
import { LeaderboardRankByToonResponse } from "bw-web-api";

export const accountRankingsFromRankingByToonResponse = (
  gravaticBooster: GravaticBooster,
  response: LeaderboardRankByToonResponse,
  requestedToon: string,
  requestedGatewayId: number
): AccountRankings | null => {
  if (
    !("aurora_id" in response) ||
    !response.aurora_id ||
    response.toons.length === 0
  ) {
    return null;
  }

  const {
    toons,
    aurora_id: auroraId,
    leaderboard_id: leaderboardId,
  } = response;

  return new AccountRankings(
    auroraId,
    leaderboardId,
    toons.map((toon) =>
      rankingsFromLeaderboardRankByToonEntity(
        gravaticBooster,
        leaderboardId,
        toon
      )
    ),
    requestedToon,
    requestedGatewayId
  );
};
