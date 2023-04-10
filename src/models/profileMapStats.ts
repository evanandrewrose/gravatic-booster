import { GravaticBooster } from "@/main";
import { GameMode, MapId, SeasonNumber } from "@/models/common";
import { Race } from "@/models/knownValues";
import { Map as GameMap } from "@/models/map";

export class MapStats {
  constructor(
    private gb: GravaticBooster,
    public mapId: MapId,
    public games: number,
    public wins: number,
    public globalGames: number,
    public globalWins: number
  ) {}

  get map(): Promise<GameMap | undefined> {
    return (async () => {
      const maps = await this.gb.maps();

      return maps.find(
        (map) => map.md5.toLowerCase() === this.mapId.toLowerCase()
      );
    })();
  }
}

export class ProfileMapStats {
  constructor(
    public toon: string,
    public gatewayId: number,
    public stats: Map<
      GameMode,
      Map<SeasonNumber, Map<MapId, Map<Race, MapStats>>>
    >
  ) {}
}
