export class BaseError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
  }
}

export class InvalidInputError extends BaseError {}
export class UnexpectedAPIResponseError extends BaseError {}
export class EntityNotFoundError extends BaseError {}
export class KnownUnreconcilableEntityError extends BaseError {}
export class RetryableInternalServerError extends BaseError {}
export class StarcraftProcessNotFoundError extends BaseError {}
export class StarcraftAPIPortNotFoundError extends BaseError {}
