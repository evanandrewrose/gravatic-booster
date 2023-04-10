/**
 * Represents a list of replays for a given match. Each player in the match may have uploaded a replay.
 * So there can be up to 2, but sometimes there are 0 or 1 available.
 */
export class Replays {
  constructor(public replays: Replay[]) {}

  /**
   * The most recently uploaded replay (last one uploaded by a player of the given match)
   */
  get lastReplayUploaded(): Replay | undefined {
    return [...this.replays].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    )[0];
  }

  /**
   * The first uploaded replay (first one uploaded by a player of the given match)
   */
  get firstReplayUploaded(): Replay | undefined {
    return [...this.replays].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )[0];
  }

  /**
   * Returns the first replay in the list, or undefined if there are no replays
   */
  get anyReplay(): Replay | undefined {
    return this.replays.length > 0 ? this.replays[0] : undefined;
  }
}

export class Replay {
  constructor(public url: string, public timestamp: Date) {}
}
