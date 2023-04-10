import { MS_IN_SECOND } from "@/consts";
import { GravaticBooster } from "@/main";
import { GatewayId } from "@/models/gateway";
import { GLOBAL_GATEWAY_ID, RealRegion } from "@/models/knownValues";
import { Leaderboard, LeaderboardGateway } from "@/models/leaderboard";
import { LeaderboardResponse } from "bw-web-api";

export const leaderboardsFromBwApiResponse = (
  gb: GravaticBooster,
  response: LeaderboardResponse
) =>
  Object.values(response.leaderboards).map((leaderboard) => {
    const gateway =
      leaderboard.gateway_id === GLOBAL_GATEWAY_ID
        ? {
            name: "Global",
            is_official: true,
            region: "global",
          }
        : response.gateways[leaderboard.gateway_id];

    const gameMode = response.gamemodes[`${leaderboard.gamemode_id}`];

    if (gameMode.name !== "1v1") {
      throw new Error(`Unexpected game mode ${gameMode.name})`);
    }

    return new Leaderboard(
      gb,
      parseInt(leaderboard.benefactor_id),
      gameMode.name,
      new LeaderboardGateway(
        gateway.is_official,
        gateway.name,
        gateway.region as RealRegion,
        leaderboard.gateway_id as GatewayId
      ),
      leaderboard.id,
      leaderboard.name,
      new Date(parseInt(leaderboard.last_update_time) * MS_IN_SECOND),
      new Date(parseInt(leaderboard.next_update_time) * MS_IN_SECOND),
      leaderboard.program_id,
      leaderboard.season_id,
      leaderboard.season_name
    );
  });
