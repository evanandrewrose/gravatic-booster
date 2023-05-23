import {
  StarcraftAPIPortNotFoundError,
  StarcraftProcessNotFoundError,
} from "@/errors";
import { GravaticBoosterLogger } from "@/utils/logger";
import { execSync } from "node:child_process";

type hostname = string;

/**
 * Provides the hostname of the SC Remastered API
 */
export interface ClientProvider {
  provide(): hostname;
}

/**
 * Provides the hostname of the StarCraft client running on the local machine.
 *
 * @returns the hostname of the StarCraft client
 * @throws StarcraftProcessNotFoundError if the StarCraft process is not found
 * @throws StarcraftAPIPortNotFoundError if the StarCraft API port is not found
 */
export class LocalWindowsClientProvider implements ClientProvider {
  provide(): hostname {
    const getProcessCommand =
      "Get-Process -Name StarCraft | Select-Object -ExpandProperty Id";

    let pid;
    try {
      pid = execSync(`powershell.exe -Command "${getProcessCommand}"`)
        .toString()
        .trim();
    } catch (e) {
      throw new StarcraftProcessNotFoundError();
    }

    let port;
    try {
      const getPortCommand = `(Get-NetTCPConnection -OwningProcess ${pid}
         | Where-Object {$_.State -eq 'Listen'}
         | Sort-Object -Property LocalPort
         | Select-Object -First 1
         ).LocalPort`
        .replace(/\s+/g, " ")
        .trim();

      port = execSync(`powershell.exe -Command "${getPortCommand}"`)
        .toString()
        .trim();
    } catch (e) {
      throw new StarcraftAPIPortNotFoundError();
    }

    if (isNaN(parseInt(port))) {
      throw new StarcraftAPIPortNotFoundError(
        `Error parsing returned port value: ${port}`
      );
    }

    const host = `http://127.0.0.1:${port}`;

    GravaticBoosterLogger.instance.info(
      `Using hostname for StarCraft client as ${host}`
    );

    return host;
  }
}

/**
 * Provides the given hostname as the hostname of the StarCraft client. Useful for
 * either testing or if you know the hostname/port of the web server already.
 *
 * @returns the given hostname
 */
export class StaticHostnameClientProvider implements ClientProvider {
  constructor(private hostname: hostname) {}

  provide(): hostname {
    return this.hostname;
  }
}

/**
 * Provides the hostname of the StarCraft client running on Windows with the assumption
 * that the port has been forwarded to a static port and the hostname is the IP of the
 * windows machine (exposed via /etc/resolv.conf). Useful for developing on WSL.
 *
 * 57421 is an arbitrarily chosen default: ~"STAR1"
 *
 * You can forward the port with the following powershell one-liner:
 *
 * $port = (Get-NetTCPConnection -OwningProcess (Get-Process -Name StarCraft | Select-Object -ExpandProperty Id)
 * | Where-Object {$_.State -eq "Listen"} | Sort-Object -Property LocalPort | Select-Object -First 1).LocalPort;
 * if (netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=57421 connectaddress=127.0.0.1 connectport=$port 2>&1)
 * { Write-Error "Failed to add port proxy rule." } else { Write-Host "StarCraft port ($port) has been proxied to 0.0.0.0:57421." }
 *
 * @returns the hostname of the StarCraft client
 */
export class WSLHostnameClientProvider implements ClientProvider {
  constructor(private port: number = 57421) {}

  provide(): hostname {
    // determine windows host ip address
    const stdout = execSync(
      "cat /etc/resolv.conf | grep nameserver | cut -d' ' -f 2"
    )
      .toString()
      .trim();

    if (!stdout.match(/\d+\.\d+\.\d+\.\d+/)) {
      throw new Error(
        `Could not find windows hostname. Error detecting IP: ${stdout}`
      );
    }

    const windowsHost = stdout;

    const host = `http://${windowsHost}:${this.port}`;

    GravaticBoosterLogger.instance.info(
      `Using hostname for StarCraft client as ${host}`
    );

    return host;
  }
}

/**
 * Uses the LocalWindowsClientProvider if the current platform is Windows,
 * otherwise uses the WSLHostnameClientProvider with the given port.
 *
 * Useful for generally supporting the default "just get the starcraft process"
 * behavior on Windows, but also allowing the user to specify a custom port
 * for other platforms (e.g., wsl development).
 */
export class ContextualWindowsOrWSLClientProvider implements ClientProvider {
  private delegate: ClientProvider;

  constructor(port = 57421) {
    if (process.platform === "win32") {
      this.delegate = new LocalWindowsClientProvider();
    } else {
      this.delegate = new WSLHostnameClientProvider(port);
    }
  }

  provide(): hostname {
    return this.delegate.provide();
  }
}
