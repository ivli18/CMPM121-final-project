// Delta Time. Fixed-step time management for game loops.

export class Time {
  static deltaTime = 0;      // seconds since last frame
  static elapsedTime = 0;    // total seconds since engine start
  static timeScale = 1;      // for slow-mo, pauses, etc.

  static update(rawDt: number): void {
    const scaled = rawDt * this.timeScale;
    this.deltaTime = scaled;
    this.elapsedTime += scaled;
  }
}