export class GameLoop {
  private accumulator = 0;
  private readonly FIXED_DT = 1 / 60;
  private lastTime = 0;
  private running = false;
  private rafId = 0;

  constructor(
    private fixedUpdate: (dt: number) => void,
    private render: (alpha: number) => void
  ) {}

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop.bind(this));
  }

  private loop(timestamp: number): void {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this.accumulator += dt;
    while (this.accumulator >= this.FIXED_DT) {
      this.fixedUpdate(this.FIXED_DT);
      this.accumulator -= this.FIXED_DT;
    }
    this.render(this.accumulator / this.FIXED_DT);
    this.rafId = requestAnimationFrame(this.loop.bind(this));
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
