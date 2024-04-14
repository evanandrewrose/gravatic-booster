import { PlayerSearchResult } from "@/models/playerSearchResult";
import { LeaderboardNameSearchResponse } from "bw-web-api";

export const playerSearchResultFromBwApiResponse = (
  response: LeaderboardNameSearchResponse
): PlayerSearchResult[] =>
  response.map(
    (player) =>
      new PlayerSearchResult(
        player.avatar,
        player.battletag,
        player.gateway_id,
        player.last_rank,
        player.name,
        player.points,
        player.rank
      )
  );
