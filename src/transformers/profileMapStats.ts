import { GravaticBooster } from "@/main";
import {
  GameMode,
  MapId,
  SeasonNumber,
  gameModeStringFromGameModeId,
} from "@/models/common";
import { Race } from "@/models/knownValues";
import { MapStats } from "@/models/profileMapStats";
import { GravaticBoosterLogger } from "@/utils/logger";
import { MapStatsByToonResponse } from "bw-web-api";

export const profileMapStatsFromResponse = (
  gb: GravaticBooster,
  response: MapStatsByToonResponse
) => {
  const stats: Map<
    GameMode,
    Map<SeasonNumber, Map<MapId, Map<Race, MapStats>>>
  > = new Map();

  for (const gameModeIdString in response.map_stat) {
    if (gameModeIdString !== "1") {
      GravaticBoosterLogger.instance.warn(
        `Unknown game mode id: ${gameModeIdString}`
      );
      continue;
    }

    if (!(gameModeIdString in response.map_stat)) {
      continue; // this obviously won't happen, but it makes typescript happy
    }

    for (const seasonNumberString in response.map_stat[gameModeIdString]) {
      for (const mapId in response.map_stat[gameModeIdString][
        seasonNumberString
      ]) {
        const mapStats =
          response.map_stat[gameModeIdString][seasonNumberString][mapId];

        let gameMode;
        try {
          gameMode = gameModeStringFromGameModeId(parseInt(gameModeIdString));
        } catch (UnexpectedAPIResponseError) {
          GravaticBoosterLogger.instance.warn(
            `Unknown game mode id: ${gameModeIdString} when parsing map stats. Skipping.`
          );
          continue;
        }

        const season = parseInt(seasonNumberString);

        if (!stats.has(gameMode)) {
          stats.set(gameMode, new Map());
        }

        if (!stats.get(gameMode)?.has(season)) {
          stats.get(gameMode)?.set(season, new Map());
        }

        if (!stats.get(gameMode)?.get(season)?.has(mapId)) {
          stats
            .get(gameMode)
            ?.get(season)
            ?.set(mapId as MapId, new Map());
        }

        stats
          .get(gameMode)
          ?.get(season)
          ?.get(mapId as MapId)
          ?.set(
            "protoss",
            new MapStats(
              gb,
              mapId,
              mapStats.Protoss.total_games,
              mapStats.Protoss.total_wins,
              mapStats.Protoss.total_global_games,
              mapStats.Protoss.total_global_wins
            )
          )
          ?.set(
            "terran",
            new MapStats(
              gb,
              mapId,
              mapStats.Terran.total_games,
              mapStats.Terran.total_wins,
              mapStats.Terran.total_global_games,
              mapStats.Terran.total_global_wins
            )
          )
          ?.set(
            "zerg",
            new MapStats(
              gb,
              mapId,
              mapStats.Zerg.total_games,
              mapStats.Zerg.total_wins,
              mapStats.Zerg.total_global_games,
              mapStats.Zerg.total_global_wins
            )
          )
          ?.set(
            "random",
            new MapStats(
              gb,
              mapId,
              mapStats.Random.total_games,
              mapStats.Random.total_wins,
              mapStats.Random.total_global_games,
              mapStats.Random.total_global_wins
            )
          );
      }
    }
  }

  return stats;
};
