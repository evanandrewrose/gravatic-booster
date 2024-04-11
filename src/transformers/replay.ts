import { Replay, Replays } from "@/models/replays";
import { MatchMakerGameInfoPlayerInfoResponse } from "bw-web-api";

export const replaysFromBwApiResponse = (
  response: MatchMakerGameInfoPlayerInfoResponse
): Replays => {
  const replays = response.replays
    .map((replay) => {
      if ("url" in replay) {
        return new Replay(replay.url, new Date(replay.create_time * 1000));
      }

      return undefined;
    })
    .filter((replay) => replay !== undefined) as Replay[];

  return new Replays(replays);
};
