import { UnexpectedAPIResponseError } from "@/errors";
import { GravaticBooster } from "@/main";
import { FeaturedRace, bucketToTier } from "@/models/common";
import { GatewayId } from "@/models/gateway";
import {
  LEADERBOARD_RANKING_INDEX_AVATAR,
  LEADERBOARD_RANKING_INDEX_BATTLETAG,
  LEADERBOARD_RANKING_INDEX_BUCKET,
  LEADERBOARD_RANKING_INDEX_DISCONNECTS,
  LEADERBOARD_RANKING_INDEX_FEATURE_STAT,
  LEADERBOARD_RANKING_INDEX_GATEWAY_ID,
  LEADERBOARD_RANKING_INDEX_LAST_RANK,
  LEADERBOARD_RANKING_INDEX_LOSSES,
  LEADERBOARD_RANKING_INDEX_RANK,
  LEADERBOARD_RANKING_INDEX_RATING,
  LEADERBOARD_RANKING_INDEX_TOON,
  LEADERBOARD_RANKING_INDEX_WINS,
} from "@/models/knownValues";
import { Ranking } from "@/models/ranking";
import { arraysEqual } from "@/utils/arrays";
import {
  LeaderboardEntityResponse,
  LeaderboardRankByToonResponse,
} from "bw-web-api";

export const rankingsFromLeaderboardRankByToonEntity = (
  gravaticBooster: GravaticBooster,
  leaderboardId: number,
  responseToon: LeaderboardRankByToonResponse["toons"][number]
): Ranking =>
  new Ranking(
    gravaticBooster,
    leaderboardId,
    responseToon.rank,
    responseToon.last_rank,
    responseToon.gateway_id as GatewayId,
    responseToon.wins,

    responseToon.losses,
    responseToon.disconnects,
    responseToon.name,
    responseToon.battletag,
    responseToon.avatar,
    responseToon.feature_stat as FeaturedRace,
    responseToon.points,
    bucketToTier(responseToon.bucket)
  );

export const rankingsFromLeaderboardEntity = (
  gravaticBooster: GravaticBooster,
  leaderboardId: number,
  response: LeaderboardEntityResponse
): Ranking[] => {
  if (
    !arraysEqual(response.columns, [
      "rank",
      "last_rank",
      "gateway_id",
      "points",
      "wins",
      "losses",
      "disconnects",
      "toon",
      "battletag",
      "avatar",
      "feature_stat",
      "rating",
      "bucket",
    ])
  ) {
    throw new UnexpectedAPIResponseError(
      "Unexpected leaderboard rankings response"
    );
  }

  return response.rows.map(
    (row) =>
      new Ranking(
        gravaticBooster,
        leaderboardId,
        row[LEADERBOARD_RANKING_INDEX_RANK],
        row[LEADERBOARD_RANKING_INDEX_LAST_RANK],
        row[LEADERBOARD_RANKING_INDEX_GATEWAY_ID] as GatewayId,
        row[LEADERBOARD_RANKING_INDEX_WINS],
        row[LEADERBOARD_RANKING_INDEX_LOSSES],
        row[LEADERBOARD_RANKING_INDEX_DISCONNECTS],
        row[LEADERBOARD_RANKING_INDEX_TOON],
        row[LEADERBOARD_RANKING_INDEX_BATTLETAG],
        row[LEADERBOARD_RANKING_INDEX_AVATAR],
        row[LEADERBOARD_RANKING_INDEX_FEATURE_STAT] as FeaturedRace,
        row[LEADERBOARD_RANKING_INDEX_RATING],
        bucketToTier(row[LEADERBOARD_RANKING_INDEX_BUCKET])
      )
  );
};
