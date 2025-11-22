// Keyboard and Mouse & Gamepad Input Handling.

type Key = string; // e.g. "KeyW", "Space", "ArrowLeft"

export class Input {
    private static initialized = false;

    private static keysDown = new Set<Key>();
    private static keysPressed = new Set<Key>();
    private static keysReleased = new Set<Key>();

    static init(target: Window = window): void {
        if (this.initialized) return;
        this.initialized = true;

        target.addEventListener("keydown", (e) => {
            if (!this.keysDown.has(e.code)) {
                this.keysPressed.add(e.code);
            }
            this.keysDown.add(e.code);
        });

        target.addEventListener("keyup", (e) => {
            this.keysDown.delete(e.code);
            this.keysReleased.add(e.code);
        });

        // can expand with mouse and gamepad events later  
    }
    static update(): void{
        this.keysPressed.clear();
        this.keysReleased.clear();
    }
    static isKeyDown(key: Key): boolean {
        return this.keysDown.has(key);
    }
    static wasKeyPressed(key: Key): boolean {
        return this.keysPressed.has(key);
    }
    static wasKeyReleased(key: Key): boolean {
        return this.keysReleased.has(key);
    }
}