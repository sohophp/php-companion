/** Coalesce filesystem changes by identity without losing edits arriving during a drain. */
export class PendingChanges<T> {
  private readonly entries = new Map<string, T>();
  private running: Promise<void> | undefined;
  get size(): number { return this.entries.size; }
  set(identity: string, value: T): void { this.entries.set(identity, value); }
  drain(apply: (identity: string, value: T) => Promise<void>): Promise<void> {
    if (this.running) return this.running;
    const run = async (): Promise<void> => {
      while (this.entries.size) {
        const [identity, value] = this.entries.entries().next().value!;
        this.entries.delete(identity);
        try { await apply(identity, value); }
        catch (error) { if (!this.entries.has(identity)) this.entries.set(identity, value); throw error; }
      }
    };
    const promise = run(); this.running = promise;
    void promise.then(() => { this.running = undefined; }, () => { this.running = undefined; });
    return promise;
  }
}
