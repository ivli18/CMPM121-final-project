// Simple event bus implementation
/* example usage:
  
    Events.on("my-event", (data) => {
    console.log("Event received:", data);
    });

    or 

    // somewhere in gameplay
    Events.emit("player:death", { reason: "lava" });

    // somewhere in UI
    Events.on("player:death", ({ reason }) => {
    console.log("Player died:", reason);
    });
*/

type EventName = string;
type EventHandler<T = unknown> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<EventName, Set<EventHandler>>();

  on<T = unknown>(event: EventName, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);
  }

  off<T = unknown>(event: EventName, handler: EventHandler<T>): void {
    const set = this.handlers.get(event);
    if (!set) return;
    set.delete(handler as EventHandler);
    if (set.size === 0) {
      this.handlers.delete(event);
    }
  }

  emit<T = unknown>(event: EventName, payload: T): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      handler(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

// global/shared bus you can import anywhere
export const Events = new EventBus();
