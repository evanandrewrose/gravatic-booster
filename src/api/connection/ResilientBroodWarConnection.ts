import { RetryableInternalServerError } from "@/errors";
import { BroodWarApiPath, IBroodWarConnection } from "bw-web-api";
import { Retryable } from "typescript-retry-decorator";

/**
 * Logic for retrying requests to the Brood War API.
 */
export class ResilientBroodWarConnection implements IBroodWarConnection {
  constructor(private decoratedConnection: IBroodWarConnection) {}

  @Retryable({
    maxAttempts: 3,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: [RetryableInternalServerError as any],
  })
  async fetch(path: BroodWarApiPath): Promise<string> {
    const text = await this.decoratedConnection.fetch(path);

    const textLower = text.toLowerCase();

    // the api sometimes returns 400 status but with some error text, below are the known
    // cases of retriable 400, but bad response scenarios...
    if (
      textLower.startsWith("internal error") ||
      textLower.startsWith("internal server error")
    ) {
      // this happens randomly, but retries often work
      throw new RetryableInternalServerError("Internal server error");
    }

    return text;
  }
}
