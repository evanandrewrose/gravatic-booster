export class Map {
  constructor(
    public candidate: number, // always 0
    public description: string,
    public era: number, // no idea what this is
    public height: number, // in-game units
    public width: number, // in-game units
    public path: string, // always "/"
    public version: number,
    public replayHumans: number, // always matches max players
    public replayMaxPlayers: number, // number of spawn locations
    public replayMinPlayers: number, // always 1
    public replayOpponents: number, // always 0
    public seasonId: number, // season in which this map is played
    public contentSize: number, // map file size in bytes
    public contentType: string, // application/x.scm or application/x.scx
    public md5: string, // md5 of map file
    public modified_epoch: Date, // last modified date
    public fileName: string,
    public displayName: string,
    public url: string // blizzard's download link
  ) {}
}
