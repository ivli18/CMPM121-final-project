// Game Loop: manages the update and render cycles.

export class Engine {
    private lastTime = 0;
    private running = false;

    // tick: function to call each frame with delta time
    constructor(private tick: (deltaTime: number) => void) {}

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.frame);
    }

    stop() {
        this.running = false;
    }

    private frame = (time: number) => {
        if (!this.running) return;
        // ms to seconds
        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;
        
        // clamp deltaTime to avoid large jumps if the tab is backgrounded
        const safeDeltaTime = Math.min(deltaTime, 0.1); // max 100ms

        this.tick(safeDeltaTime);

        requestAnimationFrame(this.frame);
    }

}