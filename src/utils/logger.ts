import { Logger } from "tslog";

export const LogLevels = [
  "silly",
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "off",
];

export type LogLevel = (typeof LogLevels)[number];

export class GravaticBoosterLogger {
  private static logger = new Logger({
    name: "GravaticBooster",
    type: "pretty",
    stylePrettyLogs: true,
    minLevel: 7, // off by default
  });

  static get instance() {
    return GravaticBoosterLogger.logger;
  }

  static setLevel(level: LogLevel) {
    switch (level) {
      case "silly":
        return (GravaticBoosterLogger.instance.settings.minLevel = 0);
      case "trace":
        return (GravaticBoosterLogger.instance.settings.minLevel = 1);
      case "debug":
        return (GravaticBoosterLogger.instance.settings.minLevel = 2);
      case "info":
        return (GravaticBoosterLogger.instance.settings.minLevel = 3);
      case "warn":
        return (GravaticBoosterLogger.instance.settings.minLevel = 4);
      case "error":
        return (GravaticBoosterLogger.instance.settings.minLevel = 5);
      case "fatal":
        return (GravaticBoosterLogger.instance.settings.minLevel = 6);
      default:
        return (GravaticBoosterLogger.instance.settings.minLevel = 7);
    }
  }
}
