#!/usr/bin/env ts-node
import {
  createDirectoryUnlessExists,
  downloadIntoDirectory,
  fileExists,
  formatReplayName,
} from "@/lib/util";
import { GravaticBooster } from "@/main";
import { GatewayId, GlobalGatewayId } from "@/models/gateway";
import { GravaticBoosterLogger, LogLevels } from "@/utils/logger";
import progress from "cli-progress";
import { Option, program } from "commander";
import path from "path";

const exercise = async (gb: GravaticBooster) => {
  const leaderboard = await gb.leaderboard({
    gameMode: "1v1",
    gateway: GlobalGatewayId,
  });

  if (!leaderboard) {
    console.error("Could not find global leaderboard");
    return;
  }

  const rankings = leaderboard.rankings(0, 5000);

  for await (const ranking of rankings) {
    console.log(
      `${ranking.toon} on gateway ${ranking.gatewayId} is ranked ${ranking.rank}`
    );

    const account = await ranking.fullAccount();

    console.log(
      `${ranking.toon} had the following ids: ${account?.profiles
        .map((p) => p.toon)
        .join(", ")}`
    );

    const profiles = account?.profiles;

    if (profiles) {
      for (const profile of profiles) {
        const games = await profile.ladderGames("1v1", "current", 10);

        for await (const game of games) {
          const replay = (await game.replays).lastReplayUploaded;
          console.log(`${game.id}: ${replay?.url}`);
        }
      }
    }
  }
};

const replaysForHighestRankingPlayer = async (gb: GravaticBooster) => {
  const playerRanking = await gb.ranking(0);
  const playerAccount = await playerRanking?.minimalAccount();

  const ladderGames = await playerAccount?.requestedProfile?.ladderGames();

  if (ladderGames) {
    for await (const game of ladderGames) {
      const replay = (await game.replays).lastReplayUploaded;
      console.log(replay?.url);
    }
  }
};

const dumpAllReplays = async (
  gb: GravaticBooster,
  toon: string,
  gateway: GatewayId
) => {
  await createDirectoryUnlessExists(toon);

  const account = await gb.fullAccount(toon, {
    gateway,
  });

  if (!account) {
    console.error(`Could not find account for ${toon} on gateway ${gateway}`);
    return;
  }

  interface ReplayToDownload {
    url: string;
    path: string;
    name: string;
  }

  const replays: ReplayToDownload[] = [];

  console.log(
    `Found ${account.profiles.length} profiles: [${account.profiles
      .map((p) => p.toon)
      .join(", ")}]`
  );

  for (const profile of account.profiles) {
    console.log(
      `Found profile ${profile.toon} on ${profile.gateway?.name ?? "??"}.`
    );

    for (const leaderboard of await oneVOneLeaderboards(gb)) {
      const matchHistory = await profile.ladderGames(
        "1v1",
        leaderboard.seasonId
      );

      const toonRanking = await profile.ranking(leaderboard.id);

      if (!toonRanking) {
        continue; // no ranking for this season
      }

      console.log(
        `Found ${toonRanking.totalGamesPlayed} matches played during season ${
          leaderboard.seasonId
        } for ${profile.toon} on ${
          profile.gateway?.name ?? "??"
        }. Collecting download urls.`
      );

      const progressBar = new progress.SingleBar({});
      progressBar.start(toonRanking.totalGamesPlayed, 0);

      for await (const match of matchHistory) {
        const { timestamp: date } = match;

        const fileName = formatReplayName(date, match);
        const downloadPath = `${toon}/${profile.toon}/Season_${leaderboard.seasonId}`;

        if (!(await fileExists(path.join(downloadPath, fileName)))) {
          // prevent redownloading if interrupted
          const replay = await match.replays;

          if (replay.lastReplayUploaded) {
            replays.push({
              url: replay.lastReplayUploaded.url,
              path: downloadPath,
              name: fileName,
            });
          }
        }

        progressBar.increment();
      }

      progressBar.stop();
    }
  }

  const progressBar = new progress.SingleBar({});
  progressBar.start(replays.length, 0);

  for (const replay of replays) {
    createDirectoryUnlessExists(replay.path);
    await downloadIntoDirectory(replay.url, replay.path, replay.name);
    progressBar.increment();
  }

  progressBar.stop();
};

