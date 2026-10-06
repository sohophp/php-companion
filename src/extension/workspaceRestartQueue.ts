/** Serialize folder restarts and fold changes received during stop into the next start. */
export class WorkspaceRestartQueue {
  private revision = 0;
  private running = false;
  private disposed = false;

  constructor(private readonly stop: () => Promise<void>, private readonly start: () => Promise<void>,
    private readonly onError: (error: unknown) => void) {}

  get isRunning(): boolean { return this.running; }

  request(): void {
    if (this.disposed) return;
    this.revision += 1;
    if (!this.running) void this.run();
  }

  dispose(): void { this.disposed = true; }

  private async run(): Promise<void> {
    this.running = true;
    try {
      let startedRevision: number;
      do {
        await this.stop();
        if (this.disposed) return;
        startedRevision = this.revision;
        await this.start();
      } while (!this.disposed && startedRevision !== this.revision);
    } catch (error) { if (!this.disposed) this.onError(error); }
    finally { this.running = false; }
  }
}
