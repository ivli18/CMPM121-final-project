// src/main.ts
import { GLContext } from "./gl/GLContext";
import { Engine } from "./core/Engine";

function bootstrap() {
  const canvas = document.getElementById("game") as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error("Canvas element with id 'game' not found");
  }

  const glctx = new GLContext(canvas);

  const engine = new Engine((dt: number) => {
    // For now: just clear. We'll add scene update & render later.
    glctx.clear();

    // console.log(dt); // you can log dt to see the loop working
  });

  engine.start();
}

bootstrap();
