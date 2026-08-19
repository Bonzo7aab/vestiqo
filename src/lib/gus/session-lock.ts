/**
 * GUS BIR allows only one SOAP session per API key.
 * Registration looks up two NIPs and then KRS enrichment hits BIR again,
 * so concurrent logins fail with a stuck "try again later" error.
 */
let gusQueue: Promise<unknown> = Promise.resolve();

export async function withGusSession<T>(fn: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const previous = gusQueue;
  gusQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}