const displayPlayerStats = async (
  gb: GravaticBooster,
  toon: string,
  gateway: GatewayId
) => {
  const stats = (
    await gb.mapStatsByToon(toon, {
      gateway,
    })
  ).get("1v1");

  if (!stats) {
    console.log("No stats found");
    return;
  }

  const currentSeasonStatsByMap = stats.get(await gb.currentSeason());

  if (!currentSeasonStatsByMap) {
    console.log("No stats found for current season");
    return;
  }

  for (const statsByRace of currentSeasonStatsByMap.values()) {
    for (const [race, stats] of statsByRace) {
      const { games, globalGames, wins, globalWins } = stats;

      if (!games) {
        continue;
      }

      const map = await stats.map;

      console.log(`${map?.displayName} / ${map?.fileName} as ${race}`);
      console.table({
        winRatio: `${((wins / games) * 100).toFixed(2)}%`,
        globalWinRatio: `${((globalWins / globalGames) * 100).toFixed(2)}%`,
        games,
        wins,
        globalGames,
        globalWins,
      });
    }
  }
};

const displayOnlineUsers = async (gb: GravaticBooster) => {
  const gateways = gb.gateways();

  for (const gateway of gateways) {
    const users = await gateway.onlineUsers;

    console.log(`${gateway.name} (${gateway.id}): ${users}`);
  }
};

const oneVOneLeaderboards = async (gb: GravaticBooster) => {
  const leaderboards = await gb.leaderboards();

  const oneVOneGlobalLeaderboards = leaderboards.filter(
    (leaderboard) =>
      leaderboard.gameMode === "1v1" && leaderboard.gateway.id === 0
  );

  return oneVOneGlobalLeaderboards.sort((a, b) => b.seasonId - a.seasonId);
};

const displayAccountInfo = async (
  gb: GravaticBooster,
  toon: string,
  gateway: GatewayId
) => {
  const account = await gb.fullAccount(toon, {
    gateway,
  });

  if (!account) {
    console.log(`Could not find account for ${toon} on gateway ${gateway}`);
    return;
  }

  const {
    battleTag,
    auroraId,
    countryCode,
    flags,
    recent25CompetitiveGames,
    recent25Games,
  } = account;

  console.table({
    battleTag,
    auroraId,
    countryCode,
    flags: flags.join(", "),
  });

  console.log("Recent 25 competitive games:");

  for (const game of recent25CompetitiveGames) {
    const { gameId, players } = game;

    console.log(`Game ${gameId}`);

    console.log("Players:");

    for (const player of players) {
      const { toon, type, result, team } = player;

      console.log(`  ${toon} (${type}) - ${result} (team ${team})`);
    }
  }

  for (const game of recent25Games) {
    const { gameName, gameType, players, result } = game;

    console.log(`Game ${gameName} (${gameType}) - ${result}`);

    console.log("Players:");

    for (const player of players) {
      const { name, race, type } = player;

      console.log(`  ${name} (${race}, ${type})`);
    }
  }

  console.log("Profiles:");

  for (const profile of account.profiles) {
    const { toon, numGamesLastWeek, ladderProfileData } = profile;

    if (ladderProfileData !== "PlayerIsUnranked") {
      const { avatar } = ladderProfileData;

      console.table({
        toon,
        numGamesLastWeek,
        avatar: avatar.url,
      });
    } else {
      console.table({
        toon,
        numGamesLastWeek,
      });
    }
  }
};

const displayPlayerProfiles = async (
  gb: GravaticBooster,
  toon: string,
  gateway: GatewayId
) => {
  const account = await gb.fullAccount(toon, {
    gateway,
  });

  if (!account) {
    console.log(`Could not find account for ${toon} on gateway ${gateway}`);
    return;
  }

  console.log(`Found ${account.profiles.length} profiles for ${toon}.\n`);

  for (const profile of account?.profiles ?? []) {
    console.log(
      `\t${profile.toon} on ${profile.gateway?.name ?? "??"} (${
        profile.gateway?.id ?? "??"
      })`
    );
  }
};

const displayPlayerRankings = async (
  gb: GravaticBooster,
  toon: string,
  gateway: GatewayId
) => {
  const leaderboard = await gb.leaderboard({
    gameMode: "1v1",
    gateway: GlobalGatewayId,
  });

  if (leaderboard === null) {
    console.error(
      `Could not find leaderboard for ${toon} on gateway ${gateway}`
    );
    return;
  }

  const accountRankings = await gb.accountRankingsByToon(
    toon,
    {
      gateway,
    },
    {
      leaderboardId: leaderboard.id,
    }
  );

  if (accountRankings === null) {
    console.error(`Could not find account for ${toon} on gateway ${gateway}`);
    return;
  }

  const { auroraId, leaderboardId, rankings } = accountRankings;

  console.log({
    auroraId,
    leaderboardId,
  });

  for (const ranking of rankings) {
    const { toon, tier, rating, featureRace, wins, losses, gateway } = ranking;

    console.table({
      toon,
      tier,
      rating,
      featureRace,
      wins,
      losses,
      gateway: gateway.name,
    });
  }
};

