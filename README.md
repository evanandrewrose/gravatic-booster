# Gravatic Booster 🛸

This package is an unofficial wrapper for the brood war API. It provides a caching layer, a simple API, types, and helper methods to connect the various APIs. It converts paginated APIs (leaderboards and match histories) to [asynchronous generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator) for efficient and responsive computation during iteration. It also consolidates redundant and complex nested structures.

It depends on [bw-web-api](https://github.com/evanandrewrose/bw-web-api) which is a simple type wrapper for the same API.

Read [the API docs for this library here](https://evanandrewrose.github.io/gravatic-booster/classes/GravaticBooster.html).

Also, see the [verbiage](#verbiage) and [notes](#notes) sections as they provide context for the APIs presented.

# Installation

```
npm i --save gravatic-booster
```

# Verbiage

- **Account**: A battle.net account, which can have many profiles
- **Profile**: An in-game profile with its own win/loss record, match history, etc
- **Toon**: An in-game id (the id you see in chat channels, in-game, etc.)
- **Bucket**: A term used by the API, corresponds to rank (s, a, b, etc) in the SCR API

# Notes

- You cannot query by account information (e.g., battlenet id), only by profile information (in-game name and gateway). However, querying by profile does return account information, along with profile-specific data.
- There are some places where we make the assumption that ladder matches are always 1v1, but it's clear that the original API is future-proofed for 2v2 integration.
- There are three ways to see game history through the battle.net API. They have different structures and different usecases. They've been mapped to the following `GravaticBooster` APIs:
  1. `GravaticBooster::fullAccount::recent25Games`
     -- last 25 games the user played, including ums and everything else
  1. `GravaticBooster::fullAccount::recent25CompetitiveGames`
     -- recent 25 games with other humans that aren't ums, roughly your "competitive" history, includes ladder as well
  1. `GravaticBooster::matchHistory`
     -- ladder history since the user's profile was created, paginated and accesible by season
- Complexity is mostly in the `transformers` directory
- Uses [tslog](https://tslog.js.org/) for logging.
- Uses [lru-cache](https://www.npmjs.com/package/lru-cache) for caching.

# Usage Examples

## Displaying A Player's Match History For The Current Season:

```typescript
const gb = await GravaticBooster.create();

const matches = gb.matchHistory("bob", {
  region: "usw",
});

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
```

Output:

```
[5/18/2023, 12:44:33 PM] (as zerg) win  (+9 ) vs alice (zerg)
[5/18/2023, 12:24:03 PM] (as terran) win  (+22) vs eve (zerg)
[5/18/2023, 12:17:23 PM] (as terran) win  (+2 ) vs mallory (protoss)
[5/18/2023, 12:15:28 PM] (as zerg) win  (+13) vs trent (terran)
```

## Determine How Many Players Are Online For Each Gateway

```typescript
const gb = await GravaticBooster.create();

const gateways = gb.gateways();

for (const gateway of gateways) {
  const users = await gateway.onlineUsers;
  console.log(`${gateway.name} (${gateway.id}): ${users}`);
}
```

Output:

```
U.S. West (10): 769
U.S. East (11): 68
Europe (20): 313
Korea (30): 15912
Asia (45): 510
```

## Get Replay URLs For The #1 Ranked Player

```typescript
const gb = await GravaticBooster.create();

const playerRanking = await gb.ranking(0);
const playerAccount = await playerRanking?.minimalAccount();

const ladderGames = await playerAccount?.requestedProfile?.ladderGames();

if (ladderGames) {
  for await (const game of ladderGames) {
    const replay = (await game.replays).lastReplayUploaded;
    console.log(replay?.url);
  }
}
```

## Logging

Configure the library's log level with:

```typescript
const logLevel = "debug"; // "silly", "trace", "debug", "info", "warn", "error", "fatal", "off"
GravaticBoosterLogger.setLevel(logLevel);
```

See: https://tslog.js.org/

## Caching

The default cache configuration can be found at `src/api/SCApiWithCaching.ts`. It should provide reasonable defaults. If you want to customize it,
you can pass a different api parameter to `GravaticBooster`. For example, if you want to disable caching for the `matchHistory` endpoint:

```typescript
const gb = await GravaticBooster.create(
  new SCApiWithCaching(
    new SCApi(
      new ResilientBroodWarConnection(
        new ContextualWindowsOrWSLClientProvider().provide()
      )
    ),
    {
      ...defaultCacheConfig,
      matchHistory: null,
    }
  )
);
```

## Usage With WSL

If you're working on WSL, you probably want to be able to access the StarCraft web api from your Linux distribution. The StarCraft
web API binds to loopback, so you have to proxy the port and bind to 0.0.0.0. Here's a powershell one-liner that will do it for you (and binds to 57421):

(as administrator)

```powershell
$port = (Get-NetTCPConnection -OwningProcess (Get-Process -Name StarCraft | Select-Object -ExpandProperty Id) | Where-Object {$\_.State -eq "Listen"} | Sort-Object -Property LocalPort | Select-Object -First 1).LocalPort; if (netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=57421 connectaddress=127.0.0.1 connectport=$port 2>&1) { Write-Error "Failed to add port proxy rule." } else { Write-Host "StarCraft port has been proxied from localhost:$port to 0.0.0.0:57421." }
```

You may also have to allow inbound connections from WSL to Windows:

```powershell
New-NetFirewallRule -DisplayName "WSL" -Direction Inbound -InterfaceAlias "vEthernet (WSL)" -Action Allow
```

This library provides a {@link WSLHostnameClientProvider} that can be passed to {@link GravaticBooster} during construction, which will use /etc/resolv.conf in combination
with the port provided (or 57421 otherwise) to find your Windows SCR web server instance.

```typescript
const gb = await GravaticBooster.create(
  new SCApiWithCaching(
    new SCApi(
      new ResilientBroodWarConnection(
        new WSLHostnameClientProvider(
          57421 /* or whatever port you prefer */
        ).provide()
      )
    )
  )
);
```

Alternatively, if you want your code to work on Windows as well as WSL:

```typescript
const gb = await GravaticBooster.create(
  new SCApiWithCaching(
    new SCApi(
      new ResilientBroodWarConnection(
        new ContextualWindowsOrWSLClientProvider(
          57421 /* or whatever port you prefer */
        ).provide()
      )
    )
  )
);

// note: this is the default, so you can omit provider unless you're changing the port
const gb = await GravaticBooster.create(provider);
```

# CLI Tool

This package includes a CLI tool for exploring the ladder. It's not distributed with the library, but runnable if you have this repo locally.

## Running the CLI

The CLI tool can only be run if you have this repository's sources downloaded. It's not distributed with the library itself.

```sh
npm run cli -- --help
```

Outputs:

```
Usage: gravatic-booster [options] [command]

Options:
  -V, --version                     output the version number
  -l, --log-level <level>           set log level (choices: "silly", "trace", "debug", "info", "warn", "error", "fatal", "off")
  -h, --help                        display help for command

Commands:
  player-stats <toon> <gateway>     fetch a player's stats
  dump-replays <toon> <gateway>     collect replays for a given player to a local directory
  player-rankings <toon> <gateway>  display rankings for a given gateway
  player-profiles <toon> <gateway>  display a player's profiles
  account-info <toon> <gateway>     display account info
  replays-for-rank-1                print urls for the rank 1 player's profile
  match-history <toon> <gateway>    display match history for a player
  exercise                          go through a leaderboard, find some profiles, display replay urls from their match history
  online-users                      display online user counts per region
  rankings                          display global rankings
  help [command]                    display help for command
```
