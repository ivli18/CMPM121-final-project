// src/core/SceneManager.ts

export interface IScene {
  // Called when the scene becomes active
  onEnter(): void | Promise<void>;

  // Called when the scene is being replaced
  onExit(): void;

  // Called every frame with dt in seconds
  update(dt: number): void;

  // Called every frame after update
  render(): void;
}

export class SceneManager {
  private current: IScene | null = null;
  private pending: IScene | null = null;
  private isSwitching = false;

  async changeScene(next: IScene): Promise<void> {
    // prevent re-entrant switches
    if (this.isSwitching) return;
    this.isSwitching = true;

    this.pending = next;

    if (this.current) {
      this.current.onExit();
    }

    this.current = this.pending;
    this.pending = null;

    if (this.current) {
      await this.current.onEnter();
    }

    this.isSwitching = false;
  }

  update(dt: number): void {
    if (this.isSwitching) return;
    this.current?.update(dt);
  }

  render(): void {
    if (this.isSwitching) return;
    this.current?.render();
  }

  getCurrentScene(): IScene | null {
    return this.current;
  }
}
