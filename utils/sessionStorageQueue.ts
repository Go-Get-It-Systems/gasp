const writes = new Map<string, Promise<void>>();

/** A logout removal must finish after any earlier write to the same key. */
export async function writeSessionValue(key: string, write: () => Promise<void>): Promise<void> {
  const pending = (writes.get(key) ?? Promise.resolve()).catch(() => {}).then(write);
  writes.set(key, pending);
  await pending;
}
