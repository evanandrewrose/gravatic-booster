import { BroodWarApiPath, IBroodWarConnection } from "bw-web-api";

/**
 * A connection to the Brood War API that is password protected.
 */
export class PasswordProtectedConnection implements IBroodWarConnection {
  constructor(
    private url: string,
    private user: string,
    private password: string
  ) {}

  async fetch(path: BroodWarApiPath): Promise<string> {
    const result = await fetch(`${this.url}/${path}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${this.user}:${this.password}`),
      },
    });

    return result.text();
  }
}
