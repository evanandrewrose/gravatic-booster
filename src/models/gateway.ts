import { GravaticBooster } from "@/main";
import { RealGateways as RealGateway, RealRegion } from "@/models/knownValues";

export const GlobalGatewayId = 0;
export const KnownGatewayIds = [10, 11, 20, 30, 45];
export type GatewayId = (typeof KnownGatewayIds)[number];

export class Gateway {
  constructor(
    private gb: GravaticBooster,
    public id: GatewayId,
    public name: RealGateway,
    public region: RealRegion
  ) {}

  get onlineUsers() {
    return this.gb.onlineUsers({
      gateway: this.id,
    });
  }
}

/**
 * Data from /web-api/v1/gateway (minus online users / "isOfficial")
 *
 * Since these values are unchanging, we can just hardcode them here to skip the extra
 * fetch.
 */
export const knownGatewayConfig: Record<
  GatewayId,
  {
    name: RealGateway;
    region: RealRegion;
  }
> = {
  10: {
    name: "U.S. West",
    region: "usw",
  },
  11: {
    name: "U.S. East",
    region: "use",
  },
  20: {
    name: "Europe",
    region: "eu",
  },
  30: {
    name: "Korea",
    region: "kr",
  },
  45: {
    name: "Asia",
    region: "asia",
  },
};
