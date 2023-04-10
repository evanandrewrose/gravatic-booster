import { MS_IN_SECOND } from "@/consts";
import { Map } from "@/models/map";
import { ClassicFilesGlobalMaps1v1Response } from "bw-web-api";

export const mapsFromBwApiResponse = (
  response: ClassicFilesGlobalMaps1v1Response
): Map[] =>
  response.map(
    (map) =>
      new Map(
        parseInt(map.attribute.map_candidate),
        map.attribute.map_description,
        parseInt(map.attribute.map_era),
        parseInt(map.attribute.map_height),
        parseInt(map.attribute.map_width),
        map.attribute.map_path,
        parseInt(map.attribute.map_version),
        parseInt(map.attribute.replay_humans),
        parseInt(map.attribute.replay_max_players),
        parseInt(map.attribute.replay_min_players),
        parseInt(map.attribute.replay_opponents),
        parseInt(map.attribute.season_id),
        map.content_size,
        map.content_type,
        map.md5,
        new Date(map.modified_epoch * MS_IN_SECOND),
        map.name,
        map.attribute.map_name,
        map.url
      )
  );
