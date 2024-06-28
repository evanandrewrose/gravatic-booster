type hostname = string;

/**
 * Provides the hostname of the SC Remastered API
 */
export interface ClientProvider {
  provide(): Promise<hostname>;
}

/**
 * Provides the given hostname as the hostname of the StarCraft client. Useful for
 * either testing or if you know the hostname/port of the web server already.
 *
 * @returns the given hostname
 */
export class StaticHostnameClientProvider implements ClientProvider {
  constructor(private hostname: hostname) {}

  provide(): Promise<hostname> {
    return Promise.resolve(this.hostname);
  }
}