const displayRankings = async (gb: GravaticBooster) => {
  const leaderboard = await gb.leaderboard({
    gameMode: "1v1",
    gateway: GlobalGatewayId,
  });

  if (leaderboard === null) {
    throw new Error("Could not find global 1v1 leaderboard");
  }

  const rankings = gb.rankings({
    leaderboardId: leaderboard.id,
  });

  console.log("toon,tier,rating,featureRace,wins,losses,gateway");

  for await (const ranking of rankings) {
    const { toon, tier, rating, featureRace, wins, losses, gateway } = ranking;

    console.log(
      `${toon},${tier},${rating},${featureRace},${wins},${losses},${gateway.name}`
    );
  }
};

const matchHistory = async (
  gb: GravaticBooster,
  toon: string,
  gatweayId: GatewayId
) => {
  const matches = gb.matchHistory(
    toon,
    {
      gateway: gatweayId,
    },
    {} // default leaderboard, global 1v1 for the current season
  );

  for await (const match of matches) {
    const { timestamp, opponent, thisPlayer } = match;
    const points = thisPlayer?.profileInfo?.points?.delta;
    const pointsFormatted = points && points > 0 ? `+${points}` : `${points}`;

    console.log(
      `[${timestamp.toLocaleString()}] (as ${thisPlayer?.race.padEnd(
        7,
        " "
      )}) ${thisPlayer?.result.padEnd(4, " ")} (${pointsFormatted.padEnd(
        3,
        " "
      )}) vs ${opponent?.toon} (${opponent?.race})`
    );
  }
};

const main = async () => {
  program.name("gravatic-booster").version("0.0.1");

  const gb = new GravaticBooster();

  program.addOption(
    new Option("-l, --log-level <level>", "set log level").choices(LogLevels)
  );

  program.hook("preSubcommand", () => {
    const logLevel = program.optsWithGlobals().logLevel;
    GravaticBoosterLogger.setLevel(logLevel);
  });

  program
    .command("player-stats")
    .description("fetch a player's stats")
    .argument("<toon>", "Player toon")
    .argument("<gateway>", "Gateway id")
    .action(async (toon, gateway) => {
      await displayPlayerStats(gb, toon, parseInt(gateway) as GatewayId);
    });

  program
    .command("dump-replays")
    .description("collect replays for a given player to a local directory")
    .argument("<toon>", "Player toon")
    .argument("<gateway>", "Gateway id")
    .action(async (toon, gateway) => {
      await dumpAllReplays(gb, toon, parseInt(gateway) as GatewayId);
    });

  program
    .command("player-rankings")
    .description("display rankings for a given gateway")
    .argument("<toon>", "Player toon")
    .argument("<gateway>", "Gateway id")
    .action(async (toon, gateway) => {
      await displayPlayerRankings(gb, toon, parseInt(gateway) as GatewayId);
    });

  program
    .command("player-profiles")
    .description("display a player's profiles")
    .argument("<toon>", "Player toon")
    .argument("<gateway>", "Gateway id")
    .action(async (toon, gateway) => {
      await displayPlayerProfiles(gb, toon, parseInt(gateway) as GatewayId);
    });

  program
    .command("account-info")
    .description("display account info")
    .argument("<toon>", "Player toon")
    .argument("<gateway>", "Gateway id")
    .action(async (toon, gateway) => {
      await displayAccountInfo(gb, toon, parseInt(gateway) as GatewayId);
    });

  program
    .command("replays-for-rank-1")
    .description("print urls for the rank 1 player's profile")
    .action(async () => {
      await replaysForHighestRankingPlayer(gb);
    });

  program
    .command("match-history")
    .description("display match history for a player")
    .argument("<toon>", "Player toon")
    .argument("<gateway>", "Gateway id")
    .action(async (toon, gateway) => {
      await matchHistory(gb, toon, parseInt(gateway) as GatewayId);
    });

  program
    .command("exercise")
    .description(
      "go through a leaderboard, find some profiles, display replay urls from their match history"
    )
    .action(async () => {
      await exercise(gb);
    });

  program
    .command("online-users")
    .description("display online user counts per region")
    .action(async () => {
      await displayOnlineUsers(gb);
    });

  program
    .command("rankings")
    .description("display global rankings")
    .action(async () => {
      await displayRankings(gb);
    });

  program.parse();
};

main();
