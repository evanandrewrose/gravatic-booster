export class PlayerSearchResult {
  constructor(
    public avatar: string,
    public battletag: string,
    public gatewayId: number,
    public lastRank: number,
    public name: string,
    public points: number,
    public rank: number
  ) {}
}
