export const nowUtc = (): Date => new Date();

export const nowEpochSeconds = (): number => Math.floor(Date.now() / 1000);

export const addSeconds = (date: Date, seconds: number): Date =>
  new Date(date.getTime() + seconds * 1000);

/**
 * Promise-based timeout — for `Promise.race` style cancellation.
 * Use `AbortController` for fetch / network calls instead.
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
