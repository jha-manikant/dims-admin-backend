/**
 * Base class for all application-thrown errors. Subclass instead of throwing
 * raw Error so the global error middleware can map them to the standard
 * response shape:  { success: false, message, code }.
 *
 * Best-practices rules #8 (global error handling), #9 (custom error classes),
 * #10 (never expose internal errors).
 */
export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  /**
   * `true` for expected business errors (validation, forbidden, etc).
   * `false` for unexpected programmer errors (which should produce a generic
   * 500 in production and surface only the requestId to the client).
   */
  public readonly isOperational: boolean;

  protected constructor(opts: {
    statusCode: number;
    code: string;
    message: string;
    details?: Record<string, unknown>;
    isOperational?: boolean;
  }) {
    super(opts.message);
    this.name = new.target.name;
    this.statusCode = opts.statusCode;
    this.code = opts.code;
    if (opts.details !== undefined) {
      this.details = opts.details;
    }
    this.isOperational = opts.isOperational ?? true;
    Error.captureStackTrace(this, new.target);
  }
}
